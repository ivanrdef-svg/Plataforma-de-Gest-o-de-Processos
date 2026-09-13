/**
 * Build 014 — cálculo temporal puro.
 *
 * Todas as funções derivam de timestamps reais da execução. Nenhum contador
 * artificial: o tempo decorrido é sempre `agora - início`, e o tempo restante
 * é sempre `data limite - agora`.
 */

import { useEffect, useState } from "react";
import {
  SLA_WARNING_RATIO,
  specMs,
  type SlaSpec,
  type SlaStatus,
  type TimeUnit,
} from "@/config/sla-model";
import type { RuleIssue } from "@/lib/execution-rules";
import type { WorkflowDoc, WorkflowStep, WorkflowVersionContent } from "@/lib/workflow-store";

/* ------------------------------------------------------------------ */
/* Cálculo                                                             */
/* ------------------------------------------------------------------ */

export interface SlaComputation {
  /** false quando não há SLA definido — a plataforma não inventa prazos. */
  applicable: boolean;
  status: SlaStatus;
  totalMs: number;
  elapsedMs: number;
  remainingMs: number;
  overdueMs: number;
  /** Percentual do SLA consumido (pode passar de 100). */
  percent: number;
  dueAt?: string;
  /** Condição temporal corrente — não substitui o estado operacional. */
  late: boolean;
  finished: boolean;
}

export interface SlaInput {
  startedAt?: string | undefined;
  dueAt?: string | undefined;
  completedAt?: string | undefined;
  now?: number | undefined;
}

function ms(iso: string | undefined): number | undefined {
  if (!iso) return undefined;
  const value = new Date(iso).getTime();
  return Number.isNaN(value) ? undefined : value;
}

export function computeSla(input: SlaInput): SlaComputation {
  const now = input.now ?? Date.now();
  const start = ms(input.startedAt);
  const due = ms(input.dueAt);
  const done = ms(input.completedAt);
  const reference = done ?? now;
  const elapsedMs = start !== undefined ? Math.max(0, reference - start) : 0;

  if (due === undefined) {
    return {
      applicable: false,
      status: "não aplicável",
      totalMs: 0,
      elapsedMs,
      remainingMs: 0,
      overdueMs: 0,
      percent: 0,
      late: false,
      finished: done !== undefined,
    };
  }

  const totalMs = start !== undefined ? Math.max(0, due - start) : 0;
  const remainingMs = due - reference;
  const overdueMs = Math.max(0, reference - due);
  const percent =
    totalMs > 0 ? Math.round((elapsedMs / totalMs) * 100) : overdueMs > 0 ? 100 : 0;

  let status: SlaStatus;
  if (done !== undefined) {
    status = overdueMs > 0 ? "concluído fora do prazo" : "concluído dentro do prazo";
  } else if (remainingMs <= 0) {
    status = "vencido";
  } else if (totalMs > 0 && elapsedMs / totalMs >= SLA_WARNING_RATIO) {
    status = "próximo do vencimento";
  } else {
    status = "dentro do prazo";
  }

  return {
    applicable: true,
    status,
    totalMs,
    elapsedMs,
    remainingMs,
    overdueMs,
    percent,
    dueAt: input.dueAt as string,
    late: done === undefined && remainingMs <= 0,
    finished: done !== undefined,
  };
}

/** Data limite = início + prazo declarado. */
export function dueDateFrom(startIso: string, spec: SlaSpec | undefined): string | undefined {
  if (!spec || !spec.amount || spec.amount <= 0) return undefined;
  const start = ms(startIso);
  if (start === undefined) return undefined;
  return new Date(start + specMs(spec)).toISOString();
}

export function toSpec(
  amount: number | undefined,
  unit: TimeUnit | undefined,
): SlaSpec | undefined {
  if (!amount || amount <= 0) return undefined;
  return { amount, unit: unit ?? "horas" };
}

/* ------------------------------------------------------------------ */
/* Formatação (fuso local da aplicação)                                */
/* ------------------------------------------------------------------ */

