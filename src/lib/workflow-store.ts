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

const STORAGE_KEY = "process-platform:workflow:v1";

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
}

type StoreState = Record<string, WorkflowDoc>;

let state: StoreState = {};
let hydrated = false;
let snapshotCache: WorkflowDoc[] | null = null;
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
  };

  state = { ...state, [id]: doc };
  persist();
  emit();
  return doc;
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
  const doc = state[docId];
  if (!doc) return undefined;
  return updateWorkflowDoc(docId, {
    steps: doc.steps.map((s) => (s.id === stepId ? { ...s, ...patch } : s)),
  });
}

export function updateWorkflowParticipant(
  docId: string,
  participantId: string,
  patch: Partial<Omit<WorkflowParticipant, "id">>,
) {
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
