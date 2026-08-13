/**
 * Build 013 — Execution Rules & Approvals.
 *
 * Vocabulário das regras operacionais do Workflow. Camada ADICIONAL: nada do
 * Process Modeling Engine, do Lifecycle Engine, do Governance Engine ou do
 * Workflow Runtime (Build 012) é substituído. Aqui ficam apenas os termos das
 * decisões, aprovações e transições.
 */

import type { ProcessStepTypeId } from "./process-model";

/* ------------------------------------------------------------------ */
/* Natureza executável da etapa                                        */
/* ------------------------------------------------------------------ */

export const EXECUTION_KINDS = ["tarefa", "aprovação", "decisão"] as const;
export type ExecutionKind = (typeof EXECUTION_KINDS)[number];

export const EXECUTION_KIND_TONE: Record<ExecutionKind, string> = {
  tarefa: "bg-muted text-muted-foreground",
  aprovação: "bg-primary/10 text-primary",
  decisão: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
};

/** Natureza padrão derivada do tipo de etapa já existente no processo. */
export function defaultExecutionKind(type?: ProcessStepTypeId): ExecutionKind {
  if (type === "aprovacao" || type === "validacao") return "aprovação";
  if (type === "decisao") return "decisão";
  return "tarefa";
}

/* ------------------------------------------------------------------ */
/* Resultados de tarefa                                                */
/* ------------------------------------------------------------------ */

export const TASK_OUTCOMES = [
  "concluído",
  "aprovado",
  "rejeitado",
  "validado",
  "necessita correção",
  "não aplicável",
] as const;

export type TaskOutcome = (typeof TASK_OUTCOMES)[number];

export const OUTCOME_TONE: Record<TaskOutcome, string> = {
  concluído: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  aprovado: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  rejeitado: "bg-destructive/10 text-destructive",
  validado: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  "necessita correção": "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  "não aplicável": "bg-muted text-muted-foreground",
};

/** Resultados possíveis conforme a natureza da etapa. */
export const OUTCOMES_BY_KIND: Record<ExecutionKind, TaskOutcome[]> = {
  tarefa: ["concluído", "não aplicável"],
  aprovação: ["aprovado", "rejeitado", "necessita correção"],
  decisão: ["concluído"],
};

/** Resultados que exigem justificativa obrigatória. */
export const OUTCOMES_REQUIRING_JUSTIFICATION: TaskOutcome[] = [
  "rejeitado",
  "necessita correção",
];

/* ------------------------------------------------------------------ */
/* Estados de aprovação                                                */
/* ------------------------------------------------------------------ */

export const APPROVAL_STATES = [
  "pendente",
  "aprovada",
  "rejeitada",
  "cancelada",
] as const;

export type ApprovalState = (typeof APPROVAL_STATES)[number];

export const APPROVAL_STATE_TONE: Record<ApprovalState, string> = {
  pendente: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  aprovada: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  rejeitada: "bg-destructive/10 text-destructive",
  cancelada: "bg-muted text-muted-foreground",
};

/* ------------------------------------------------------------------ */
/* Tipos de regra (representação visual)                               */
/* ------------------------------------------------------------------ */

export const RULE_TYPES = [
  { id: "resultado", label: "Resultado de tarefa", tone: "bg-muted text-muted-foreground" },
  { id: "aprovacao", label: "Aprovação", tone: "bg-primary/10 text-primary" },
  { id: "rejeicao", label: "Rejeição", tone: "bg-destructive/10 text-destructive" },
  {
    id: "decisao",
    label: "Decisão",
    tone: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  },
  {
    id: "condicao",
    label: "Condição",
    tone: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  },
  {
    id: "bloqueio",
    label: "Bloqueio",
    tone: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
] as const;

export type RuleTypeId = (typeof RULE_TYPES)[number]["id"];

export function ruleType(id: RuleTypeId) {
  return RULE_TYPES.find((r) => r.id === id) ?? RULE_TYPES[0];
}

/** Opções padrão sugeridas para uma etapa de decisão. */
export const DEFAULT_DECISION_OPTIONS = [
  "Aprovado",
  "Reprovado",
  "Necessita ajuste",
];

export const DECISION_HINTS = {
  question: "Pergunta ou critério que orienta a escolha.",
  option: "Rótulo da opção apresentada a quem decide.",
  condition: "SE valor > limite",
  target: "Etapa seguida quando a condição for verdadeira.",
};

/* ------------------------------------------------------------------ */
/* Build 016 — encerramento explícito de um caminho                    */
/* ------------------------------------------------------------------ */

/**
 * Destino especial de transição: "esta opção/resultado encerra o Workflow".
 * Diferente de destino vazio, que significa apenas "seguir a sequência".
 */
export const END_OF_WORKFLOW = "__end_of_workflow__";

export const END_OF_WORKFLOW_LABEL = "Encerrar Workflow";

export function isEndTarget(target: string | undefined): boolean {
  return target === END_OF_WORKFLOW;
}