export function formatDuration(milliseconds: number): string {
  const value = Math.max(0, Math.round(milliseconds));
  const minutes = Math.round(value / 60000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}min`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

/** Tempo restante legível — negativo vira "excedido em …". */
export function formatRemaining(computation: SlaComputation): string {
  if (!computation.applicable) return "—";
  if (computation.finished) {
    return computation.overdueMs > 0
      ? `excedeu em ${formatDuration(computation.overdueMs)}`
      : `concluída com ${formatDuration(Math.max(0, computation.remainingMs))} de folga`;
  }
  if (computation.remainingMs <= 0) {
    return `excedido em ${formatDuration(computation.overdueMs)}`;
  }
  return `${formatDuration(computation.remainingMs)} restantes`;
}

/** true quando a data limite cai no dia de hoje (fuso local). */
export function isDueToday(dueAt: string | undefined, now = Date.now()): boolean {
  const due = ms(dueAt);
  if (due === undefined) return false;
  const a = new Date(due);
  const b = new Date(now);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/* ------------------------------------------------------------------ */
/* Relógio compartilhado                                               */
/* ------------------------------------------------------------------ */

/**
 * Tick de re-renderização. Não é um contador: apenas força o recálculo a
 * partir dos timestamps reais em intervalos discretos.
 */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

/* ------------------------------------------------------------------ */
/* Definição do Workflow                                               */
/* ------------------------------------------------------------------ */

export function instanceSpecOf(doc: WorkflowVersionContent): SlaSpec | undefined {
  return toSpec(doc.slaAmount, doc.slaUnit);
}

export function defaultTaskSpecOf(doc: WorkflowVersionContent): SlaSpec | undefined {
  return toSpec(doc.taskSlaAmount, doc.taskSlaUnit);
}

/** Prazo específico da etapa prevalece sobre o padrão do workflow. */
export function stepSpecOf(doc: WorkflowVersionContent, step: WorkflowStep): SlaSpec | undefined {
  return toSpec(step.slaAmount, step.slaUnit) ?? defaultTaskSpecOf(doc);
}

export function stepHasOwnSpec(step: WorkflowStep): boolean {
  return Boolean(step.slaAmount && step.slaAmount > 0);
}

export function workflowHasSla(doc: WorkflowDoc): boolean {
  return Boolean(
    instanceSpecOf(doc) ||
      defaultTaskSpecOf(doc) ||
      doc.steps.some((s) => stepHasOwnSpec(s)),
  );
}

/** Validação temporal, no mesmo padrão de `validateExecutionRules`. */
export function validateSlaRules(doc: WorkflowVersionContent & Partial<Pick<WorkflowDoc, "id" | "name">>): RuleIssue[] {
  const issues: RuleIssue[] = [];

  const checkAmount = (
    amount: number | undefined,
    unit: TimeUnit | undefined,
    id: string,
    step: string,
    label: string,
  ) => {
    if (amount === undefined || amount === null) return;
    if (Number.isNaN(amount)) {
      issues.push({ id, severity: "erro", step, message: `${label} inválido.` });
      return;
    }
    if (amount === 0) {
      issues.push({
        id,
        severity: "erro",
        step,
        message: `${label} igual a zero — remova o prazo ou informe um valor válido.`,
      });
      return;
    }
    if (amount < 0) {
      issues.push({ id, severity: "erro", step, message: `${label} negativo.` });
      return;
    }
    if (!unit) {
      issues.push({
        id: `${id}-unidade`,
        severity: "erro",
        step,
        message: `${label} sem unidade de tempo.`,
      });
    }
  };

  checkAmount(doc.slaAmount, doc.slaUnit, `${doc.id ?? "workflow"}-sla`, doc.name ?? "Workflow", "SLA da instância");
  checkAmount(
    doc.taskSlaAmount,
    doc.taskSlaUnit,
    `${doc.id ?? "workflow"}-sla-tarefa`,
    doc.name ?? "Workflow",
    "SLA padrão das tarefas",
  );

  const instanceSpec = instanceSpecOf(doc);
  doc.steps.forEach((step) => {
    checkAmount(step.slaAmount, step.slaUnit, `${step.id}-sla`, step.name, "Prazo da etapa");
    const spec = toSpec(step.slaAmount, step.slaUnit);
    if (spec && instanceSpec && specMs(spec) > specMs(instanceSpec)) {
      issues.push({
        id: `${step.id}-sla-maior`,
        severity: "atenção",
        step: step.name,
        message: "Prazo da etapa maior que o SLA da instância.",
      });
    }
  });

  const stepsSum = doc.steps.reduce((acc, step) => {
    const spec = stepSpecOf(doc, step);
    return acc + (spec ? specMs(spec) : 0);
  }, 0);
  if (instanceSpec && stepsSum > specMs(instanceSpec)) {
    issues.push({
      id: `${doc.id ?? "workflow"}-sla-soma`,
      severity: "atenção",
      step: doc.name ?? "Workflow",
      message:
        "A soma dos prazos das etapas ultrapassa o SLA da instância — o workflow tende a atrasar.",
    });
  }

  return issues;
}
