import {
  validateWorkflow,
  type ValidationContext,
  type WorkflowValidation,
} from "@/lib/workflow-validation";
/**
 * Build 012 — armazenamento local das instâncias de execução (Workflow Runtime).
 *
 * Mesmo padrão dos stores existentes (knowledge / pop / process / bpm /
 * relationship / lifecycle / governance / workflow): persistência temporária em
 * localStorage com `useSyncExternalStore`. Store ADICIONAL — nada existente é
 * alterado. A instância referencia a definição de Workflow, nunca a duplica.
 */

import { useEffect, useSyncExternalStore } from "react";
import {
  appendWorkflowEvent,
  currentWorkflowVersion,
  publishedWorkflowVersion,
  recordWorkflowValidation,
  type WorkflowDoc,
} from "@/lib/workflow-store";


import type { ResponsibilityRole } from "@/config/governance-model";
import type { ProcessStepTypeId } from "@/config/process-model";
import {
  OPEN_TASK_STATES,
  type InstanceState,
  type TaskState,
} from "@/config/runtime-model";
import { isEndTarget } from "@/config/execution-rules";
import type {
  ApprovalState,
  ExecutionKind,
  TaskOutcome,
} from "@/config/execution-rules";

import { snapshotStepRules } from "@/lib/execution-rules";
import {
  SLA_FILTER_STATUSES,
  type SlaFilterId,
} from "@/config/sla-model";
import type {
  SlaOccurrenceStatus,
  SlaOccurrenceType,
  SlaSpec,
  SlaStatus,
  TimeUnit,
} from "@/config/sla-model";
import {
  computeSla,
  defaultTaskSpecOf,
  dueDateFrom,
  formatDuration,
  formatRemaining,
  instanceSpecOf,
  stepSpecOf,
  toSpec,
  type SlaComputation,
} from "@/lib/sla";


const STORAGE_KEY = "process-platform:runtime:v1";

export interface RuntimeTaskOption {
  id: string;
  label: string;
  /** `stepId` da definição — resolvido para a tarefa correspondente. */
  nextStepId: string;
  note: string;
}

export interface RuntimeTask {
  id: string;
  /** Etapa executável de origem no Workflow Definition. */
  stepId: string;
  order: number;
  name: string;
  description: string;
  type?: ProcessStepTypeId;
  owner: string;
  role: ResponsibilityRole;
  state: TaskState;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  deadline: string;
  inputs: string;
  outputs: string;
  precondition: string;
  expectedAction: string;
  notes: string;
  blockedReason?: string;
  /* --- Build 013: regras operacionais (snapshot da definição) --- */
  kind?: ExecutionKind;
  approver?: string;
  question?: string;
  options?: RuntimeTaskOption[];
  nextByOutcome?: Record<string, string>;
  correctionStepId?: string;
  condition?: string;
  /* --- Build 013: resultado da execução --- */
  outcome?: TaskOutcome;
  approvalState?: ApprovalState;
  justification?: string;
  decisionLabel?: string;
  correctionRequested?: boolean;
  correctionReason?: string;
  /* --- Build 014: dimensão temporal (herdada da definição) --- */
  /** Prazo herdado da etapa ou do padrão do workflow. */
  slaAmount?: number;
  slaUnit?: TimeUnit;
  /** Data limite calculada quando a tarefa começa. */
  dueAt?: string;
  /** Marcações para não repetir eventos temporais. */
  slaWarnedAt?: string;
  slaOverdueAt?: string;
}


export interface RuntimeEvent {
  id: string;
  at: string;
  title: string;
  detail: string;
  user: string;
}

/** Build 014 — ocorrência registrada quando um prazo é ultrapassado. */
export interface SlaOccurrence {
  id: string;
  type: SlaOccurrenceType;
  objectId: string;
  objectName: string;
  at: string;
  /** Prazo original declarado (ex.: "24 horas"). */
  deadlineLabel: string;
  dueAt: string;
  overdueMs: number;
  owner: string;
  status: SlaOccurrenceStatus;
}

export interface WorkflowInstance {
  id: string;
  code: string;
  name: string;
  workflowId: string;
  workflowName: string;
  /* --- Build 017: versão da definição que originou a execução --- */
  workflowVersion?: number;
  workflowVersionId?: string;
  processId: string;
  processName: string;
  version: string;
  state: InstanceState;
  owner: string;
  area: string;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  cancelReason?: string;
  result?: string;
  tasks: RuntimeTask[];
  events: RuntimeEvent[];
  /* --- Build 014: SLA da instância --- */
  slaAmount?: number;
  slaUnit?: TimeUnit;
  /** Data limite da execução. */
  slaDueAt?: string;
  slaWarnedAt?: string;
  slaOverdueAt?: string;
  slaOccurrences?: SlaOccurrence[];
  /* --- Build 014: pausa (o relógio do SLA continua correndo) --- */
  pausedAt?: string;
  pauseReason?: string;
  pausedElapsedMs?: number;
}


type StoreState = Record<string, WorkflowInstance>;

let state: StoreState = {};
let hydrated = false;
let snapshotCache: WorkflowInstance[] | null = null;
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

