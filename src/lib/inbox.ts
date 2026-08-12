/**
 * Build 015 — agregação da Task Inbox.
 *
 * Camada de leitura pura sobre o Workflow Runtime: consolida as tarefas de
 * todas as instâncias em uma única lista priorizada. Não cria estado novo e
 * não altera nenhuma regra de execução — apenas ordena e classifica.
 */

import { useMemo } from "react";
import type { ExecutionKind } from "@/config/execution-rules";
import {
  INBOX_PRIORITY_ORDER,
  type InboxFilterId,
  type InboxPriority,
} from "@/config/inbox-model";
import { useNow, type SlaComputation } from "@/lib/sla";
import {
  isOpen,
  taskKind,
  taskSla,
  useWorkflowInstances,
  type RuntimeTask,
  type WorkflowInstance,
} from "@/lib/runtime-store";

export interface InboxItem {
  /** Identificador da tarefa — estável entre renders. */
  id: string;
  instance: WorkflowInstance;
  task: RuntimeTask;
  kind: ExecutionKind;
  sla: SlaComputation;
  priority: InboxPriority;
  /** Motivo curto da prioridade, exibido na lista. */
  reason: string;
  open: boolean;
  overdue: boolean;
  atRisk: boolean;
}

/* ------------------------------------------------------------------ */
/* Prioridade                                                          */
/* ------------------------------------------------------------------ */

function classify(
  task: RuntimeTask,
  kind: ExecutionKind,
  sla: SlaComputation,
  open: boolean,
): { priority: InboxPriority; reason: string } {
  if (!open) return { priority: "baixa", reason: "Encerrada" };
  if (sla.late) return { priority: "crítica", reason: "Prazo vencido" };
  if (task.state === "bloqueada") return { priority: "crítica", reason: "Bloqueada" };
  if (task.correctionRequested)
    return { priority: "alta", reason: "Correção solicitada" };
  if (sla.status === "próximo do vencimento")
    return { priority: "alta", reason: "Próxima do vencimento" };
  if (kind === "aprovação") return { priority: "alta", reason: "Aprovação pendente" };
  if (kind === "decisão") return { priority: "média", reason: "Decisão pendente" };
  if (task.state === "em andamento")
    return { priority: "média", reason: "Em andamento" };
  return { priority: "baixa", reason: "Aguardando início" };
}

/* ------------------------------------------------------------------ */
/* Agregação                                                           */
/* ------------------------------------------------------------------ */

function isLive(instance: WorkflowInstance): boolean {
  return instance.state !== "cancelada";
}

export function buildInbox(instances: WorkflowInstance[], now: number): InboxItem[] {
  const items = instances.filter(isLive).flatMap((instance) =>
    instance.tasks
      .filter((task) => task.state !== "cancelada")
      .map((task) => {
        const kind = taskKind(task);
        const sla = taskSla(task, now);
        const open = isOpen(task);
        const { priority, reason } = classify(task, kind, sla, open);
        return {
          id: task.id,
          instance,
          task,
          kind,
          sla,
          priority,
          reason,
          open,
          overdue: sla.late,
          atRisk: !sla.late && sla.status === "próximo do vencimento",
        } satisfies InboxItem;
      }),
  );

  return items.sort((a, b) => {
    if (a.open !== b.open) return a.open ? -1 : 1;
    const byPriority =
      INBOX_PRIORITY_ORDER[a.priority] - INBOX_PRIORITY_ORDER[b.priority];
    if (byPriority !== 0) return byPriority;
    const aDue = a.task.dueAt ? new Date(a.task.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
    const bDue = b.task.dueAt ? new Date(b.task.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
    if (aDue !== bDue) return aDue - bDue;
    return a.task.order - b.task.order;
  });
}

/* ------------------------------------------------------------------ */
/* Indicadores                                                         */
/* ------------------------------------------------------------------ */

export interface InboxStats {
  abertas: number;
  aprovacoes: number;
  decisoes: number;
  risco: number;
  atrasadas: number;
  bloqueadas: number;
  concluidas: number;
}

export function inboxStats(items: InboxItem[]): InboxStats {
  const open = items.filter((i) => i.open);
  return {
    abertas: open.length,
    aprovacoes: open.filter((i) => i.kind === "aprovação").length,
    decisoes: open.filter((i) => i.kind === "decisão").length,
    risco: open.filter((i) => i.atRisk).length,
    atrasadas: open.filter((i) => i.overdue).length,
    bloqueadas: open.filter((i) => i.task.state === "bloqueada").length,
    concluidas: items.filter((i) => i.task.state === "concluída").length,
  };
}

/* ------------------------------------------------------------------ */
/* Filtros                                                             */
/* ------------------------------------------------------------------ */

export function matchesInboxFilter(item: InboxItem, filter: InboxFilterId): boolean {
  switch (filter) {
    case "todas":
      return item.open;
    case "aprovacoes":
      return item.open && item.kind === "aprovação";
    case "decisoes":
      return item.open && item.kind === "decisão";
    case "atrasadas":
      return item.open && item.overdue;
    case "risco":
      return item.open && item.atRisk;
    case "bloqueadas":
      return item.open && item.task.state === "bloqueada";
    case "concluidas":
      return item.task.state === "concluída";
    default:
      return true;
  }
}

export function matchesInboxQuery(item: InboxItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [
    item.task.name,
    item.task.owner,
    item.instance.name,
    item.instance.processName,
    item.instance.workflowName,
    item.instance.area,
    item.instance.code,
  ]
    .filter(Boolean)
    .some((value) => value.toLowerCase().includes(q));
}

/* ------------------------------------------------------------------ */
/* Hook                                                                */
/* ------------------------------------------------------------------ */

export function useInbox(): { items: InboxItem[]; stats: InboxStats; now: number } {
  const instances = useWorkflowInstances();
  const now = useNow();
  return useMemo(() => {
    const items = buildInbox(instances, now);
    return { items, stats: inboxStats(items), now };
  }, [instances, now]);
}
