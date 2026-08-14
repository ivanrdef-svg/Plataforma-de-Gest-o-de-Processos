/**
 * Build 016 — Workflow Validation & Publication Control.
 *
 * Fonte única de verdade da validação de uma definição de Workflow.
 * Este módulo NÃO reimplementa regras: ele COMPÕE os validadores já
 * existentes (`validateExecutionRules` e `validateSlaRules`) e acrescenta
 * apenas as verificações estruturais que ainda não existiam.
 *
 * A validação é uma dimensão independente do Lifecycle Engine.
 */

import { validateExecutionRules, type RuleIssue } from "@/lib/execution-rules";
import { validateSlaRules } from "@/lib/sla";
import type { WorkflowDoc } from "@/lib/workflow-store";

export type ValidationStatus = "válido" | "válido com avisos" | "inválido";

export const VALIDATION_TONE: Record<ValidationStatus, string> = {
  válido: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  "válido com avisos": "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  inválido: "bg-destructive/10 text-destructive",
};

export interface ValidationIssue {
  id: string;
  severity: "erro" | "atenção";
  /** Título curto e operacional. */
  title: string;
  /** Descrição legível do problema. */
  description: string;
  /** Onde está: etapa ou o próprio workflow. */
  location: string;
  /** O que acontece se não for corrigido. */
  impact: string;
  /** Ação recomendada. */
  action: string;
  /** Aba do workspace onde a correção é feita. */
  tab: "etapas" | "regras" | "resumo";
  /** Build 018 — origem do issue, usada apenas para agrupar o checklist. */
  source: "estrutura" | "regras" | "sla";
}

export interface WorkflowValidation {
  status: ValidationStatus;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  /** Informações neutras (não bloqueiam nada). */
  infos: string[];
  canPublish: boolean;
  canStart: boolean;
  summary: string;
}

export interface ValidationContext {
  /** false quando o processo de origem não existe mais. */
  processExists?: boolean | undefined;
}

/* ------------------------------------------------------------------ */
/* Enriquecimento dos issues já existentes                             */
/* ------------------------------------------------------------------ */

function titleOf(message: string): string {
  const first = message.split(/[.:—]/)[0]?.trim() ?? message;
  return first.length > 70 ? `${first.slice(0, 67)}…` : first;
}

function enrich(
  issue: RuleIssue,
  tab: ValidationIssue["tab"],
  source: ValidationIssue["source"],
): ValidationIssue {
  const isError = issue.severity === "erro";
  return {
    id: issue.id,
    severity: issue.severity,
    title: titleOf(issue.message),
    description: issue.message,
    location: issue.step || "Workflow",
    impact: isError
      ? "Impede a publicação e o início de novas execuções."
      : "Não bloqueia a publicação, mas reduz a confiabilidade da execução.",
    action: isError
      ? "Ajuste a configuração da etapa indicada e valide novamente."
      : "Revise quando possível para tornar a definição mais completa.",
    tab,
    source,
  };
}

/* ------------------------------------------------------------------ */
/* Verificações estruturais (não existiam antes)                       */
/* ------------------------------------------------------------------ */

