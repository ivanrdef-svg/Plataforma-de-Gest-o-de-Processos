/**
 * Build 015 — Task Inbox & Notifications Foundation.
 *
 * Vocabulário da caixa de entrada operacional. Camada ADICIONAL: nada do
 * Workflow Runtime (Build 012), das Execution Rules (Build 013) ou do
 * SLA Engine (Build 014) é substituído. A Inbox apenas consolida, prioriza e
 * dá visibilidade ao que já existe.
 */

/* ------------------------------------------------------------------ */
/* Prioridade operacional                                              */
/* ------------------------------------------------------------------ */

export const INBOX_PRIORITIES = ["crítica", "alta", "média", "baixa"] as const;
export type InboxPriority = (typeof INBOX_PRIORITIES)[number];

export const INBOX_PRIORITY_TONE: Record<InboxPriority, string> = {
  crítica: "bg-destructive/10 text-destructive",
  alta: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  média: "bg-primary/10 text-primary",
  baixa: "bg-muted text-muted-foreground",
};

/** Ordem de exibição: quanto menor, mais no topo da lista. */
export const INBOX_PRIORITY_ORDER: Record<InboxPriority, number> = {
  crítica: 0,
  alta: 1,
  média: 2,
  baixa: 3,
};

/* ------------------------------------------------------------------ */
/* Indicadores da Inbox                                                */
/* ------------------------------------------------------------------ */

export const INBOX_STATS = [
  { id: "abertas", label: "Tarefas abertas" },
  { id: "aprovacoes", label: "Aprovações pendentes" },
  { id: "decisoes", label: "Decisões pendentes" },
  { id: "risco", label: "Próximas do vencimento" },
  { id: "atrasadas", label: "Atrasadas" },
] as const;

export type InboxStatId = (typeof INBOX_STATS)[number]["id"];

/* ------------------------------------------------------------------ */
/* Filtros da lista operacional                                        */
/* ------------------------------------------------------------------ */

export const INBOX_FILTERS = [
  { id: "todas", label: "Todas" },
  { id: "aprovacoes", label: "Aprovações" },
  { id: "decisoes", label: "Decisões" },
  { id: "atrasadas", label: "Atrasadas" },
  { id: "risco", label: "Em risco" },
  { id: "bloqueadas", label: "Bloqueadas" },
  { id: "concluidas", label: "Concluídas" },
] as const;

export type InboxFilterId = (typeof INBOX_FILTERS)[number]["id"];

/* ------------------------------------------------------------------ */
/* Notificações in-app                                                 */
/* ------------------------------------------------------------------ */

export const NOTIFICATION_TYPES = [
  "tarefa",
  "aprovação",
  "decisão",
  "correção",
  "prazo",
  "atraso",
  "execução",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_TONE: Record<NotificationType, string> = {
  tarefa: "bg-muted text-muted-foreground",
  aprovação: "bg-primary/10 text-primary",
  decisão: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  correção: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  prazo: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  atraso: "bg-destructive/10 text-destructive",
  execução: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
};

/** Quantidade máxima de notificações mantidas localmente. */
export const NOTIFICATION_LIMIT = 60;

export const INBOX_EMPTY_HINT =
  "Nada aguardando você agora. Novas tarefas aparecem aqui assim que uma execução avançar.";
