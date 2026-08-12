/**
 * Build 012 — Workflow Runtime Foundation.
 *
 * Vocabulário OPERACIONAL da execução. Não substitui o Enterprise Lifecycle
 * Engine (que continua governando a definição do Workflow): aqui ficam apenas
 * os estados de uma instância em andamento e de suas tarefas.
 */

export const INSTANCE_STATES = [
  "não iniciada",
  "em execução",
  "pausada",
  "concluída",
  "cancelada",
] as const;

export type InstanceState = (typeof INSTANCE_STATES)[number];

export const INSTANCE_STATE_TONE: Record<InstanceState, string> = {
  "não iniciada": "bg-muted text-muted-foreground",
  "em execução": "bg-primary/10 text-primary",
  pausada: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  concluída: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  cancelada: "bg-destructive/10 text-destructive",
};

export const TASK_STATES = [
  "pendente",
  "em andamento",
  "concluída",
  "bloqueada",
  "cancelada",
] as const;

export type TaskState = (typeof TASK_STATES)[number];

export const TASK_STATE_TONE: Record<TaskState, string> = {
  pendente: "bg-muted text-muted-foreground",
  "em andamento": "bg-primary/10 text-primary",
  concluída: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  bloqueada: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  cancelada: "bg-destructive/10 text-destructive",
};

/** Tarefas que ainda exigem ação de alguém. */
export const OPEN_TASK_STATES: TaskState[] = ["pendente", "em andamento", "bloqueada"];

export const RUNTIME_CENTER_STATS = [
  { id: "execucao", label: "Em execução" },
  { id: "aguardando", label: "Aguardando ação" },
  { id: "concluidas", label: "Concluídas" },
  { id: "pausadas", label: "Pausadas" },
];

export const RUNTIME_FILTERS = [
  { id: "todas", label: "Todas" },
  { id: "em execução", label: "Em andamento" },
  { id: "concluída", label: "Concluídas" },
  { id: "pausada", label: "Pausadas" },
  { id: "cancelada", label: "Canceladas" },
] as const;

export type RuntimeFilterId = (typeof RUNTIME_FILTERS)[number]["id"];