function getSnapshot(): WorkflowInstance[] {
  ensureHydrated();
  if (!snapshotCache) {
    snapshotCache = Object.values(state).sort((a, b) =>
      (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""),
    );
  }
  return snapshotCache;
}

const serverSnapshot: WorkflowInstance[] = [];
function getServerSnapshot() {
  return serverSnapshot;
}

export function useWorkflowInstances(): WorkflowInstance[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useWorkflowInstance(id: string): WorkflowInstance | undefined {
  return useWorkflowInstances().find((i) => i.id === id);
}

export function getWorkflowInstance(id: string): WorkflowInstance | undefined {
  ensureHydrated();
  return state[id];
}

/* ------------------------------------------------------------------ */
/* Utilitários                                                         */
/* ------------------------------------------------------------------ */

function rid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

const CURRENT_USER = "Você";

function nextCode() {
  const n = Object.keys(state).length + 1;
  return `EXE-${String(n).padStart(3, "0")}`;
}

function event(title: string, detail: string, user = CURRENT_USER): RuntimeEvent {
  return { id: rid("ev"), at: new Date().toISOString(), title, detail, user };
}

export function instanceProgress(instance: WorkflowInstance): number {
  const active = instance.tasks.filter((t) => t.state !== "cancelada");
  if (active.length === 0) return 0;
  const done = active.filter((t) => t.state === "concluída").length;
  return Math.round((done / active.length) * 100);
}

export function currentTask(instance: WorkflowInstance): RuntimeTask | undefined {
  return (
    instance.tasks.find((t) => t.state === "em andamento") ??
    instance.tasks.find((t) => t.state === "pendente") ??
    instance.tasks.find((t) => t.state === "bloqueada")
  );
}

export function openTasks(instance: WorkflowInstance): RuntimeTask[] {
  return instance.tasks.filter((t) => OPEN_TASK_STATES.includes(t.state));
}

/* ------------------------------------------------------------------ */
/* Build 013 — leitura das regras operacionais                         */
/* ------------------------------------------------------------------ */

export function taskKind(task: RuntimeTask): ExecutionKind {
  return task.kind ?? "tarefa";
}

export function isOpen(task: RuntimeTask): boolean {
  return OPEN_TASK_STATES.includes(task.state);
}

export function pendingApprovals(instance: WorkflowInstance): RuntimeTask[] {
  return instance.tasks.filter((t) => taskKind(t) === "aprovação" && isOpen(t));
}

export function pendingDecisions(instance: WorkflowInstance): RuntimeTask[] {
  return instance.tasks.filter((t) => taskKind(t) === "decisão" && isOpen(t));
}

export function blockedTasks(instance: WorkflowInstance): RuntimeTask[] {
  return instance.tasks.filter((t) => t.state === "bloqueada");
}

export function tasksAwaitingCorrection(instance: WorkflowInstance): RuntimeTask[] {
  return instance.tasks.filter((t) => t.correctionRequested && isOpen(t));
}

/** Motivos que impedem a conclusão da instância. */
export function completionBlockers(instance: WorkflowInstance): string[] {
  const blockers: string[] = [];
  const approvals = pendingApprovals(instance).length;
  const decisions = pendingDecisions(instance).length;
  const blocked = blockedTasks(instance).length;
  const others = instance.tasks.filter(
    (t) => isOpen(t) && taskKind(t) === "tarefa" && t.state !== "bloqueada",
  ).length;
  if (approvals) blockers.push(`${approvals} aprovação(ões) pendente(s)`);
  if (decisions) blockers.push(`${decisions} decisão(ões) pendente(s)`);
  if (blocked) blockers.push(`${blocked} tarefa(s) bloqueada(s)`);
  if (others) blockers.push(`${others} tarefa(s) em aberto`);
  return blockers;
}

/* ------------------------------------------------------------------ */
/* Build 014 — leitura temporal (SLA)                                  */
/* ------------------------------------------------------------------ */

/** Prazo declarado da tarefa, herdado da definição. */
export function taskSpec(task: RuntimeTask): SlaSpec | undefined {
  return toSpec(task.slaAmount, task.slaUnit);
}

export function instanceSpec(instance: WorkflowInstance): SlaSpec | undefined {
  return toSpec(instance.slaAmount, instance.slaUnit);
}

/** Situação temporal da tarefa a partir dos timestamps reais. */
export function taskSla(task: RuntimeTask, now?: number): SlaComputation {
  return computeSla({
    startedAt: task.startedAt ?? task.createdAt,
    dueAt: task.dueAt,
    completedAt: task.state === "concluída" ? task.completedAt : undefined,
    now,
  });
}

/** Situação temporal da instância. */
export function instanceSla(instance: WorkflowInstance, now?: number): SlaComputation {
  return computeSla({
    startedAt: instance.startedAt,
    dueAt: instance.slaDueAt,
    completedAt: instance.state === "concluída" ? instance.completedAt : undefined,
    now,
  });
}

export function instanceSlaStatus(instance: WorkflowInstance, now?: number): SlaStatus {
  return instanceSla(instance, now).status;
}

export function hasSla(instance: WorkflowInstance): boolean {
  return Boolean(instance.slaDueAt || instance.tasks.some((t) => t.dueAt));
}

/** Tarefas atrasadas — condição temporal, jamais um estado operacional. */
export function overdueTasks(instance: WorkflowInstance, now?: number): RuntimeTask[] {
  return instance.tasks.filter((t) => isOpen(t) && taskSla(t, now).late);
}

export function tasksAtRisk(instance: WorkflowInstance, now?: number): RuntimeTask[] {
  return instance.tasks.filter(
    (t) => isOpen(t) && taskSla(t, now).status === "próximo do vencimento",
  );
}

export function slaOccurrences(instance: WorkflowInstance): SlaOccurrence[] {
  return instance.slaOccurrences ?? [];
}

/** Progresso temporal (percentual do SLA consumido). */
export function slaProgress(instance: WorkflowInstance, now?: number): number {
  const sla = instanceSla(instance, now);
  return sla.applicable ? Math.min(100, sla.percent) : 0;
}


export function formatElapsed(instance: WorkflowInstance): string {
  const start = new Date(instance.startedAt).getTime();
  const end = instance.completedAt
    ? new Date(instance.completedAt).getTime()
    : Date.now();
  const minutes = Math.max(0, Math.round((end - start) / 60000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}min`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

export function formatDateTime(iso: string | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/* ------------------------------------------------------------------ */
/* Escrita                                                             */
/* ------------------------------------------------------------------ */

function write(
  id: string,
  patch: Partial<Omit<WorkflowInstance, "id">>,
  newEvents: RuntimeEvent[] = [],
): WorkflowInstance | undefined {
  ensureHydrated();
  const current = state[id];
  if (!current) return undefined;
  const next: WorkflowInstance = {
    ...current,
    ...patch,
    id,
    events: [...current.events, ...newEvents],
    updatedAt: new Date().toISOString(),
  };
  state = { ...state, [id]: next };
  persist();
  emit();
  return next;
}

/**
 * Cria a instância de execução a partir de uma definição de Workflow.
 *
 * Build 017.1 — etapas, participantes e SLA vêm SEMPRE do conteúdo congelado
 * da versão publicada; o rascunho em edição nunca é executado.
 */
export function startInstanceFromWorkflow(doc: WorkflowDoc): WorkflowInstance {
  ensureHydrated();
  const now = new Date();
  const iso = now.toISOString();
  const id = `exe-${now.getTime().toString(36)}`;

  /* Build 017 — a instância registra explicitamente a versão de origem. */
  const originVersion = publishedWorkflowVersion(doc) ?? currentWorkflowVersion(doc);

  /* Fonte de verdade da execução: conteúdo congelado da versão publicada. */
  let source: WorkflowDoc = doc;
  const frozen = originVersion?.content;
  if (frozen) {
    const merged: WorkflowDoc = { ...doc };
    delete merged.slaAmount;
    delete merged.slaUnit;
    delete merged.taskSlaAmount;
    delete merged.taskSlaUnit;
    source = { ...merged, ...frozen };
  }

  const docInstanceSpec = instanceSpecOf(source);
  const docTaskSpec = defaultTaskSpecOf(source);

  const tasks: RuntimeTask[] = source.steps.map((step, index) => {
    const rules = snapshotStepRules(source, step);
    // Build 014 — o prazo específico da etapa prevalece sobre o padrão.
    const spec = stepSpecOf(source, step);
    const due = index === 0 && spec ? dueDateFrom(iso, spec) : undefined;
    return {
      id: rid("tk"),
      stepId: step.id,
      order: index,
      name: step.name,
      description: step.description,
      ...(step.type ? { type: step.type } : {}),
      owner: step.owner,
      role: step.role,
      state: index === 0 ? "em andamento" : "pendente",
      createdAt: iso,
      ...(index === 0 ? { startedAt: iso } : {}),
      deadline: step.deadline || step.duration,
      inputs: step.inputs,
      outputs: step.outputs,
      precondition: step.precondition,
      expectedAction: step.expectedAction,
      notes: "",
      kind: rules.kind,
      approver: rules.approver,
      question: rules.question,
      options: rules.options,
      nextByOutcome: rules.nextByOutcome,
      correctionStepId: rules.correctionStepId,
      condition: rules.condition,
      ...(rules.kind === "aprovação"
        ? { approvalState: "pendente" as ApprovalState }
        : {}),
      ...(spec ? { slaAmount: spec.amount, slaUnit: spec.unit } : {}),
      ...(due ? { dueAt: due } : {}),
    } satisfies RuntimeTask;
  });


  const events: RuntimeEvent[] = [
    event("Execução iniciada", `${doc.name} — ${source.processName}.`),
    event("Tarefas criadas", `${tasks.length} tarefas geradas a partir das etapas.`),
  ];
  const first = tasks[0];
  if (first) {
    events.push(event("Tarefa iniciada", `${first.name} · ${first.owner || "sem responsável"}.`));
  }

  const slaDueAt = docInstanceSpec ? dueDateFrom(iso, docInstanceSpec) : undefined;
  if (docInstanceSpec) {
    events.push(
      event(
        "SLA iniciado",
        `SLA da execução: ${docInstanceSpec.amount} ${docInstanceSpec.unit} · limite ${formatDateTime(slaDueAt)}.`,
      ),
    );
  }
  if (docTaskSpec) {
    events.push(
      event(
        "Prazo definido",
        `Prazo padrão das tarefas: ${docTaskSpec.amount} ${docTaskSpec.unit}.`,
      ),
    );
  }
  const specificSteps = source.steps.filter((s) => s.slaAmount && s.slaAmount > 0);
  if (specificSteps.length > 0) {
    events.push(
      event(
        "Prazo definido",
        `${specificSteps.length} etapa(s) com prazo específico: ${specificSteps
          .map((s) => `${s.name} (${s.slaAmount} ${s.slaUnit ?? "horas"})`)
          .join(", ")}.`,
      ),
    );
  }

  const instance: WorkflowInstance = {
    id,
    code: nextCode(),
    name: `Execução · ${source.processName}`,
    workflowId: doc.id,
    workflowName: doc.name,
    ...(originVersion
      ? {
          workflowVersion: originVersion.number,
          workflowVersionId: originVersion.versionId,
        }
      : {}),
    processId: source.processId,
    processName: source.processName,
    version: doc.version,
    state: "em execução",
    owner: doc.owner,
    area: doc.area,
    startedAt: iso,
    updatedAt: iso,
    tasks,
    events,
    ...(docInstanceSpec
      ? { slaAmount: docInstanceSpec.amount, slaUnit: docInstanceSpec.unit }
      : {}),
    ...(slaDueAt ? { slaDueAt } : {}),
    slaOccurrences: [],
  };

  state = { ...state, [id]: instance };
  persist();
  emit();
  return instance;
}

/** Patch aplicado quando uma tarefa começa: o relógio do prazo passa a correr. */
function startPatch(task: RuntimeTask, iso: string): Partial<RuntimeTask> {
  const spec = taskSpec(task);
  const due = spec ? dueDateFrom(iso, spec) : undefined;
  return {
    state: "em andamento",
    startedAt: iso,
    ...(due ? { dueAt: due } : {}),
  };
}


function occurrence(
  type: SlaOccurrenceType,
  objectId: string,
  objectName: string,
  deadlineLabel: string,
  dueAt: string,
  overdueMs: number,
  owner: string,
  status: SlaOccurrenceStatus = "aberta",
): SlaOccurrence {
  return {
    id: rid("sla"),
    type,
    objectId,
    objectName,
    at: new Date().toISOString(),
    deadlineLabel,
    dueAt,
    overdueMs,
    owner,
    status,
  };
}

function specLabelOf(spec: SlaSpec | undefined): string {
  return spec ? `${spec.amount} ${spec.unit}` : "—";
}

function maybeComplete(instance: WorkflowInstance): WorkflowInstance {
  const active = instance.tasks.filter((t) => t.state !== "cancelada");
  const allDone = active.length > 0 && active.every((t) => t.state === "concluída");
  if (!allDone || instance.state === "concluída") return instance;
  const iso = new Date().toISOString();
  const events: RuntimeEvent[] = [
    event("Execução concluída", "Todas as tarefas necessárias foram concluídas."),
  ];

  // Build 014 — fecho temporal da instância.
  const sla = computeSla({
    startedAt: instance.startedAt,
    dueAt: instance.slaDueAt,
    completedAt: iso,
  });
  const occurrences = [...(instance.slaOccurrences ?? [])];
  if (sla.applicable) {
    if (sla.overdueMs > 0) {
      events.push(
        event(
          "Workflow concluído fora do SLA",
          `Limite ${formatDateTime(instance.slaDueAt)} · excedeu em ${formatDuration(sla.overdueMs)}.`,
        ),
      );
      occurrences.push(
        occurrence(
          "workflow",
          instance.id,
          instance.name,
          specLabelOf(instanceSpec(instance)),
          instance.slaDueAt ?? iso,
          sla.overdueMs,
          instance.owner,
          "encerrada",
        ),
      );
    } else {
      events.push(
        event(
          "Workflow concluído dentro do SLA",
          `Limite ${formatDateTime(instance.slaDueAt)} · folga de ${formatDuration(Math.max(0, sla.remainingMs))}.`,
        ),
      );
    }
  }

  return {
    ...instance,
    state: "concluída",
    completedAt: iso,
    result: "Todas as tarefas foram concluídas.",
    slaOccurrences: occurrences.map((o) =>
      o.type === "tarefa" ? o : { ...o, status: "encerrada" as SlaOccurrenceStatus },
    ),
    events: [...instance.events, ...events],
  };
}


/**
 * Build 014 — fecho temporal das tarefas que acabaram de ser concluídas.
 * Compara o estado anterior com o novo: nenhum evento é gerado repetidamente.
 */
function applyTaskClosure(
  previous: WorkflowInstance,
  next: WorkflowInstance,
): WorkflowInstance {
  const before = new Map(previous.tasks.map((t) => [t.id, t.state]));
  const events: RuntimeEvent[] = [];
  let occurrences = [...(next.slaOccurrences ?? [])];

  for (const task of next.tasks) {
    if (task.state !== "concluída" || before.get(task.id) === "concluída") continue;
    if (!task.dueAt) continue;
    const sla = taskSla(task);
    if (sla.overdueMs > 0) {
      events.push(
        event(
          "Tarefa concluída fora do prazo",
          `${task.name} · limite ${formatDateTime(task.dueAt)} · excedeu em ${formatDuration(sla.overdueMs)}.`,
        ),
      );
      occurrences = occurrences.map((o) =>
        o.type === "tarefa" && o.objectId === task.id && o.status === "aberta"
          ? { ...o, status: "encerrada" as SlaOccurrenceStatus, overdueMs: sla.overdueMs }
          : o,
      );
    } else {
      events.push(
        event(
          "Tarefa concluída dentro do prazo",
          `${task.name} · limite ${formatDateTime(task.dueAt)} · folga de ${formatDuration(Math.max(0, sla.remainingMs))}.`,
        ),
      );
    }
  }

  if (events.length === 0) return next;
  return {
    ...next,
    slaOccurrences: occurrences,
    events: [...next.events, ...events],
  };
}

function patchTask(
  instanceId: string,
  taskId: string,
  patch: Partial<RuntimeTask>,
  evt?: RuntimeEvent,
) {
  ensureHydrated();
  const current = state[instanceId];
  if (!current) return undefined;
  const tasks = current.tasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t));
  let next: WorkflowInstance = {
    ...current,
    tasks,
    events: evt ? [...current.events, evt] : current.events,
    updatedAt: new Date().toISOString(),
  };
  next = applyTaskClosure(current, next);
  next = maybeComplete(next);
  state = { ...state, [instanceId]: next };
  persist();
  emit();
  return next;
}

/** Resultado do início de uma tarefa — recusa quando já há outra em andamento. */
export type StartTaskResult =
  | { ok: true; instance: WorkflowInstance | undefined }
  | { ok: false; reason: "not-found" | "already-running" };

/** true quando a instância já possui uma tarefa em andamento (exceto `exceptTaskId`). */
export function hasRunningTask(instanceId: string, exceptTaskId?: string): boolean {
  return Boolean(
    state[instanceId]?.tasks.some(
      (t) => t.state === "em andamento" && t.id !== exceptTaskId,
    ),
  );
}

export function startTask(instanceId: string, taskId: string): StartTaskResult {
  ensureHydrated();
  const task = state[instanceId]?.tasks.find((t) => t.id === taskId);
  if (!task) return { ok: false, reason: "not-found" };
  // C1 — apenas uma tarefa ativa por vez em cada execução.
  if (hasRunningTask(instanceId, taskId)) {
    return { ok: false, reason: "already-running" };
  }
  const iso = new Date().toISOString();
  const patch = startPatch(task, iso);
  const instance = patchTask(
    instanceId,
    taskId,
    patch,
    event(
      "Tarefa iniciada",
      patch.dueAt
        ? `${task.name} · prazo até ${formatDateTime(patch.dueAt)}`
        : task.name,
    ),
  );
  return { ok: true, instance };
}


export function completeTask(instanceId: string, taskId: string, note?: string) {
  const instance = state[instanceId];
  const task = instance?.tasks.find((t) => t.id === taskId);
  if (!instance || !task) return undefined;
  const iso = new Date().toISOString();
  const next = patchTask(
    instanceId,
    taskId,
    {
      state: "concluída",
      completedAt: iso,
      notes: note?.trim() ? note.trim() : task.notes,
      ...(task.blockedReason ? { blockedReason: "" } : {}),
    },
    event(
      "Tarefa concluída",
      note?.trim() ? `${task.name} — ${note.trim()}` : task.name,
    ),
  );
  if (!next || next.state === "concluída") return next;
  // Avança para a próxima etapa quando a sequência permitir.
  const pending = next.tasks
    .filter((t) => t.state === "pendente")
    .sort((a, b) => a.order - b.order)[0];
  const hasRunning = next.tasks.some((t) => t.state === "em andamento");
  if (pending && !hasRunning) {
    return patchTask(
      instanceId,
      pending.id,
      startPatch(pending, new Date().toISOString()),
      event("Tarefa iniciada", pending.name),

    );
  }
  return next;
}

/* ------------------------------------------------------------------ */
/* Build 013 — resultados, aprovações e decisões                       */
/* ------------------------------------------------------------------ */

function commit(
  instanceId: string,
  tasks: RuntimeTask[],
  newEvents: RuntimeEvent[],
): WorkflowInstance | undefined {
  ensureHydrated();
  const current = state[instanceId];
  if (!current) return undefined;
  let next: WorkflowInstance = {
    ...current,
    tasks,
    events: [...current.events, ...newEvents],
    updatedAt: new Date().toISOString(),
  };
  next = applyTaskClosure(current, next);
  next = maybeComplete(next);

  state = { ...state, [instanceId]: next };
  persist();
  emit();
  return next;
}

export interface ResolveTaskInput {
  outcome: TaskOutcome;
  /** Opção escolhida quando a tarefa é uma decisão. */
  optionId?: string;
  justification?: string;
  note?: string;
}

/** Resultado da resolução de uma tarefa. `stalled` = regra sem destino válido. */
export type ResolveTaskResult =
  | { ok: true; instance: WorkflowInstance | undefined; stalled: boolean }
  | { ok: false; reason: "not-found" };

/**
 * Aplica o resultado de uma tarefa, avalia a regra correspondente e determina
 * a próxima etapa. Execuções lineares continuam com o comportamento da Build
 * 012 (resultado "concluído" → próxima etapa na sequência).
 */
export function resolveTask(
  instanceId: string,
  taskId: string,
  input: ResolveTaskInput,
): ResolveTaskResult {
  ensureHydrated();
  const instance = state[instanceId];
  const task = instance?.tasks.find((t) => t.id === taskId);
  if (!instance || !task) return { ok: false, reason: "not-found" };

  const iso = new Date().toISOString();
  const kind = taskKind(task);
  const option = input.optionId
    ? task.options?.find((o) => o.id === input.optionId)
    : undefined;
  const outcome = input.outcome;
  const justification = input.justification?.trim() ?? "";
  const events: RuntimeEvent[] = [];

  const backwards = outcome === "rejeitado" || outcome === "necessita correção";
  const targetStepId = option
    ? option.nextStepId
    : backwards
      ? (task.nextByOutcome?.[outcome] ?? task.correctionStepId ?? "")
      : (task.nextByOutcome?.[outcome] ?? "");

  let tasks = instance.tasks.map((t) =>
    t.id === taskId
      ? {
          ...t,
          state: "concluída" as TaskState,
          completedAt: iso,
          outcome,
          ...(justification ? { justification } : {}),
          ...(option ? { decisionLabel: option.label } : {}),
          ...(kind === "aprovação"
            ? {
                approvalState: (outcome === "aprovado"
                  ? "aprovada"
                  : outcome === "rejeitado"
                    ? "rejeitada"
                    : "pendente") as ApprovalState,
              }
            : {}),
          notes: input.note?.trim() ? input.note.trim() : t.notes,
          correctionRequested: false,
          ...(t.blockedReason ? { blockedReason: "" } : {}),
        }
      : t,
  );

  if (kind === "aprovação") {
    events.push(
      event(
        outcome === "aprovado"
          ? "Aprovação concedida"
          : outcome === "rejeitado"
            ? "Aprovação rejeitada"
            : "Correção solicitada",
        `${task.name} · aprovador ${task.approver || task.owner || "—"}${
          justification ? ` — ${justification}` : ""
        }`,
      ),
    );
  } else if (kind === "decisão") {
    events.push(
      event(
        "Decisão tomada",
        `${task.name} · opção "${option?.label ?? "—"}"${
          task.question ? ` · critério: ${task.question}` : ""
        }`,
      ),
    );
  } else {
    events.push(
      event("Tarefa concluída", `${task.name} · resultado ${outcome}`),
    );
  }

  events.push(
    event(
      "Regra avaliada",
      `${task.name} → ${outcome}${
        task.condition ? ` · condição: ${task.condition}` : ""
      }`,
    ),
  );

  const target = targetStepId
    ? tasks.find((t) => t.stepId === targetStepId)
    : undefined;

  if (target) {
    if (backwards) {
      tasks = tasks.map((t) => {
        if (t.id !== target.id) return t;
        const { completedAt: _c, outcome: _o, ...rest } = t;
        return {
          ...rest,
          ...startPatch(t, iso),
          correctionRequested: true,
          correctionReason: justification,
        };
      });
      events.push(
        event("Correção solicitada", `${target.name} — ${justification || "sem motivo"}`),
      );
      // A aprovação volta a ficar pendente para nova avaliação após a correção.
      tasks = tasks.map((t) => {
        if (t.id !== taskId) return t;
        const { completedAt: _c, ...rest } = t;
        return {
          ...rest,
          approvalState: "pendente" as ApprovalState,
          state: "pendente" as TaskState,
        };
      });

    } else {
      tasks = tasks.map((t) =>
        t.id === target.id && t.state === "pendente"
          ? { ...t, ...startPatch(t, iso) }
          : t,
      );
      events.push(event("Tarefa iniciada", target.name));
    }

    events.push(
      event(
        "Transição executada",
        `${task.name} → ${outcome} → ${target.name}`,
      ),
    );
  } else if (isEndTarget(targetStepId)) {
    // Build 016 — encerramento explícito: fim intencional, não é falta de regra.
    events.push(
      event(
        "Caminho encerrado",
        `${task.name} → ${outcome} → encerramento previsto do workflow.`,
      ),
    );
  } else if (!backwards) {
    events.push(
      event("Transição executada", `${task.name} → ${outcome} → fim do caminho`),
    );
    events.push(
      event(
        "Execução requer atenção",
        `O resultado "${outcome}" de "${task.name}" não possui destino configurado — a execução não avançará automaticamente.`,
      ),
    );
  }

  // C2 — sem destino resolvido, a execução não avança por ordem.
  // Build 016 — o encerramento explícito não é uma parada anômala.
  const stalled = !target && !backwards && !isEndTarget(targetStepId);


  // Decisão: os caminhos não escolhidos saem da execução.
  if (kind === "decisão" && option) {
    const abandoned = (task.options ?? [])
      .filter((o) => o.id !== option.id && o.nextStepId && o.nextStepId !== option.nextStepId)
      .map((o) => o.nextStepId);
    if (abandoned.length > 0) {
      const affected = tasks.filter(
        (t) => abandoned.includes(t.stepId) && t.state === "pendente",
      );
      if (affected.length > 0) {
        tasks = tasks.map((t) =>
          affected.some((a) => a.id === t.id)
            ? { ...t, state: "cancelada" as TaskState, outcome: "não aplicável" as TaskOutcome }
            : t,
        );
        events.push(
          event(
            "Caminho alterado",
            `Caminho não seguido: ${affected.map((t) => t.name).join(", ")}.`,
          ),
        );
      }
    }
  }

  // Nenhuma tarefa em andamento? Retoma a próxima pendente da sequência.
  const result = commit(instanceId, tasks, events);
  if (!result || result.state === "concluída") {
    return { ok: true, instance: result, stalled };
  }
  const running = result.tasks.some((t) => t.state === "em andamento");
  if (!running && !stalled) {
    const pending = result.tasks
      .filter((t) => t.state === "pendente")
      .sort((a, b) => a.order - b.order)[0];
    if (pending) {
      return {
        ok: true,
        instance: patchTask(
          instanceId,
          pending.id,
          startPatch(pending, new Date().toISOString()),
          event("Tarefa iniciada", pending.name),
        ),
        stalled,
      };
    }
  }
  return { ok: true, instance: result, stalled };
}

/** Solicitação explícita de correção a partir de uma aprovação. */
export function requestCorrection(
  instanceId: string,
  taskId: string,
  reason: string,
) {
  return resolveTask(instanceId, taskId, {
    outcome: "necessita correção",
    justification: reason,
  });
}



export function blockTask(instanceId: string, taskId: string, reason: string) {
  const task = state[instanceId]?.tasks.find((t) => t.id === taskId);
  if (!task) return undefined;
  return patchTask(
    instanceId,
    taskId,
    { state: "bloqueada", blockedReason: reason },
    event("Tarefa bloqueada", `${task.name} — ${reason}`),
  );
}

export function updateTaskNotes(instanceId: string, taskId: string, notes: string) {
  return patchTask(instanceId, taskId, { notes });
}

export function pauseInstance(instanceId: string) {
  return write(
    instanceId,
    { state: "pausada" },
    [event("Execução pausada", "A execução foi pausada pelo responsável.")],
  );
}

export function resumeInstance(instanceId: string) {
  return write(
    instanceId,
    { state: "em execução" },
    [event("Execução retomada", "A execução voltou a correr.")],
  );
}

export function cancelInstance(instanceId: string, reason: string) {
  return write(
    instanceId,
    { state: "cancelada", cancelReason: reason, completedAt: new Date().toISOString() },
    [event("Execução cancelada", reason)],
  );
}

/* ------------------------------------------------------------------ */
/* Build 014 — monitoramento temporal                                  */
/* ------------------------------------------------------------------ */

/**
 * Varre as instâncias em execução, marca vencimentos e registra ocorrências.
 * Idempotente: os marcadores `slaWarnedAt` / `slaOverdueAt` impedem eventos
 * duplicados. O atraso é uma CONDIÇÃO — o estado operacional não muda.
 */
export function syncSlaState(now = Date.now()): void {
  ensureHydrated();
  let changed = false;
  const next: Record<string, WorkflowInstance> = { ...state };

  for (const instance of Object.values(state)) {
    if (instance.state === "concluída" || instance.state === "cancelada") continue;
    const events: RuntimeEvent[] = [];
    let occurrences = [...(instance.slaOccurrences ?? [])];
    let tasks = instance.tasks;
    let touched = false;

    // Tarefas abertas com prazo definido.
    tasks = tasks.map((task) => {
      if (!isOpen(task) || !task.dueAt) return task;
      const sla = taskSla(task, now);
      if (sla.status === "vencido" && !task.slaOverdueAt) {
        touched = true;
        events.push(
          event(
            "Prazo da tarefa vencido",
            `${task.name} · limite ${formatDateTime(task.dueAt)} · ${formatDuration(sla.overdueMs)} de atraso.`,
          ),
        );
        occurrences.push(
          occurrence(
            "tarefa",
            task.id,
            task.name,
            specLabelOf(taskSpec(task)),
            task.dueAt,
            sla.overdueMs,
            task.owner || instance.owner,
          ),
        );
        return { ...task, slaOverdueAt: new Date(now).toISOString() };
      }
      if (sla.status === "próximo do vencimento" && !task.slaWarnedAt) {
        touched = true;
        events.push(
          event(
            "Prazo em risco",
            `${task.name} · ${formatRemaining(sla)} até ${formatDateTime(task.dueAt)}.`,
          ),
        );
        return { ...task, slaWarnedAt: new Date(now).toISOString() };
      }
      return task;
    });

    // SLA da instância.
    let patch: Partial<WorkflowInstance> = {};
    if (instance.slaDueAt) {
      const sla = instanceSla(instance, now);
      if (sla.status === "vencido" && !instance.slaOverdueAt) {
        touched = true;
        patch = { ...patch, slaOverdueAt: new Date(now).toISOString() };
        events.push(
          event(
            "SLA do workflow vencido",
            `Limite ${formatDateTime(instance.slaDueAt)} · ${formatDuration(sla.overdueMs)} de atraso.`,
          ),
        );
        occurrences.push(
          occurrence(
            "workflow",
            instance.id,
            instance.name,
            specLabelOf(instanceSpec(instance)),
            instance.slaDueAt,
            sla.overdueMs,
            instance.owner,
          ),
        );
      } else if (sla.status === "próximo do vencimento" && !instance.slaWarnedAt) {
        touched = true;
        patch = { ...patch, slaWarnedAt: new Date(now).toISOString() };
        events.push(
          event(
            "SLA em risco",
            `${formatRemaining(sla)} até ${formatDateTime(instance.slaDueAt)}.`,
          ),
        );
      }
    }

    if (!touched) continue;
    changed = true;
    next[instance.id] = {
      ...instance,
      ...patch,
      tasks,
      slaOccurrences: occurrences,
      events: [...instance.events, ...events],
    };
  }

  if (!changed) return;
  state = next;
  persist();
  emit();
}

/** Mantém o monitoramento temporal vivo enquanto a tela estiver aberta. */
export function useSlaMonitor(intervalMs = 60_000): void {
  useEffect(() => {
    syncSlaState();
    const id = window.setInterval(() => syncSlaState(), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
}

/* ------------------------------------------------------------------ */
/* Agregações temporais (Runtime Center e Home)                        */
/* ------------------------------------------------------------------ */

export interface SlaSummary {
  onTime: number;
  atRisk: number;
  overdue: number;
  finishedLate: number;
  withoutSla: number;
}

export function slaSummary(instances: WorkflowInstance[], now?: number): SlaSummary {
  const summary: SlaSummary = {
    onTime: 0,
    atRisk: 0,
    overdue: 0,
    finishedLate: 0,
    withoutSla: 0,
  };
  for (const instance of instances) {
    const status = instanceSlaStatus(instance, now);
    if (status === "não aplicável") summary.withoutSla += 1;
    else if (status === "vencido") summary.overdue += 1;
    else if (status === "próximo do vencimento") summary.atRisk += 1;
    else if (status === "concluído fora do prazo") summary.finishedLate += 1;
    else summary.onTime += 1;
  }
  return summary;
}

export function matchesSlaFilter(
  instance: WorkflowInstance,
  filter: SlaFilterId,
  now?: number,
): boolean {
  if (filter === "sla-todos") return true;
  return SLA_FILTER_STATUSES[filter].includes(instanceSlaStatus(instance, now));
}

/** Tarefas atrasadas de todas as instâncias — usado pelos widgets da Home. */
export function allOverdueTasks(
  instances: WorkflowInstance[],
  now?: number,
): { instance: WorkflowInstance; task: RuntimeTask }[] {
  return instances
    .filter((i) => i.state !== "concluída" && i.state !== "cancelada")
    .flatMap((instance) =>
      overdueTasks(instance, now).map((task) => ({ instance, task })),
    )
    .sort(
      (a, b) =>
        new Date(a.task.dueAt ?? 0).getTime() - new Date(b.task.dueAt ?? 0).getTime(),
    );
}

export function allSlaOccurrences(
  instances: WorkflowInstance[],
): { instance: WorkflowInstance; occurrence: SlaOccurrence }[] {
  return instances
    .flatMap((instance) =>
      (instance.slaOccurrences ?? []).map((occurrence) => ({ instance, occurrence })),
    )
    .sort((a, b) => b.occurrence.at.localeCompare(a.occurrence.at));
}

/* ------------------------------------------------------------------ */
/* Build 016 — bloqueio de execução de definições inválidas            */
/* ------------------------------------------------------------------ */

/**
 * Porta de entrada do Runtime: uma definição com erros de validação NUNCA
 * gera instância. Não substitui `startInstanceFromWorkflow` — apenas a protege.
 *
 * Build H4-E1: workflows arquivados também são bloqueados, com motivo distinto
 * para a UI poder exibir mensagem específica.
 */
export function tryStartInstanceFromWorkflow(
  doc: WorkflowDoc,
  ctx: ValidationContext = {},
):
  | { ok: true; instance: WorkflowInstance; validation: WorkflowValidation }
  | { ok: false; reason: "arquivado" }
  | { ok: false; reason: "no-published-version" }
  | { ok: false; reason: "validation"; validation: WorkflowValidation } {
  if (doc.status === "arquivado") {
    return { ok: false, reason: "arquivado" };
  }
  /* Build 017 — versão arquivada não origina novas execuções. */
  if (
    currentWorkflowVersion(doc)?.status === "arquivada" &&
    !publishedWorkflowVersion(doc)
  ) {
    return { ok: false, reason: "arquivado" };
  }
  /* Build 017.1 — sem versão publicada não há o que executar (nunca o rascunho). */
  if (!publishedWorkflowVersion(doc)) {
    return { ok: false, reason: "no-published-version" };
  }
  const validation = validateWorkflow(doc, ctx);
  recordWorkflowValidation(
    doc.id,
    {
      status: validation.status,
      errors: validation.errors.length,
      warnings: validation.warnings.length,
    },
    { silent: true },
  );
  if (!validation.canStart) {
    appendWorkflowEvent(
      doc.id,
      "Execução bloqueada por validação",
      `${validation.errors.length} erro(s) impedem o início de novas execuções.`,
    );
    return { ok: false, reason: "validation", validation };
  }
  return { ok: true, instance: startInstanceFromWorkflow(doc), validation };
}
