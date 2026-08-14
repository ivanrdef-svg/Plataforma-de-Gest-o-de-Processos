/**
 * Build 018 — Publication Readiness.
 *
 * Camada DERIVADA: consome o resultado da validação existente (Build 016) e o
 * modelo de versões (Build 017) para responder "esta versão está pronta para
 * ser publicada?". Não implementa nenhuma regra nova de validação e não
 * persiste um segundo ciclo de vida.
 */

import {
  READINESS_HINT,
  type ReadinessState,
} from "@/config/publication-model";
import { stepKind } from "@/lib/execution-rules";
import { validateWorkflow, type WorkflowValidation } from "@/lib/workflow-validation";
import {
  currentWorkflowVersion,
  type WorkflowDoc,
  type WorkflowVersion,
} from "@/lib/workflow-store";

export type ChecklistStatus = "ok" | "erro" | "atenção" | "neutro";

export interface ChecklistItem {
  id: string;
  label: string;
  status: ChecklistStatus;
  detail: string;
  /** Aba do workspace onde o item é corrigido/consultado. */
  tab: "etapas" | "regras" | "resumo" | "validacao" | "versoes";
}

export interface PublicationReadiness {
  state: ReadinessState;
  hint: string;
  errors: number;
  warnings: number;
  canPublish: boolean;
  checklist: ChecklistItem[];
  validation: WorkflowValidation;
  version: WorkflowVersion | undefined;
}

function fromIssues(
  validation: WorkflowValidation,
  source: "estrutura" | "regras" | "sla",
): { errors: number; warnings: number } {
  return {
    errors: validation.errors.filter((i) => i.source === source).length,
    warnings: validation.warnings.filter((i) => i.source === source).length,
  };
}

function statusOf(counts: { errors: number; warnings: number }): ChecklistStatus {
  if (counts.errors > 0) return "erro";
  if (counts.warnings > 0) return "atenção";
  return "ok";
}

function detailOf(counts: { errors: number; warnings: number }, okLabel: string) {
  if (counts.errors > 0)
    return `${counts.errors} erro(s) encontrado(s)${counts.warnings ? ` e ${counts.warnings} aviso(s)` : ""}.`;
  if (counts.warnings > 0) return `${counts.warnings} aviso(s) encontrado(s).`;
  return okLabel;
}

/**
 * Prontidão da versão em edição. `validation` pode ser injetada para evitar
 * recalcular — mas o padrão é sempre recalcular sobre o estado atual.
 */
export function publicationReadiness(
  doc: WorkflowDoc,
  validation: WorkflowValidation = validateWorkflow(doc),
): PublicationReadiness {
  const errors = validation.errors.length;
  const warnings = validation.warnings.length;
  const state: ReadinessState =
    errors > 0 ? "não pronta" : warnings > 0 ? "pronta com avisos" : "pronta";

  const structure = fromIssues(validation, "estrutura");
  const rules = fromIssues(validation, "regras");
  const sla = fromIssues(validation, "sla");

  /* Build 018.1 — os itens de aprovação/decisão NÃO recalculam a regra:
     eles apenas filtram as issues já produzidas por validateWorkflow(),
     usando a etapa (location) como chave estável. */
  const approvals = doc.steps.filter((s) => stepKind(s) === "aprovação");
  const decisions = doc.steps.filter((s) => stepKind(s) === "decisão");

  const byLocation = (names: string[]) => {
    const set = new Set(names.filter(Boolean));
    const match = (i: (typeof validation.errors)[number]) =>
      i.source === "regras" && set.has(i.location);
    return {
      errors: validation.errors.filter(match).length,
      warnings: validation.warnings.filter(match).length,
    };
  };

  const approvalIssues = byLocation(approvals.map((s) => s.name));
  const decisionIssues = byLocation(decisions.map((s) => s.name));


  const version = currentWorkflowVersion(doc);

  const checklist: ChecklistItem[] = [
    {
      id: "estrutura",
      label: "Estrutura válida",
      status: statusOf(structure),
      detail: detailOf(
        structure,
        `${doc.steps.length} etapa(s) e ${doc.participants.length} participante(s) consistentes.`,
      ),
      tab: "etapas",
    },
    {
      id: "regras",
      label: "Regras de execução válidas",
      status: statusOf(rules),
      detail: detailOf(rules, "Resultados e transições configurados."),
      tab: "regras",
    },
    {
      id: "sla",
      label: "SLA válido",
      status: statusOf(sla),
      detail: detailOf(sla, "Prazos configurados sem inconsistências."),
      tab: "regras",
    },
    {
      id: "aprovacoes",
      label: "Aprovações configuradas",
      status: approvals.length === 0 ? "neutro" : statusOf(approvalIssues),
      detail:
        approvals.length === 0
          ? "Nenhuma etapa de aprovação nesta definição."
          : detailOf(
              approvalIssues,
              `${approvals.length} aprovação(ões) sem pendências de validação.`,
            ),
      tab: "regras",
    },
    {
      id: "decisoes",
      label: "Decisões configuradas",
      status: decisions.length === 0 ? "neutro" : statusOf(decisionIssues),
      detail:
        decisions.length === 0
          ? "Nenhuma etapa de decisão nesta definição."
          : detailOf(
              decisionIssues,
              `${decisions.length} decisão(ões) sem pendências de validação.`,
            ),
      tab: "regras",
    },

    {
      id: "referencias",
      label: "Referências válidas",
      status: doc.processId ? "ok" : "erro",
      detail: doc.processId
        ? `Processo de origem: ${doc.processName || "—"}.`
        : "A definição não referencia um processo modelado.",
      tab: "resumo",
    },
    {
      id: "versao",
      label: "Versão identificada",
      status: version ? (version.status === "rascunho" ? "ok" : "atenção") : "erro",
      detail: version
        ? `Versão ${version.number} · ${version.status}.`
        : "Nenhuma versão registrada.",
      tab: "versoes",
    },
  ];

  return {
    state,
    hint: READINESS_HINT[state],
    errors,
    warnings,
    canPublish: validation.canPublish,
    checklist,
    validation,
    version,
  };
}
