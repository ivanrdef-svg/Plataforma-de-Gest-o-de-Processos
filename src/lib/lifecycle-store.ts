/**
 * Build 009 — store do Enterprise Lifecycle Engine.
 *
 * Mesmo padrão dos stores existentes (knowledge-store / pop-store /
 * process-store / relationship-store): persistência temporária em
 * localStorage. Objetos ainda sem histórico recebem uma trilha simulada
 * determinística, coerente com o `status` que já existe no módulo.
 *
 * Camada adicional: nenhum campo existente é removido. Quando o estado muda,
 * o `status` legado do objeto é atualizado junto, para que cards, badges e
 * indicadores já construídos continuem corretos automaticamente.
 */

import { useMemo, useSyncExternalStore } from "react";
import {
  actionsFor,
  nextStateFor,
  stateFromLegacyStatus,
  legacyStatusFor,
  type LifecycleAction,
  type LifecycleActionId,
  type LifecycleStateId,
} from "@/config/lifecycle-model";
import { getKnowledgeDoc, updateKnowledgeDoc } from "@/lib/knowledge-store";
import { updatePopDoc } from "@/lib/pop-store";
import { updateWorkflowDoc, workflowStatusForState } from "@/lib/workflow-store";

const STORAGE_KEY = "process-platform:lifecycle:v1";

/** Módulo de origem do objeto — define para onde o estado é espelhado. */
export type LifecycleObjectKind =
  | "knowledge"
  | "pop"
  | "processo"
  | "workflow"
  | "workspace"
  | "outro";

export interface LifecycleEvent {
  id: string;
  /** ISO */
  at: string;
  user: string;
  from?: LifecycleStateId | undefined;
  to: LifecycleStateId;
  note: string;
}

export interface LifecycleEntry {
  objectId: string;
  kind: LifecycleObjectKind;
  name: string;
  state: LifecycleStateId;
  owner: string;
  updatedAt: string;
  events: LifecycleEvent[];
  /** true enquanto o histórico for apenas simulado. */
  seeded?: boolean;
}

/** Dados mínimos do objeto para semear o ciclo de vida na primeira abertura. */
export interface LifecycleSeed {
  objectId: string;
  kind: LifecycleObjectKind;
  name: string;
  owner?: string;
  /** `status` já existente no módulo (rascunho, em revisão, publicado...). */
  status?: string;
  updatedAt?: string;
}

type StoreState = Record<string, LifecycleEntry>;

let state: StoreState = {};
let hydrated = false;
let version = 0;
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
  version += 1;
  persist();
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getVersion() {
  ensureHydrated();
  return version;
}

/* ------------------------------------------------------------------ */
/* Semente determinística                                              */
/* ------------------------------------------------------------------ */

const SIMULATED_USERS = [
  "Marina Duarte",
  "Rafael Lima",
  "Camila Torres",
  "Bruno Aguiar",
  "Helena Rocha",
];

const SEED_NOTES: Partial<Record<LifecycleStateId, string>> = {
  rascunho: "Objeto criado na plataforma.",
  "em elaboração": "Conteúdo em construção pelo responsável.",
  "em revisão": "Enviado para revisão técnica.",
  "aguardando aprovação": "Revisão concluída — aguardando decisão.",
  aprovado: "Aprovado pela governança de processos.",
  publicado: "Publicado para toda a organização.",
  arquivado: "Arquivado para consulta histórica.",
  obsoleto: "Substituído por uma versão mais recente.",
};

function hash(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) {
    h = (h * 31 + value.charCodeAt(i)) >>> 0;
  }
  return h;
}

/** Caminho percorrido até o estado atual (para a timeline simulada). */
function pathTo(target: LifecycleStateId): LifecycleStateId[] {
  const track: LifecycleStateId[] = [
    "rascunho",
    "em elaboração",
    "em revisão",
    "aguardando aprovação",
    "aprovado",
    "publicado",
  ];
  const index = track.indexOf(target);
  if (index >= 0) return track.slice(0, index + 1);
  return ["rascunho", "em elaboração", target];
}

function buildSeedEntry(seed: LifecycleSeed): LifecycleEntry {
  const current = stateFromLegacyStatus(seed.status);
  const steps = pathTo(current);
  const base = hash(seed.objectId);
  const end = seed.updatedAt ? Date.parse(seed.updatedAt) : Number.NaN;
  const anchor = Number.isNaN(end) ? Date.now() : Math.min(end, Date.now());

  const events: LifecycleEvent[] = steps.map((to, index) => {
    const stepsRemaining = steps.length - 1 - index;
    const daysBack = stepsRemaining * (3 + ((base >> (index * 2)) % 5));
    const at = new Date(anchor - daysBack * 86_400_000).toISOString();
    const user =
      index === 0 && seed.owner
        ? seed.owner
        : SIMULATED_USERS[(base + index) % SIMULATED_USERS.length]!;
    return {
      id: `${seed.objectId}-seed-${index}`,
      at,
      user,
      from: index === 0 ? undefined : steps[index - 1],
      to,
      note: SEED_NOTES[to] ?? "Mudança de estado registrada.",
    };
  });

  return {
    objectId: seed.objectId,
    kind: seed.kind,
    name: seed.name,
    state: current,
    owner: seed.owner ?? events[0]?.user ?? "Não atribuído",
    updatedAt: events[events.length - 1]?.at ?? new Date().toISOString(),
    events,
    seeded: true,
  };
}

