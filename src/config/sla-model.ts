/**
 * Build 014 — SLA & Time Engine.
 *
 * Vocabulário TEMPORAL do Workflow Runtime. Camada ADICIONAL: não substitui o
 * estado operacional da instância/tarefa (Build 012), as regras de execução
 * (Build 013), o Lifecycle Engine nem o Governance Engine. Aqui ficam apenas
 * os termos de prazo, SLA e atraso.
 */

/* ------------------------------------------------------------------ */
/* Unidade de tempo                                                    */
/* ------------------------------------------------------------------ */

export const TIME_UNITS = ["horas", "dias"] as const;
export type TimeUnit = (typeof TIME_UNITS)[number];

export const HOUR_MS = 3_600_000;
export const DAY_MS = 86_400_000;

export function unitMs(unit: TimeUnit): number {
  return unit === "dias" ? DAY_MS : HOUR_MS;
}

/** Prazo declarado: quantidade + unidade. */
export interface SlaSpec {
  amount: number;
  unit: TimeUnit;
}

export function specMs(spec: SlaSpec): number {
  return Math.max(0, spec.amount) * unitMs(spec.unit);
}

export function specLabel(spec: SlaSpec | undefined): string {
  if (!spec || !spec.amount) return "Sem SLA definido";
  return `${spec.amount} ${spec.unit}`;
}

/* ------------------------------------------------------------------ */
/* Status do SLA                                                       */
/* ------------------------------------------------------------------ */

export const SLA_STATUSES = [
  "dentro do prazo",
  "próximo do vencimento",
  "vencido",
  "concluído dentro do prazo",
  "concluído fora do prazo",
  "não aplicável",
] as const;

export type SlaStatus = (typeof SLA_STATUSES)[number];

export const SLA_STATUS_TONE: Record<SlaStatus, string> = {
  "dentro do prazo": "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  "próximo do vencimento": "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  vencido: "bg-destructive/10 text-destructive",
  "concluído dentro do prazo":
    "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  "concluído fora do prazo": "bg-destructive/10 text-destructive",
  "não aplicável": "bg-muted text-muted-foreground",
};

/** Percentual consumido a partir do qual o prazo entra em risco. */
export const SLA_WARNING_RATIO = 0.8;

/** Condição temporal da tarefa — nunca substitui o estado operacional. */
export const OVERDUE_LABEL = "atrasada";

export const NO_SLA_LABEL = "Sem SLA definido";

/* ------------------------------------------------------------------ */
/* Runtime Center — indicadores e filtros temporais                    */
/* ------------------------------------------------------------------ */

export const SLA_CENTER_STATS = [
  { id: "sla-no-prazo", label: "Dentro do SLA" },
  { id: "sla-risco", label: "Próximos do vencimento" },
  { id: "sla-vencido", label: "SLA vencido" },
  { id: "sla-fora", label: "Concluídos fora do SLA" },
] as const;

export const SLA_FILTERS = [
  { id: "sla-todos", label: "Todos" },
  { id: "sla-no-prazo", label: "No prazo" },
  { id: "sla-risco", label: "Próximos do vencimento" },
  { id: "sla-vencido", label: "Atrasados" },
  { id: "sla-fora", label: "Concluídos fora do prazo" },
] as const;

export type SlaFilterId = (typeof SLA_FILTERS)[number]["id"];

/** Filtro temporal → status considerados. */
export const SLA_FILTER_STATUSES: Record<SlaFilterId, SlaStatus[]> = {
  "sla-todos": [...SLA_STATUSES],
  "sla-no-prazo": ["dentro do prazo", "concluído dentro do prazo"],
  "sla-risco": ["próximo do vencimento"],
  "sla-vencido": ["vencido"],
  "sla-fora": ["concluído fora do prazo"],
};

/* ------------------------------------------------------------------ */
/* Ocorrências de SLA                                                  */
/* ------------------------------------------------------------------ */

export const SLA_OCCURRENCE_TYPES = ["tarefa", "workflow"] as const;
export type SlaOccurrenceType = (typeof SLA_OCCURRENCE_TYPES)[number];

export const SLA_OCCURRENCE_STATUSES = ["aberta", "encerrada"] as const;
export type SlaOccurrenceStatus = (typeof SLA_OCCURRENCE_STATUSES)[number];

export const SLA_OCCURRENCE_STATUS_TONE: Record<SlaOccurrenceStatus, string> = {
  aberta: "bg-destructive/10 text-destructive",
  encerrada: "bg-muted text-muted-foreground",
};

/**
 * Comportamento do relógio durante a pausa — decisão explícita desta Build.
 * Calendário comercial e suspensão automática ficam para builds futuras.
 */
export const PAUSE_CLOCK_NOTE =
  "O relógio do SLA continua contando durante a pausa.";