function structuralIssues(
  doc: WorkflowDoc,
  ctx: ValidationContext,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const push = (
    id: string,
    severity: "erro" | "atenção",
    title: string,
    description: string,
    location: string,
    impact: string,
    action: string,
    tab: ValidationIssue["tab"],
  ) =>
    issues.push({
      id,
      severity,
      title,
      description,
      location,
      impact,
      action,
      tab,
      source: "estrutura",
    });

  if (doc.steps.length === 0) {
    push(
      `${doc.id}-sem-etapas`,
      "erro",
      "Workflow sem etapas executáveis",
      "A definição não possui nenhuma etapa para executar.",
      doc.name,
      "Nenhuma tarefa seria criada na execução.",
      "Reimporte as etapas do processo de origem.",
      "etapas",
    );
  }

  if (!doc.processId) {
    push(
      `${doc.id}-sem-processo`,
      "erro",
      "Processo de origem ausente",
      "A definição não referencia um processo modelado.",
      doc.name,
      "A execução perde a rastreabilidade com o processo.",
      "Vincule o workflow a um processo existente.",
      "resumo",
    );
  } else if (ctx.processExists === false) {
    push(
      `${doc.id}-processo-inexistente`,
      "erro",
      "Processo de origem inexistente",
      `O processo "${doc.processName}" referenciado não existe mais.`,
      doc.name,
      "A execução seria criada sem origem válida.",
      "Revincule o workflow a um processo existente.",
      "resumo",
    );
  }

  if (!doc.owner.trim()) {
    push(
      `${doc.id}-sem-responsavel`,
      "erro",
      "Workflow sem responsável",
      "Nenhum responsável de governança está definido para a definição.",
      doc.name,
      "Não há a quem atribuir a responsabilidade pela execução.",
      "Informe o responsável no painel de propriedades.",
      "resumo",
    );
  }

  doc.steps.forEach((step) => {
    if (!step.name.trim()) {
      push(
        `${step.id}-sem-nome`,
        "erro",
        "Etapa sem identificação",
        "Existe uma etapa sem nome na definição.",
        "Etapa sem nome",
        "A tarefa nasceria sem identificação na execução.",
        "Informe o nome da etapa.",
        "etapas",
      );
    }
    if (!step.processStepId) {
      push(
        `${step.id}-sem-origem`,
        "erro",
        "Etapa sem origem no processo",
        `A etapa "${step.name || "sem nome"}" não referencia uma etapa do processo modelado.`,
        step.name || "Etapa sem nome",
        "A rastreabilidade Processo → BPM → Workflow fica quebrada.",
        "Reimporte as etapas do processo de origem.",
        "etapas",
      );
    }
    if (!step.owner.trim()) {
      push(
        `${step.id}-sem-executor`,
        "atenção",
        "Etapa sem responsável",
        `A etapa "${step.name || "sem nome"}" não tem responsável atribuído.`,
        step.name || "Etapa sem nome",
        "A tarefa nasce sem dono definido.",
        "Atribua um responsável à etapa.",
        "etapas",
      );
    }
    if (!step.description.trim()) {
      push(
        `${step.id}-sem-descricao`,
        "atenção",
        "Etapa sem descrição",
        `A etapa "${step.name || "sem nome"}" não descreve o que deve ser feito.`,
        step.name || "Etapa sem nome",
        "Quem executa recebe pouca orientação.",
        "Descreva a etapa.",
        "etapas",
      );
    }
  });

  if (doc.participants.length === 0 && doc.steps.length > 0) {
    push(
      `${doc.id}-sem-participantes`,
      "atenção",
      "Workflow sem participantes",
      "Nenhum participante foi associado às etapas executáveis.",
      doc.name,
      "A distribuição das tarefas fica implícita.",
      "Associe participantes na aba Participantes.",
      "resumo",
    );
  }

  return issues;
}

/* ------------------------------------------------------------------ */
/* Composição                                                          */
/* ------------------------------------------------------------------ */

export function validateWorkflow(
  doc: WorkflowDoc,
  ctx: ValidationContext = {},
): WorkflowValidation {
  const all: ValidationIssue[] = [
    ...structuralIssues(doc, ctx),
    ...validateExecutionRules(doc).map((i) => enrich(i, "regras", "regras")),
    ...validateSlaRules(doc).map((i) => enrich(i, "regras", "sla")),
  ];

  const errors = all.filter((i) => i.severity === "erro");
  const warnings = all.filter((i) => i.severity === "atenção");

  const status: ValidationStatus =
    errors.length > 0 ? "inválido" : warnings.length > 0 ? "válido com avisos" : "válido";

  const infos = [
    `${doc.steps.length} etapa(s) executável(is) avaliada(s).`,
    `${doc.participants.length} participante(s) associado(s).`,
  ];

  return {
    status,
    errors,
    warnings,
    infos,
    canPublish: errors.length === 0,
    canStart: errors.length === 0,
    summary:
      errors.length > 0
        ? `${errors.length} erro(s) e ${warnings.length} aviso(s).`
        : warnings.length > 0
          ? `Nenhum erro · ${warnings.length} aviso(s).`
          : "Nenhum erro e nenhum aviso.",
  };
}

/** Texto curto de prontidão usado no contexto adequado. */
export function readinessLabel(
  validation: WorkflowValidation,
  context: "publicação" | "execução",
): string {
  if (!validation.canPublish) return "Workflow inválido";
  if (validation.warnings.length > 0) return "Válido com avisos";
  return context === "publicação" ? "Pronto para publicação" : "Pronto para execução";
}
