/**
 * Build 029 — Etapa 1: store local dos mapeamentos Seção de POP → Etapa de Processo.
 *
 * Mesmo padrão de pop-store.ts / process-store.ts: persistência temporária em
 * localStorage com useSyncExternalStore até o backend definitivo chegar.
 * Store adicional — nenhuma funcionalidade existente é substituída.
 *
 * Invariantes aplicados:
 *  I1 — o mapeamento só existe para o Processo já vinculado ao POP
 *       (`PopDoc.processId === processId`).
 *  I2 — `processStepId` precisa pertencer aos `steps` desse Processo.
 *       `ProcessStep` não carrega `processId`: a checagem é feita pela lista
 *       da ProcessVersion explicitamente selecionada (definition.steps).
 *  I3/I4 — confirmação é sempre humana; `source` nunca é reescrito.
 *  I5 — rejeitar não apaga: só muda o status.
 *  I6 — mapeamento manual nasce `confirmado`.
 *  I7 — sem duplicidade (ver comentários em cada mutador).
 *  I10 — remoção de etapa não é tratada aqui; `isMappingConsistent` apenas
 *        permite à UI sinalizar mapeamentos órfãos, sem apagar nada.
 */

import { useSyncExternalStore } from "react";
import { getPopDoc } from "@/lib/pop-store";
import { getProcessDoc, getProcessDocs, getProcessVersion } from "@/lib/process-store";
import type {
  CreateManualMappingInput,
  PopProcessStepMapping,
  PopProcessStepMappingResult,
  RecordAiSuggestionInput,
} from "@/config/pop-process-step-mapping-model";

const STORAGE_KEY = "process-platform:pop-process-step-mapping:v1";

type StoreState = Record<string, PopProcessStepMapping>;

let state: StoreState = {};
let hydrated = false;
let snapshotCache: PopProcessStepMapping[] | null = null;
const listeners = new Set<() => void>();

function ensureHydrated() {
  if (hydrated || typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    state = raw ? (JSON.parse(raw) as StoreState) : {};
  } catch {
    state = {};
  }
  hydrated = true;
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* armazenamento indisponível — a sessão segue em memória */
  }
}

