/**
 * Build 013 — derivação e validação das regras de execução.
 *
 * Funções puras sobre a definição de Workflow já existente. As regras SEMPRE
 * derivam da definição (Process → BPM → Workflow Definition): este módulo não
 * guarda estado nem cria um motor paralelo de processos.
 */

import {
  OUTCOMES_BY_KIND,
  defaultExecutionKind,
  type ExecutionKind,
  type TaskOutcome,
} from "@/config/execution-rules";
import type { DecisionOption, WorkflowDoc, WorkflowStep } from "@/lib/workflow-store";

export function stepKind(step: WorkflowStep): ExecutionKind {
  return step.kind ?? defaultExecutionKind(step.type);
}

export function decisionOptions(step: WorkflowStep): DecisionOption[] {
  return step.decisionOptions ?? [];
}

export function stepName(doc: WorkflowDoc, stepId: string | undefined): string {
  if (!stepId) return "";
  return doc.steps.find((s) => s.id === stepId)?.name ?? "";
}

export function nextSequentialStepId(doc: WorkflowDoc, step: WorkflowStep): string {
  const index = doc.steps.findIndex((s) => s.id === step.id);
  return doc.steps[index + 1]?.id ?? "";
}

export function previousStepId(doc: WorkflowDoc, step: WorkflowStep): string {
  const index = doc.steps.findIndex((s) => s.id === step.id);
  return index > 0 ? (doc.steps[index - 1]?.id ?? "") : "";
}

/** Etapa para onde uma rejeição/correção devolve o fluxo. */
export function correctionStepId(doc: WorkflowDoc, step: WorkflowStep): string {
  return step.correctionStepId || previousStepId(doc, step);
}

export function outcomesOf(step: WorkflowStep): TaskOutcome[] {
  return OUTCOMES_BY_KIND[stepKind(step)];
}

/** Resultado → próxima etapa, considerando os padrões implícitos. */
export function resolveNextStepId(
  doc: WorkflowDoc,
  step: WorkflowStep,
  outcome: TaskOutcome,
): string {
  const explicit = step.outcomeTransitions?.[outcome];
  if (explicit) return explicit;
  if (outcome === "rejeitado" || outcome === "necessita correção") {
    return correctionStepId(doc, step);
  }
  return nextSequentialStepId(doc, step);
}

export interface StepTransition {
  outcome: TaskOutcome;
  nextStepId: string;
  nextStepName: string;
  /** true quando a transição vem do padrão e não de uma configuração explícita. */
  implicit: boolean;
}

export function transitionsOf(doc: WorkflowDoc, step: WorkflowStep): StepTransition[] {
  return outcomesOf(step).map((outcome) => {
    const explicit = step.outcomeTransitions?.[outcome] ?? "";
    const nextStepId = resolveNextStepId(doc, step, outcome);
    return {
      outcome,
      nextStepId,
      nextStepName: nextStepId ? stepName(doc, nextStepId) : "Fim da execução",
      implicit: !explicit,
    };
  });
}

/** Snapshot das regras aplicado a uma tarefa no momento em que a instância nasce. */
export interface StepRuleSnapshot {
  kind: ExecutionKind;
  approver: string;
  question: string;
  options: Array<{ id: string; label: string; nextStepId: string; note: string }>;
  nextByOutcome: Record<string, string>;
  correctionStepId: string;
  condition: string;
  conditionTargetStepId: string;
}

export function snapshotStepRules(
  doc: WorkflowDoc,
  step: WorkflowStep,
): StepRuleSnapshot {
  const nextByOutcome: Record<string, string> = {};
  for (const t of transitionsOf(doc, step)) nextByOutcome[t.outcome] = t.nextStepId;
  return {
    kind: stepKind(step),
    approver: step.approver ?? step.owner,
    question: step.decisionQuestion ?? "",
    options: decisionOptions(step).map((o) => ({
      id: o.id,
      label: o.label,
      nextStepId: o.nextStepId || nextSequentialStepId(doc, step),
      note: o.note,
    })),
    nextByOutcome,
    correctionStepId: correctionStepId(doc, step),
    condition: step.condition,
    conditionTargetStepId: step.conditionTargetStepId ?? "",
  };
}

