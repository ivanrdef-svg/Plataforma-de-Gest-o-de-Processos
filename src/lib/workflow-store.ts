/**
 * Build 011 — armazenamento local das definições de Workflow.
 *
 * Mesmo padrão dos stores existentes (knowledge / pop / process / bpm /
 * relationship / lifecycle / governance): persistência temporária em
 * localStorage com `useSyncExternalStore`. Store adicional — nenhuma
 * funcionalidade existente é substituída.
 *
 * O Workflow NÃO duplica o Processo: ele referencia o processo de origem e
 * herda etapas, responsáveis, entradas, saídas, tempos e dependências.
 */

import { useSyncExternalStore } from "react";
import type { ProcessDoc, ProcessStep } from "@/lib/process-store";
import type { ProcessStepTypeId } from "@/config/process-model";
import type { ResponsibilityRole } from "@/config/governance-model";
import type { LifecycleStateId } from "@/config/lifecycle-model";
import {
  EXECUTION_RULE_HINTS,
  type WorkflowStatus,
} from "@/config/workflow-model";
import type { ExecutionKind } from "@/config/execution-rules";
import type { TimeUnit } from "@/config/sla-model";
import {
  versionIdOf,
  type WorkflowVersionStatus,
} from "@/config/workflow-version";



const STORAGE_KEY = "process-platform:workflow:v1";

/**
 * Build 013 — opção de uma etapa de decisão. Cada opção aponta para a próxima
 * etapa executável (por `stepId`), sem criar um motor paralelo de processos.
 */
export interface DecisionOption {
  id: string;
  label: string;
  /** Próxima etapa quando esta opção for escolhida. Vazio = seguir a sequência. */
  nextStepId: string;
  note: string;
}

export interface WorkflowStep {
  id: string;
  /** Etapa de origem no Processo — vínculo explícito, sem duplicação. */
  processStepId: string;
  name: string;
  description: string;
  owner: string;
  role: ResponsibilityRole;
  type?: ProcessStepTypeId;
  inputs: string;
  outputs: string;
  duration: string;
  dependsOn: string;
  /* Regras de execução (preparação para o futuro runtime). */
  precondition: string;
  condition: string;
  deadline: string;
  expectedAction: string;
  /* --- Build 013: regras operacionais (todas opcionais, retrocompatíveis) --- */
  /** Natureza executável: tarefa, aprovação ou decisão. */
  kind?: ExecutionKind;
  /** Aprovador responsável quando a etapa for uma aprovação. */
  approver?: string;
  /** Pergunta/critério exibido na etapa de decisão. */
  decisionQuestion?: string;
  decisionOptions?: DecisionOption[];
  /** Resultado da tarefa → próxima etapa (`stepId`). */
  outcomeTransitions?: Record<string, string>;
  /** Etapa para onde a rejeição/correção devolve o fluxo. */
  correctionStepId?: string;
  /** SE `condition` ENTÃO esta etapa. */
  conditionTargetStepId?: string;
  /* --- Build 014: prazo específico da etapa (prevalece sobre o padrão) --- */
  slaAmount?: number;
  slaUnit?: TimeUnit;
}



export interface WorkflowParticipant {
  id: string;
  name: string;
  role: ResponsibilityRole;
  area: string;
  stepIds: string[];
}

