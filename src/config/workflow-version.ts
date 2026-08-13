/**
 * Build 017 — Workflow Versioning Foundation.
 *
 * Vocabulário próprio das VERSÕES de uma definição de Workflow. Dimensão
 * independente do Lifecycle Engine (Build 009) e da Validação (Build 016):
 * um Workflow tem um ciclo de vida; cada versão tem o seu próprio status.
 *
 * Nada aqui substitui os modelos existentes — apenas os complementa.
 */

export const WORKFLOW_VERSION_STATUSES = [
  "rascunho",
  "publicada",
  "arquivada",
] as const;

export type WorkflowVersionStatus = (typeof WORKFLOW_VERSION_STATUSES)[number];

/** Tons reutilizando o padrão visual do Pill já existente. */
export const VERSION_TONE: Record<WorkflowVersionStatus, string> = {
  rascunho: "bg-muted text-muted-foreground",
  publicada: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  arquivada: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
};

export const VERSION_HINT: Record<WorkflowVersionStatus, string> = {
  rascunho: "Pode ser editada e validada. Ainda não gera execuções oficiais.",
  publicada: "Versão imutável. É a base das novas execuções.",
  arquivada: "Não inicia novas execuções. Execuções existentes continuam.",
};

export function versionLabel(numberValue: number, status: WorkflowVersionStatus) {
  return `Versão ${numberValue} — ${status.charAt(0).toUpperCase()}${status.slice(1)}`;
}

/** Identificador estável de uma versão: `<workflowId>-v<n>`. */
export function versionIdOf(workflowId: string, numberValue: number) {
  return `${workflowId}-v${numberValue}`;
}

export const IMMUTABLE_VERSION_MESSAGE = "Esta versão é imutável.";