function emit() {
  snapshotCache = null;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  ensureHydrated();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): PopProcessStepMapping[] {
  ensureHydrated();
  if (!snapshotCache) {
    snapshotCache = Object.values(state).sort((a, b) =>
      (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
    );
  }
  return snapshotCache;
}

const serverSnapshot: PopProcessStepMapping[] = [];
function getServerSnapshot() {
  return serverSnapshot;
}

function useMappings(): PopProcessStepMapping[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/* ------------------------------------------------------------------ */
/* Leitura                                                             */
/* ------------------------------------------------------------------ */

export function usePopProcessStepMappings(popId: string): PopProcessStepMapping[] {
  return useMappings().filter((m) => m.popId === popId);
}

/** Visão inversa (a partir do Processo). */
export function useProcessStepMappings(processId: string): PopProcessStepMapping[] {
  return useMappings().filter((m) => m.processId === processId);
}

/** Leitura pura, fora de React. */
export function getMapping(mappingId: string): PopProcessStepMapping | undefined {
  ensureHydrated();
  return state[mappingId];
}

export function getPopProcessStepMappings(popId: string): PopProcessStepMapping[] {
  ensureHydrated();
  return Object.values(state).filter((m) => m.popId === popId);
}

/**
 * I10 — o mapeamento aponta para uma etapa que ainda existe no Processo?
 * Somente leitura: nunca apaga nem corrige nada automaticamente.
 */
export function isMappingConsistent(mapping: PopProcessStepMapping, processVersionId: string): boolean {
  const process = getProcessDoc(mapping.processId);
  if (!process) return false;
  return getProcessVersion(process, processVersionId)?.definition.steps.some((s) => s.id === mapping.processStepId) ?? false;
}

/* ------------------------------------------------------------------ */
/* Validações compartilhadas                                           */
/* ------------------------------------------------------------------ */

type ValidationFailure = Extract<PopProcessStepMappingResult, { ok: false }>;

/** Valida I1 (POP existe e está vinculado ao Processo) e I2 (etapa pertence ao Processo). */
function validateTarget(
  popId: string,
  processId: string,
  processStepId: string,
  processVersionId: string,
): ValidationFailure | undefined {
  const pop = getPopDoc(popId);
  if (!pop) return { ok: false, reason: "pop-inexistente" };
  if (pop.processId !== processId) return { ok: false, reason: "processo-nao-vinculado" };

  const process = getProcessDoc(processId);
  if (!process) return { ok: false, reason: "processo-inexistente" };

  const version = getProcessVersion(process, processVersionId);
  if (!version) return { ok: false, reason: "versao-inexistente" };
  if (!version.definition.steps.some((s) => s.id === processStepId)) {
    // Distingue "não existe em lugar nenhum" de "existe, mas em outro Processo".
    const belongsElsewhere = existsInAnotherProcess(processId, processStepId);
    return { ok: false, reason: belongsElsewhere ? "step-de-outro-processo" : "step-inexistente" };
  }
  return undefined;
}

function existsInAnotherProcess(processId: string, processStepId: string): boolean {
  // Leitura pura via process-store: a chave de localStorage daquele domínio
  // não é conhecida aqui.
  return getProcessDocs().some(
    (p) => p.id !== processId && p.versions.some(v => v.definition.steps.some((s) => s.id === processStepId)),
  );
}

function rid() {
  return `map_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function commit(mapping: PopProcessStepMapping): PopProcessStepMappingResult {
  state = { ...state, [mapping.id]: mapping };
  persist();
  emit();
  return { ok: true, mapping };
}

/* ------------------------------------------------------------------ */
/* Escrita                                                             */
/* ------------------------------------------------------------------ */

/**
 * Registra uma sugestão da IA. SEMPRE `status:"sugerido"` e `source:"ia"`.
 * Nunca confirma nada por conta própria (I3/I4).
 */
export function recordAiSuggestion(input: RecordAiSuggestionInput): PopProcessStepMappingResult {
  ensureHydrated();
  const invalid = validateTarget(input.popId, input.processId, input.processStepId, input.processVersionId);
  if (invalid) return invalid;

  // I7 estendido: não duplica sugestão idêntica ainda pendente ou já confirmada.
  // Se a única igual foi rejeitada, uma nova sugestão é legítima (reprocessamento).
  const duplicated = Object.values(state).some(
    (m) =>
      m.popId === input.popId &&
      m.popSectionId === input.popSectionId &&
      m.processId === input.processId &&
      m.processStepId === input.processStepId &&
      m.status !== "rejeitado",
  );
  if (duplicated) return { ok: false, reason: "duplicado" };

  const now = new Date().toISOString();
  return commit({
    id: rid(),
    popId: input.popId,
    popSectionId: input.popSectionId,
    processId: input.processId,
    processStepId: input.processStepId,
    status: "sugerido",
    source: "ia",
    confidence: input.confidence,
    rationale: input.rationale,
    createdAt: now,
    updatedAt: now,
  });
}

/** Confirmação humana: `sugerido` → `confirmado`. `source` é preservado (I3/I4). */
export function confirmMapping(mappingId: string, processVersionId: string): PopProcessStepMappingResult {
  ensureHydrated();
  const current = state[mappingId];
  if (!current) return { ok: false, reason: "mapping-inexistente" };
  if (current.status !== "sugerido") return { ok: false, reason: "status-invalido" };
  const invalid = validateTarget(current.popId, current.processId, current.processStepId, processVersionId);
  if (invalid) return invalid;
  return commit({ ...current, status: "confirmado", confirmedAgainstProcessVersionId: processVersionId, updatedAt: new Date().toISOString() });
}

/**
 * Rejeição de sugestão: `sugerido` → `rejeitado` (I5).
 * NÃO exclui o registro — para excluir uma relação confirmada use `removeMapping`.
 */
export function rejectMapping(mappingId: string): PopProcessStepMappingResult {
  ensureHydrated();
  const current = state[mappingId];
  if (!current) return { ok: false, reason: "mapping-inexistente" };
  if (current.status !== "sugerido") return { ok: false, reason: "status-invalido" };
  return commit({ ...current, status: "rejeitado", updatedAt: new Date().toISOString() });
}

/**
 * Troca o alvo antes da confirmação (somente em `sugerido`).
 * Revalida I1/I2 e preserva `source`, `confidence` e `rationale` originais.
 */
export function updateMappingTarget(
  mappingId: string,
  newProcessStepId: string,
  processVersionId: string,
): PopProcessStepMappingResult {
  ensureHydrated();
  const current = state[mappingId];
  if (!current) return { ok: false, reason: "mapping-inexistente" };
  if (current.status !== "sugerido") return { ok: false, reason: "status-invalido" };

  const invalid = validateTarget(current.popId, current.processId, newProcessStepId, processVersionId);
  if (invalid) return invalid;

  const duplicated = Object.values(state).some(
    (m) =>
      m.id !== current.id &&
      m.popId === current.popId &&
      m.popSectionId === current.popSectionId &&
      m.processId === current.processId &&
      m.processStepId === newProcessStepId &&
      m.status !== "rejeitado",
  );
  if (duplicated) return { ok: false, reason: "duplicado" };

  return commit({
    ...current,
    processStepId: newProcessStepId,
    updatedAt: new Date().toISOString(),
  });
}

/** Mapeamento manual: nasce `source:"manual"` e `status:"confirmado"` (I6). */
export function createManualMapping(input: CreateManualMappingInput): PopProcessStepMappingResult {
  ensureHydrated();
  const invalid = validateTarget(input.popId, input.processId, input.processStepId, input.processVersionId);
  if (invalid) return invalid;

  // I7 (texto exato): duplicidade verificada contra mapeamentos `confirmado`.
  const duplicated = Object.values(state).some(
    (m) =>
      m.popId === input.popId &&
      m.popSectionId === input.popSectionId &&
      m.processId === input.processId &&
      m.processStepId === input.processStepId &&
      m.status === "confirmado",
  );
  if (duplicated) return { ok: false, reason: "duplicado" };

  const now = new Date().toISOString();
  return commit({
    id: rid(),
    popId: input.popId,
    popSectionId: input.popSectionId,
    processId: input.processId,
    processStepId: input.processStepId,
    status: "confirmado",
    source: "manual",
    confirmedAgainstProcessVersionId: input.processVersionId,
    createdAt: now,
    updatedAt: now,
  });
}

/**
 * Exclui de fato o registro de uma relação `confirmado`.
 * Semanticamente distinto de `rejectMapping` (que apenas muda o status de
 * uma sugestão pendente e mantém o histórico).
 */
export function removeMapping(mappingId: string): PopProcessStepMappingResult {
  ensureHydrated();
  const current = state[mappingId];
  if (!current) return { ok: false, reason: "mapping-inexistente" };
  if (current.status !== "confirmado") return { ok: false, reason: "status-invalido" };
  const { [mappingId]: _removed, ...rest } = state;
  void _removed;
  state = rest;
  persist();
  emit();
  return { ok: true, mapping: current };
}