export interface WorkflowDoc {
  id: string;
  code: string;
  name: string;
  description: string;
  /** Processo de origem. */
  processId: string;
  processName: string;
  processVersion: string;
  objective: string;
  version: string;
  status: WorkflowStatus;
  owner: string;
  area: string;
  createdAt: string;
  revisedAt: string;
  favorite: boolean;
  steps: WorkflowStep[];
  participants: WorkflowParticipant[];
  savedAt: string;
  /* --- Build 014: prazos e SLA (opcionais, retrocompatíveis) --- */
  /** Tempo máximo de execução de uma instância. */
  slaAmount?: number;
  slaUnit?: TimeUnit;
  /** Prazo padrão herdado por cada tarefa. */
  taskSlaAmount?: number;
  taskSlaUnit?: TimeUnit;
  /* --- Build 016: validação e publicação (opcionais, retrocompatíveis) --- */
  /** Último resultado de validação registrado — dimensão independente do Lifecycle. */
  validation?: WorkflowValidationRecord;
  /** Eventos relevantes da definição (validação, publicação, bloqueios). */
  history?: WorkflowHistoryEvent[];
  publishedAt?: string;
  /* --- Build 017: versionamento (opcionais, retrocompatíveis) --- */
  /** Sequência de versões desta definição. Migrado sob demanda. */
  versions?: WorkflowVersion[];
  /** Número da versão que o conteúdo atual do documento representa. */
  currentVersionNumber?: number;
  /** Versão publicada vigente — base das novas execuções. */
  publishedVersionNumber?: number;
}

/** Status derivado da validação — NÃO substitui o Lifecycle Engine. */
export type WorkflowValidationStatus = "válido" | "válido com avisos" | "inválido";

export interface WorkflowValidationRecord {
  status: WorkflowValidationStatus;
  errors: number;
  warnings: number;
  validatedAt: string;
}

export interface WorkflowHistoryEvent {
  id: string;
  at: string;
  title: string;
  detail: string;
}

/* ------------------------------------------------------------------ */
/* Build 017 — versões                                                 */
/* ------------------------------------------------------------------ */

/** Conteúdo congelado de uma versão publicada/arquivada (cópia profunda). */
export interface WorkflowVersionContent {
  description: string;
  objective: string;
  steps: WorkflowStep[];
  participants: WorkflowParticipant[];
  processId: string;
  processName: string;
  processVersion: string;
  slaAmount?: number;
  slaUnit?: TimeUnit;
  taskSlaAmount?: number;
  taskSlaUnit?: TimeUnit;
}

export interface WorkflowVersion {
  /** `<workflowId>-v<n>` */
  versionId: string;
  number: number;
  status: WorkflowVersionStatus;
  summary: string;
  createdAt: string;
  publishedAt?: string;
  archivedAt?: string;
  /** Validação da própria versão (independente das demais). */
  validation?: WorkflowValidationRecord;
  /** Congelado no momento da publicação — garante imutabilidade real. */
  content?: WorkflowVersionContent;
}




type StoreState = Record<string, WorkflowDoc>;

let state: StoreState = {};
let hydrated = false;
let snapshotCache: WorkflowDoc[] | null = null;
const listeners = new Set<() => void>();

/** Cópia profunda simples — evita referências compartilhadas entre versões. */
function deepCopy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Conteúdo estrutural atual do documento (para congelar em uma versão). */
function contentOf(doc: WorkflowDoc): WorkflowVersionContent {
  return deepCopy({
    description: doc.description,
    objective: doc.objective,
    steps: doc.steps,
    participants: doc.participants,
    processId: doc.processId,
    processName: doc.processName,
    processVersion: doc.processVersion,
    ...(doc.slaAmount !== undefined ? { slaAmount: doc.slaAmount } : {}),
    ...(doc.slaUnit ? { slaUnit: doc.slaUnit } : {}),
    ...(doc.taskSlaAmount !== undefined ? { taskSlaAmount: doc.taskSlaAmount } : {}),
    ...(doc.taskSlaUnit ? { taskSlaUnit: doc.taskSlaUnit } : {}),
  });
}

/**
 * Build 017 — migração lógica NÃO destrutiva: workflows criados antes desta
 * build recebem uma representação compatível da sua versão atual (V1).
 * Nenhum dado existente é alterado, duplicado ou removido.
 */