/* ------------------------------------------------------------------ */
/* Validação de consistência                                           */
/* ------------------------------------------------------------------ */

export interface RuleIssue {
  id: string;
  severity: "erro" | "atenção";
  step: string;
  message: string;
}

export function validateExecutionRules(doc: WorkflowDoc): RuleIssue[] {
  const issues: RuleIssue[] = [];
  doc.steps.forEach((step, index) => {
    const kind = stepKind(step);

    if (kind === "aprovação" && !(step.approver ?? step.owner).trim()) {
      issues.push({
        id: `${step.id}-aprovador`,
        severity: "erro",
        step: step.name,
        message: "Aprovação sem aprovador definido.",
      });
    }

    if (kind === "aprovação" && index > 0 && !correctionStepId(doc, step)) {
      issues.push({
        id: `${step.id}-correcao`,
        severity: "atenção",
        step: step.name,
        message: "Rejeição sem etapa de correção — o fluxo não sabe para onde voltar.",
      });
    }

    if (kind === "decisão") {
      const options = decisionOptions(step);
      if (options.length < 2) {
        issues.push({
          id: `${step.id}-opcoes`,
          severity: "erro",
          step: step.name,
          message: "Decisão sem opções suficientes (mínimo de duas).",
        });
      }
      options.forEach((option) => {
        if (!option.label.trim()) {
          issues.push({
            id: `${option.id}-rotulo`,
            severity: "erro",
            step: step.name,
            message: "Opção de decisão sem rótulo.",
          });
        }
        if (!option.nextStepId && !nextSequentialStepId(doc, step)) {
          issues.push({
            id: `${option.id}-destino`,
            severity: "erro",
            step: step.name,
            message: `Opção "${option.label}" sem próxima etapa.`,
          });
        }
      });
      if (!(step.decisionQuestion ?? "").trim()) {
        issues.push({
          id: `${step.id}-pergunta`,
          severity: "atenção",
          step: step.name,
          message: "Decisão sem pergunta ou critério declarado.",
        });
      }
    }

    if (step.conditionTargetStepId && !step.condition.trim()) {
      issues.push({
        id: `${step.id}-regra-sem-condicao`,
        severity: "erro",
        step: step.name,
        message: "Regra com destino, mas sem condição.",
      });
    }
    if (step.condition.trim() && !step.conditionTargetStepId) {
      issues.push({
        id: `${step.id}-condicao-sem-destino`,
        severity: "atenção",
        step: step.name,
        message: "Condição sem destino — o fluxo segue a sequência padrão.",
      });
    }

    Object.entries(step.outcomeTransitions ?? {}).forEach(([outcome, target]) => {
      if (target && !doc.steps.some((s) => s.id === target)) {
        issues.push({
          id: `${step.id}-${outcome}-inexistente`,
          severity: "erro",
          step: step.name,
          message: `Transição "${outcome}" aponta para uma etapa inexistente.`,
        });
      }
    });
  });
  return issues;
}

/** Resumo usado pelo "Fluxo de decisão" da definição. */
export interface FlowNode {
  stepId: string;
  name: string;
  kind: ExecutionKind;
  branches: Array<{ label: string; target: string }>;
}

export function decisionFlow(doc: WorkflowDoc): FlowNode[] {
  return doc.steps.map((step) => {
    const kind = stepKind(step);
    const branches =
      kind === "decisão"
        ? decisionOptions(step).map((o) => ({
            label: o.label || "opção sem rótulo",
            target: o.nextStepId
              ? stepName(doc, o.nextStepId)
              : stepName(doc, nextSequentialStepId(doc, step)) || "Fim da execução",
          }))
        : transitionsOf(doc, step).map((t) => ({
            label: t.outcome,
            target: t.nextStepName || "Fim da execução",
          }));
    return { stepId: step.id, name: step.name, kind, branches };
  });
}

/** true quando o workflow é puramente linear (compatibilidade com a Build 012). */
export function isLinearWorkflow(doc: WorkflowDoc): boolean {
  return doc.steps.every((s) => stepKind(s) === "tarefa");
}