/* ------------------------------------------------------------------ */
/* Leitura                                                             */
/* ------------------------------------------------------------------ */

export function getLifecycle(seed: LifecycleSeed): LifecycleEntry {
  ensureHydrated();
  const existing = state[seed.objectId];
  if (existing) {
    // Nome e responsável acompanham o objeto, sem apagar o histórico.
    const name = seed.name || existing.name;
    const owner = seed.owner || existing.owner;
    if (name !== existing.name || owner !== existing.owner) {
      return { ...existing, name, owner };
    }
    return existing;
  }
  return buildSeedEntry(seed);
}

/** Estado atual de um objeto, semeando a partir do status legado. */
export function useLifecycle(seed: LifecycleSeed): LifecycleEntry {
  useSyncExternalStore(subscribe, getVersion, () => 0);
  return useMemo(
    () => getLifecycle(seed),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [seed.objectId, seed.kind, seed.name, seed.owner, seed.status, seed.updatedAt, version],
  );
}

/** Somente o estado — usado por cards e badges. */
export function useLifecycleState(seed: LifecycleSeed): LifecycleStateId {
  return useLifecycle(seed).state;
}

/** Entradas já registradas (objetos que tiveram alguma interação). */
export function useLifecycleEntries(): LifecycleEntry[] {
  useSyncExternalStore(subscribe, getVersion, () => 0);
  return useMemo(() => Object.values(state), [version]);
}

export function availableActions(state_: LifecycleStateId): LifecycleAction[] {
  return actionsFor(state_);
}

export function nextState(state_: LifecycleStateId): LifecycleStateId | undefined {
  return nextStateFor(state_);
}

/* ------------------------------------------------------------------ */
/* Escrita                                                             */
/* ------------------------------------------------------------------ */

const CURRENT_USER = "Você";

/**
 * Espelha o novo estado no `status` legado do módulo de origem, mantendo
 * cards, filtros e indicadores existentes coerentes automaticamente.
 */
function mirrorLegacyStatus(entry: LifecycleEntry, next: LifecycleStateId) {
  const knowledgeLike = ["rascunho", "em revisão", "publicado"];
  switch (entry.kind) {
    case "knowledge": {
      const status = legacyStatusFor(next, knowledgeLike);
      if (status && getKnowledgeDoc(entry.objectId)) {
        updateKnowledgeDoc(entry.objectId, { status: status as never });
      }
      break;
    }
    case "pop": {
      const status = legacyStatusFor(next, knowledgeLike);
      if (status) updatePopDoc(entry.objectId, { status: status as never });
      break;
    }
    // Process publication is governed exclusively by process-store version APIs.
    case "workflow": {
      const status = workflowStatusForState(next);
      if (status) updateWorkflowDoc(entry.objectId, { status });
      break;
    }
    default:
      break;
  }
}

/** Executa uma ação de ciclo de vida (comportamento simulado nesta Build). */
export function applyLifecycleAction(
  seed: LifecycleSeed,
  action: LifecycleAction | LifecycleActionId,
  note?: string,
): LifecycleEntry {
  ensureHydrated();
  const entry = getLifecycle(seed);
  const resolved =
    typeof action === "string"
      ? actionsFor(entry.state).find((item) => item.id === action)
      : action;
  if (!resolved) return entry;

  const at = new Date().toISOString();
  const event: LifecycleEvent = {
    id: `${entry.objectId}-${Date.now()}`,
    at,
    user: CURRENT_USER,
    from: entry.state,
    to: resolved.to,
    note: note?.trim() || `${resolved.label} · ação registrada no ciclo de vida.`,
  };

  const updated: LifecycleEntry = {
    ...entry,
    state: resolved.to,
    updatedAt: at,
    events: [...entry.events, event],
    seeded: false,
  };

  state = { ...state, [entry.objectId]: updated };
  mirrorLegacyStatus(updated, resolved.to);
  emit();
  return updated;
}

/** Registra uma observação sem mudar de estado. */
export function addLifecycleNote(seed: LifecycleSeed, note: string) {
  const text = note.trim();
  if (!text) return;
  ensureHydrated();
  const entry = getLifecycle(seed);
  const at = new Date().toISOString();
  const updated: LifecycleEntry = {
    ...entry,
    updatedAt: at,
    events: [
      ...entry.events,
      {
        id: `${entry.objectId}-note-${Date.now()}`,
        at,
        user: CURRENT_USER,
        to: entry.state,
        note: text,
      },
    ],
    seeded: false,
  };
  state = { ...state, [entry.objectId]: updated };
  emit();
}