function withVersioning(doc: WorkflowDoc): WorkflowDoc {
  if (doc.versions && doc.versions.length > 0) return doc;
  const status: WorkflowVersionStatus =
    doc.status === "publicado"
      ? "publicada"
      : doc.status === "arquivado"
        ? "arquivada"
        : "rascunho";
  const version: WorkflowVersion = {
    versionId: versionIdOf(doc.id, 1),
    number: 1,
    status,
    summary: "Versão inicial da definição.",
    createdAt: doc.savedAt ?? new Date().toISOString(),
    ...(status !== "rascunho"
      ? { publishedAt: doc.publishedAt ?? doc.savedAt ?? new Date().toISOString() }
      : {}),
    ...(status === "arquivada" ? { archivedAt: doc.savedAt ?? "" } : {}),
    ...(doc.validation ? { validation: doc.validation } : {}),
    ...(status === "rascunho" ? {} : { content: contentOf(doc) }),
  };
  return {
    ...doc,
    versions: [version],
    currentVersionNumber: 1,
    ...(status === "publicada" ? { publishedVersionNumber: 1 } : {}),
  };
}

function ensureHydrated() {
  if (hydrated || typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    state = raw ? (JSON.parse(raw) as StoreState) : {};
  } catch {
    state = {};
  }
  const migrated: StoreState = {};
  let changed = false;
  for (const [id, doc] of Object.entries(state)) {
    const next = withVersioning(doc);
    if (next !== doc) changed = true;
    migrated[id] = next;
  }
  state = migrated;
  hydrated = true;
  if (changed) persist();
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

function getSnapshot(): WorkflowDoc[] {
  ensureHydrated();
  if (!snapshotCache) {
    snapshotCache = Object.values(state).sort((a, b) =>
      (b.savedAt ?? "").localeCompare(a.savedAt ?? ""),
    );
  }
  return snapshotCache;
}

const serverSnapshot: WorkflowDoc[] = [];
function getServerSnapshot() {
  return serverSnapshot;
}

export function useWorkflowDocs(): WorkflowDoc[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useWorkflowDoc(id: string): WorkflowDoc | undefined {
  return useWorkflowDocs().find((d) => d.id === id);
}

export function getWorkflowDoc(id: string): WorkflowDoc | undefined {
  ensureHydrated();
  return state[id];
}

function rid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function formatDate(date = new Date()) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function nextCode() {
  const n = Object.keys(state).length + 1;
  return `WKF-${String(n).padStart(3, "0")}`;
}

function roleForStep(step: ProcessStep): ResponsibilityRole {
  switch (step.type) {
    case "aprovacao":
      return "Aprovador";
    case "validacao":
      return "Revisor";
    case "consulta":
      return "Consultado";
    case "comunicacao":
      return "Informado";
    default:
      return "Executor";
  }
}

/** Cria a definição de Workflow herdando tudo o que já existe no Processo. */
export function createWorkflowFromProcess(process: ProcessDoc): WorkflowDoc {
  ensureHydrated();
  const now = new Date();
  const id = `wkf-${now.getTime().toString(36)}`;
  const objectiveSection = process.sections.find(
    (s) => s.templateId === "objetivo",
  );

  const steps: WorkflowStep[] = process.steps.map((step, index) => ({
    id: rid("we"),
    processStepId: step.id,
    name: step.name,
    description: step.description,
    owner: step.owner,
    role: roleForStep(step),
    ...(step.type ? { type: step.type } : {}),
    inputs: step.inputs,
    outputs: step.outputs,
    duration: step.duration,
    dependsOn: step.dependsOn ?? (index > 0 ? process.steps[index - 1]!.name : ""),
    precondition: step.preconditions ?? "",
    condition: step.execution === "condicional" ? EXECUTION_RULE_HINTS.condition : "",
    deadline: step.duration,
    expectedAction: step.outputs ? `Registrar: ${step.outputs}` : "",
  }));

  const participants: WorkflowParticipant[] = [
    ...new Set(steps.map((s) => s.owner.trim()).filter(Boolean)),
  ].map((name) => ({
    id: rid("wp"),
    name,
    role: steps.find((s) => s.owner.trim() === name)!.role,
    area: process.area,
    stepIds: steps.filter((s) => s.owner.trim() === name).map((s) => s.id),
  }));

  const doc: WorkflowDoc = {
    id,
    code: nextCode(),
    name: `Workflow · ${process.name}`,
    description: `Definição de execução do processo ${process.name}.`,
    processId: process.id,
    processName: process.name,
    processVersion: process.version,
    objective: objectiveSection?.content?.trim() || process.description,
    version: "v0.1",
    status: "em configuração",
    owner: process.owner,
    area: process.area,
    createdAt: formatDate(now),
    revisedAt: formatDate(now),
    favorite: false,
    steps,
    participants,
    savedAt: now.toISOString(),
    /* Build 017 — todo workflow nasce na Versão 1 (Rascunho). */
    versions: [
      {
        versionId: versionIdOf(id, 1),
        number: 1,
        status: "rascunho",
        summary: "Versão inicial da definição.",
        createdAt: now.toISOString(),
      },
    ],
    currentVersionNumber: 1,
  };


  state = { ...state, [id]: doc };
  persist();
  emit();
  return doc;
}

/* ------------------------------------------------------------------ */
/* Build 017 — leitura das versões                                     */
/* ------------------------------------------------------------------ */

/** Versões da definição, sempre com a migração lógica aplicada. */
export function workflowVersions(doc: WorkflowDoc): WorkflowVersion[] {
  return withVersioning(doc).versions ?? [];
}

/** Versão que o conteúdo atual do documento representa. */
export function currentWorkflowVersion(doc: WorkflowDoc): WorkflowVersion | undefined {
  const versions = workflowVersions(doc);
  const current = withVersioning(doc).currentVersionNumber;
  return versions.find((v) => v.number === current) ?? versions[versions.length - 1];
}

/** Versão publicada vigente — base das novas execuções. */
export function publishedWorkflowVersion(
  doc: WorkflowDoc,
): WorkflowVersion | undefined {
  return [...workflowVersions(doc)]
    .reverse()
    .find((v) => v.status === "publicada");
}

/** Rascunho ativo, se houver. */
export function draftWorkflowVersion(doc: WorkflowDoc): WorkflowVersion | undefined {
  return workflowVersions(doc).find((v) => v.status === "rascunho");
}

/** Somente rascunhos podem ser editados. */
export function isWorkflowEditable(doc: WorkflowDoc): boolean {
  return currentWorkflowVersion(doc)?.status === "rascunho";
}

/** Guarda interna de imutabilidade — usada pelos mutadores de conteúdo. */
function editable(docId: string): boolean {
  ensureHydrated();
  const doc = state[docId];
  return Boolean(doc && isWorkflowEditable(doc));
}


export function updateWorkflowDoc(
  id: string,
  patch: Partial<Omit<WorkflowDoc, "id">>,
): WorkflowDoc | undefined {
  ensureHydrated();
  const current = state[id];
  if (!current) return undefined;
  const next: WorkflowDoc = {
    ...current,
    ...patch,
    id,
    revisedAt: formatDate(),
    savedAt: new Date().toISOString(),
  };
  state = { ...state, [id]: next };
  persist();
  emit();
  return next;
}

export function updateWorkflowStep(
  docId: string,
  stepId: string,
  patch: Partial<Omit<WorkflowStep, "id">>,
) {
  if (!editable(docId)) return undefined;
  const doc = state[docId];
  if (!doc) return undefined;
  return updateWorkflowDoc(docId, {
    steps: doc.steps.map((s) => (s.id === stepId ? { ...s, ...patch } : s)),
  });
}

/* ------------------------------------------------------------------ */
/* Build 013 — regras de execução por etapa                            */
/* ------------------------------------------------------------------ */

export function addDecisionOption(
  docId: string,
  stepId: string,
  label = "Nova opção",
) {
  const step = state[docId]?.steps.find((s) => s.id === stepId);
  if (!step) return undefined;
  const option: DecisionOption = { id: rid("op"), label, nextStepId: "", note: "" };
  return updateWorkflowStep(docId, stepId, {
    decisionOptions: [...(step.decisionOptions ?? []), option],
  });
}

export function updateDecisionOption(
  docId: string,
  stepId: string,
  optionId: string,
  patch: Partial<Omit<DecisionOption, "id">>,
) {
  const step = state[docId]?.steps.find((s) => s.id === stepId);
  if (!step) return undefined;
  return updateWorkflowStep(docId, stepId, {
    decisionOptions: (step.decisionOptions ?? []).map((o) =>
      o.id === optionId ? { ...o, ...patch } : o,
    ),
  });
}

export function removeDecisionOption(docId: string, stepId: string, optionId: string) {
  const step = state[docId]?.steps.find((s) => s.id === stepId);
  if (!step) return undefined;
  return updateWorkflowStep(docId, stepId, {
    decisionOptions: (step.decisionOptions ?? []).filter((o) => o.id !== optionId),
  });
}

export function setOutcomeTransition(
  docId: string,
  stepId: string,
  outcome: string,
  nextStepId: string,
) {
  const step = state[docId]?.steps.find((s) => s.id === stepId);
  if (!step) return undefined;
  return updateWorkflowStep(docId, stepId, {
    outcomeTransitions: { ...(step.outcomeTransitions ?? {}), [outcome]: nextStepId },
  });
}

/* ------------------------------------------------------------------ */
/* Build 014 — prazos e SLA                                            */
/* ------------------------------------------------------------------ */

export interface WorkflowSlaPatch {
  slaAmount?: number | undefined;
  slaUnit?: TimeUnit | undefined;
  taskSlaAmount?: number | undefined;
  taskSlaUnit?: TimeUnit | undefined;
}

/** Atualiza o SLA padrão da instância e das tarefas. */
export function setWorkflowSla(docId: string, patch: WorkflowSlaPatch) {
  if (!editable(docId)) return undefined;
  const doc = state[docId];
  if (!doc) return undefined;
  const next: WorkflowDoc = { ...doc };
  if ("slaAmount" in patch) {
    if (patch.slaAmount === undefined || Number.isNaN(patch.slaAmount)) {
      delete next.slaAmount;
    } else {
      next.slaAmount = patch.slaAmount;
      next.slaUnit = next.slaUnit ?? "horas";
    }
  }
  if ("slaUnit" in patch && patch.slaUnit) next.slaUnit = patch.slaUnit;
  if ("taskSlaAmount" in patch) {
    if (patch.taskSlaAmount === undefined || Number.isNaN(patch.taskSlaAmount)) {
      delete next.taskSlaAmount;
    } else {
      next.taskSlaAmount = patch.taskSlaAmount;
      next.taskSlaUnit = next.taskSlaUnit ?? "horas";
    }
  }
  if ("taskSlaUnit" in patch && patch.taskSlaUnit) next.taskSlaUnit = patch.taskSlaUnit;

  const updated: WorkflowDoc = {
    ...next,
    revisedAt: formatDate(),
    savedAt: new Date().toISOString(),
  };
  state = { ...state, [docId]: updated };
  persist();
  emit();
  return updated;
}


/** Prazo específico de uma etapa — `undefined` volta ao padrão do workflow. */
export function setStepSla(
  docId: string,
  stepId: string,
  amount: number | undefined,
  unit: TimeUnit | undefined,
) {
  if (!editable(docId)) return undefined;
  const doc = state[docId];
  const step = doc?.steps.find((s) => s.id === stepId);
  if (!doc || !step) return undefined;
  const nextStep: WorkflowStep = { ...step };
  if (amount === undefined || Number.isNaN(amount)) {
    delete nextStep.slaAmount;
    delete nextStep.slaUnit;
  } else {
    nextStep.slaAmount = amount;
    nextStep.slaUnit = unit ?? step.slaUnit ?? "horas";
  }
  return updateWorkflowDoc(docId, {
    steps: doc.steps.map((s) => (s.id === stepId ? nextStep : s)),
  });
}


export function updateWorkflowParticipant(
  docId: string,
  participantId: string,
  patch: Partial<Omit<WorkflowParticipant, "id">>,
) {
  if (!editable(docId)) return undefined;
  const doc = state[docId];
  if (!doc) return undefined;
  return updateWorkflowDoc(docId, {
    participants: doc.participants.map((p) =>
      p.id === participantId ? { ...p, ...patch } : p,
    ),
  });
}

export function toggleWorkflowParticipantStep(
  docId: string,
  participantId: string,
  stepId: string,
) {
  const doc = state[docId];
  const participant = doc?.participants.find((p) => p.id === participantId);
  if (!doc || !participant) return undefined;
  const stepIds = participant.stepIds.includes(stepId)
    ? participant.stepIds.filter((s) => s !== stepId)
    : [...participant.stepIds, stepId];
  return updateWorkflowParticipant(docId, participantId, { stepIds });
}

export function addWorkflowParticipant(
  docId: string,
  values?: Partial<WorkflowParticipant>,
) {
  if (!editable(docId)) return undefined;
  const doc = state[docId];
  if (!doc) return undefined;
  const participant: WorkflowParticipant = {
    id: rid("wp"),
    name: values?.name ?? "Novo participante",
    role: values?.role ?? "Executor",
    area: values?.area ?? doc.area,
    stepIds: values?.stepIds ?? [],
  };
  return updateWorkflowDoc(docId, {
    participants: [...doc.participants, participant],
  });
}

export function removeWorkflowParticipant(docId: string, participantId: string) {
  if (!editable(docId)) return undefined;
  const doc = state[docId];
  if (!doc) return undefined;
  return updateWorkflowDoc(docId, {
    participants: doc.participants.filter((p) => p.id !== participantId),
  });
}

/**
 * Reimporta as etapas do Processo de origem, preservando a configuração de
 * execução já feita pelo usuário (prazos, condições, ações esperadas).
 */
export function syncWorkflowWithProcess(docId: string, process: ProcessDoc) {
  if (!editable(docId)) return undefined;
  const doc = state[docId];
  if (!doc) return undefined;
  const byProcessStep = new Map(doc.steps.map((s) => [s.processStepId, s]));
  const steps: WorkflowStep[] = process.steps.map((step, index) => {
    const existing = byProcessStep.get(step.id);
    return {
      id: existing?.id ?? rid("we"),
      processStepId: step.id,
      name: step.name,
      description: step.description,
      owner: step.owner,
      role: existing?.role ?? roleForStep(step),
      ...(step.type ? { type: step.type } : {}),
      inputs: step.inputs,
      outputs: step.outputs,
      duration: step.duration,
      dependsOn:
        existing?.dependsOn ||
        step.dependsOn ||
        (index > 0 ? process.steps[index - 1]!.name : ""),
      precondition: existing?.precondition ?? step.preconditions ?? "",
      condition: existing?.condition ?? "",
      deadline: existing?.deadline ?? step.duration,
      expectedAction: existing?.expectedAction ?? "",
      /* Build 014 — o prazo específico configurado pelo usuário é preservado. */
      ...(existing?.slaAmount !== undefined ? { slaAmount: existing.slaAmount } : {}),
      ...(existing?.slaUnit ? { slaUnit: existing.slaUnit } : {}),
    };

  });
  return updateWorkflowDoc(docId, {
    steps,
    processName: process.name,
    processVersion: process.version,
  });
}

/* ------------------------------------------------------------------ */
/* Integração com o Lifecycle Engine existente                         */
/* ------------------------------------------------------------------ */

/** `status` legado equivalente ao estado do ciclo de vida. */
export function workflowStatusForState(
  state_: LifecycleStateId,
): WorkflowStatus | undefined {
  switch (state_) {
    case "rascunho":
      return "rascunho";
    case "em elaboração":
      return "em configuração";
    case "em revisão":
    case "aguardando aprovação":
      return "em revisão";
    case "aprovado":
      return "aprovado";
    case "publicado":
      return "publicado";
    case "arquivado":
    case "obsoleto":
      return "arquivado";
    default:
      return undefined;
  }
}

/** `status` do workflow traduzido para o vocabulário do Lifecycle Engine. */
export function lifecycleStatusOf(doc: WorkflowDoc): string {
  switch (doc.status) {
    case "em configuração":
      return "em elaboração";
    case "aprovado":
      return "aprovado";
    case "publicado":
      return "publicado";
    case "arquivado":
      return "arquivado";
    case "em revisão":
      return "em revisão";
    default:
      return "rascunho";
  }
}

/* ------------------------------------------------------------------ */
/* Build 016 — validação, histórico e publicação da definição          */
/* ------------------------------------------------------------------ */

/** Escrita direta: não altera `revisedAt` (validar não é revisar). */
function writeRaw(id: string, patch: Partial<Omit<WorkflowDoc, "id">>) {
  ensureHydrated();
  const current = state[id];
  if (!current) return undefined;
  const next: WorkflowDoc = { ...current, ...patch, id };
  state = { ...state, [id]: next };
  persist();
  emit();
  return next;
}

const HISTORY_LIMIT = 60;

/** Registra um evento relevante da definição (nunca a cada render). */
export function appendWorkflowEvent(docId: string, title: string, detail: string) {
  ensureHydrated();
  const doc = state[docId];
  if (!doc) return undefined;
  const entry: WorkflowHistoryEvent = {
    id: rid("wh"),
    at: new Date().toISOString(),
    title,
    detail,
  };
  return writeRaw(docId, {
    history: [entry, ...(doc.history ?? [])].slice(0, HISTORY_LIMIT),
  });
}

/** Guarda o último resultado de validação e registra o evento correspondente. */
export function recordWorkflowValidation(
  docId: string,
  result: { status: WorkflowValidationStatus; errors: number; warnings: number },
  options: { silent?: boolean } = {},
) {
  ensureHydrated();
  const doc = state[docId];
  if (!doc) return undefined;
  const record: WorkflowValidationRecord = {
    status: result.status,
    errors: result.errors,
    warnings: result.warnings,
    validatedAt: new Date().toISOString(),
  };
  /* Build 017 — a validação também pertence à versão atual. */
  const normalized = withVersioning(doc);
  const updated = writeRaw(docId, {
    validation: record,
    versions: (normalized.versions ?? []).map((v) =>
      v.number === normalized.currentVersionNumber ? { ...v, validation: record } : v,
    ),
    currentVersionNumber: normalized.currentVersionNumber ?? 1,
    ...(normalized.publishedVersionNumber !== undefined
      ? { publishedVersionNumber: normalized.publishedVersionNumber }
      : {}),
  });

  if (!options.silent) {
    appendWorkflowEvent(
      docId,
      result.errors > 0
        ? "Workflow validado com erros"
        : result.warnings > 0
          ? "Workflow validado com avisos"
          : "Workflow validado",
      `${result.errors} erro(s) e ${result.warnings} aviso(s).`,
    );
  }
  return updated;
}

/** Publicação controlada: só ocorre quando a validação não aponta erros. */
export function publishWorkflow(
  docId: string,
  result: { status: WorkflowValidationStatus; errors: number; warnings: number },
): { ok: true } | { ok: false; reason: "not-found" | "invalid" } {
  ensureHydrated();
  const doc = state[docId];
  if (!doc) return { ok: false, reason: "not-found" };
  recordWorkflowValidation(docId, result, { silent: true });
  if (result.errors > 0) {
    appendWorkflowEvent(
      docId,
      "Publicação bloqueada por validação",
      `${result.errors} erro(s) impedem a publicação.`,
    );
    return { ok: false, reason: "invalid" };
  }
  /* Build 017 — a publicação congela o conteúdo da versão atual. */
  const normalized = withVersioning(state[docId]!);
  const number = normalized.currentVersionNumber ?? 1;
  const publishedAt = new Date().toISOString();
  updateWorkflowDoc(docId, {
    status: "publicado",
    publishedAt,
    publishedVersionNumber: number,
    versions: (normalized.versions ?? []).map((v) =>
      v.number === number
        ? {
            ...v,
            status: "publicada" as WorkflowVersionStatus,
            publishedAt,
            content: contentOf(normalized),
          }
        : v,
    ),
  });
  appendWorkflowEvent(
    docId,
    `Versão ${number} publicada`,
    result.warnings > 0
      ? `Publicado com ${result.warnings} aviso(s).`
      : "Publicado sem erros e sem avisos.",
  );
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Build 017 — criação e arquivamento de versões                       */
/* ------------------------------------------------------------------ */

export type NewVersionResult =
  | { ok: true; version: WorkflowVersion }
  | { ok: false; reason: "not-found" | "draft-exists" | "no-published" };

/**
 * Cria um novo rascunho a partir da versão publicada vigente (ou da versão
 * atual). A cópia é profunda: alterar a nova versão nunca altera a anterior.
 */
export function createWorkflowVersion(docId: string): NewVersionResult {
  ensureHydrated();
  const raw = state[docId];
  if (!raw) return { ok: false, reason: "not-found" };
  const doc = withVersioning(raw);
  const versions = doc.versions ?? [];
  if (versions.some((v) => v.status === "rascunho")) {
    return { ok: false, reason: "draft-exists" };
  }
  const base =
    versions.find((v) => v.number === doc.publishedVersionNumber) ??
    [...versions].reverse().find((v) => v.status === "publicada") ??
    versions[versions.length - 1];
  if (!base) return { ok: false, reason: "no-published" };

  const number = Math.max(...versions.map((v) => v.number)) + 1;
  const content = deepCopy(base.content ?? contentOf(doc));
  const version: WorkflowVersion = {
    versionId: versionIdOf(docId, number),
    number,
    status: "rascunho",
    summary: `Nova versão criada a partir da versão ${base.number}.`,
    createdAt: new Date().toISOString(),
  };

  updateWorkflowDoc(docId, {
    ...content,
    status: "em configuração",
    versions: [...versions, version],
    currentVersionNumber: number,
  });
  appendWorkflowEvent(
    docId,
    `Versão ${number} criada`,
    `Rascunho gerado a partir da versão ${base.number}. A versão anterior permanece imutável.`,
  );
  return { ok: true, version };
}

/** Arquiva uma versão publicada: ela deixa de originar novas execuções. */
export function archiveWorkflowVersion(
  docId: string,
  number: number,
): { ok: true } | { ok: false; reason: "not-found" | "invalid-status" } {
  ensureHydrated();
  const raw = state[docId];
  if (!raw) return { ok: false, reason: "not-found" };
  const doc = withVersioning(raw);
  const versions = doc.versions ?? [];
  const target = versions.find((v) => v.number === number);
  if (!target) return { ok: false, reason: "not-found" };
  if (target.status !== "publicada") return { ok: false, reason: "invalid-status" };

  const archivedAt = new Date().toISOString();
  const nextVersions = versions.map((v) =>
    v.number === number
      ? { ...v, status: "arquivada" as WorkflowVersionStatus, archivedAt }
      : v,
  );
  const isCurrent = (doc.currentVersionNumber ?? 1) === number;
  updateWorkflowDoc(docId, {
    versions: nextVersions,
    ...(doc.publishedVersionNumber === number
      ? { publishedVersionNumber: undefined }
      : {}),
    ...(isCurrent ? { status: "arquivado" as const } : {}),
  });
  appendWorkflowEvent(
    docId,
    `Versão ${number} arquivada`,
    "Não inicia novas execuções. Execuções existentes seguem inalteradas.",
  );
  return { ok: true };
}
