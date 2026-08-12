/**
 * Build 012 — armazenamento local das instâncias de execução (Workflow Runtime).
 *
 * Mesmo padrão dos stores existentes (knowledge / pop / process / bpm /
 * relationship / lifecycle / governance / workflow): persistência temporária em
 * localStorage com `useSyncExternalStore`. Store ADICIONAL — nada existente é
 * alterado. A instância referencia a definição de Workflow, nunca a duplica.
 */

import { useSyncExternalStore } from "react";
import type { WorkflowDoc } from "@/lib/workflow-store";
import type { ResponsibilityRole } from "@/config/governance-model";
import type { ProcessStepTypeId } from "@/config/process-model";
import {
  OPEN_TASK_STATES,
  type InstanceState,
  type TaskState,
} from "@/config/runtime-model";

const STORAGE_KEY = "process-platform:runtime:v1";

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
}

export interface RuntimeEvent {
  id: string;
  at: string;
  title: string;
  detail: string;
  user: string;
}

export interface WorkflowInstance {
  id: string;
  code: string;
  name: string;
  workflowId: string;
  workflowName: string;
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

/** Cria a instância de execução a partir de uma definição de Workflow. */
export function startInstanceFromWorkflow(doc: WorkflowDoc): WorkflowInstance {
  ensureHydrated();
  const now = new Date();
  const iso = now.toISOString();
  const id = `exe-${now.getTime().toString(36)}`;

  const tasks: RuntimeTask[] = doc.steps.map((step, index) => ({
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
  }));

  const events: RuntimeEvent[] = [
    event("Execução iniciada", `${doc.name} — ${doc.processName}.`),
    event("Tarefas criadas", `${tasks.length} tarefas geradas a partir das etapas.`),
  ];
  const first = tasks[0];
  if (first) {
    events.push(event("Tarefa iniciada", `${first.name} · ${first.owner || "sem responsável"}.`));
  }

  const instance: WorkflowInstance = {
    id,
    code: nextCode(),
    name: `Execução · ${doc.processName}`,
    workflowId: doc.id,
    workflowName: doc.name,
    processId: doc.processId,
    processName: doc.processName,
    version: doc.version,
    state: "em execução",
    owner: doc.owner,
    area: doc.area,
    startedAt: iso,
    updatedAt: iso,
    tasks,
    events,
  };

  state = { ...state, [id]: instance };
  persist();
  emit();
  return instance;
}

function maybeComplete(instance: WorkflowInstance): WorkflowInstance {
  const active = instance.tasks.filter((t) => t.state !== "cancelada");
  const allDone = active.length > 0 && active.every((t) => t.state === "concluída");
  if (!allDone || instance.state === "concluída") return instance;
  const iso = new Date().toISOString();
  return {
    ...instance,
    state: "concluída",
    completedAt: iso,
    result: "Todas as tarefas foram concluídas.",
    events: [
      ...instance.events,
      event("Execução concluída", "Todas as tarefas necessárias foram concluídas."),
    ],
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
  next = maybeComplete(next);
  state = { ...state, [instanceId]: next };
  persist();
  emit();
  return next;
}

export function startTask(instanceId: string, taskId: string) {
  const task = state[instanceId]?.tasks.find((t) => t.id === taskId);
  if (!task) return undefined;
  return patchTask(
    instanceId,
    taskId,
    { state: "em andamento", startedAt: new Date().toISOString() },
    event("Tarefa iniciada", task.name),
  );
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
      { state: "em andamento", startedAt: new Date().toISOString() },
      event("Tarefa iniciada", pending.name),
    );
  }
  return next;
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
