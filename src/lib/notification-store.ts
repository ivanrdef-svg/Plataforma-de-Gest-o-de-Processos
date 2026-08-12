/**
 * Build 015 — notificações in-app.
 *
 * As notificações são DERIVADAS de fatos que já existem no Workflow Runtime
 * (tarefas abertas, aprovações, decisões, correções, prazos e conclusões).
 * O store apenas materializa cada fato uma única vez (chave idempotente) e
 * guarda o estado de leitura. Persistência local até o backend chegar.
 */

import { useEffect, useSyncExternalStore } from "react";
import {
  NOTIFICATION_LIMIT,
  type NotificationType,
} from "@/config/inbox-model";
import {
  isOpen,
  taskKind,
  taskSla,
  useWorkflowInstances,
  type RuntimeTask,
  type WorkflowInstance,
} from "@/lib/runtime-store";

const STORAGE_KEY = "platform.notifications.v1";

export interface AppNotification {
  id: string;
  /** Chave idempotente do fato que originou a notificação. */
  key: string;
  type: NotificationType;
  title: string;
  detail: string;
  at: string;
  instanceId: string;
  instanceName: string;
  taskId?: string;
  read: boolean;
}

let items: AppNotification[] = [];
let hydrated = false;
let cache: AppNotification[] | null = null;
const listeners = new Set<() => void>();

function ensureHydrated() {
  if (hydrated || typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) items = JSON.parse(raw) as AppNotification[];
  } catch {
    items = [];
  }
  hydrated = true;
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* silencioso: persistência local é best-effort */
  }
}

function emit() {
  cache = null;
  persist();
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const EMPTY: AppNotification[] = [];

function getSnapshot(): AppNotification[] {
  ensureHydrated();
  if (!cache) {
    cache = [...items].sort((a, b) => b.at.localeCompare(a.at));
  }
  return cache;
}

function getServerSnapshot(): AppNotification[] {
  return EMPTY;
}

export function useNotifications(): AppNotification[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useUnreadCount(): number {
  return useNotifications().filter((n) => !n.read).length;
}

/* ------------------------------------------------------------------ */
/* Ações                                                               */
/* ------------------------------------------------------------------ */

export function markNotificationRead(id: string) {
  ensureHydrated();
  let changed = false;
  items = items.map((n) => {
    if (n.id !== id || n.read) return n;
    changed = true;
    return { ...n, read: true };
  });
  if (changed) emit();
}

export function markAllNotificationsRead() {
  ensureHydrated();
  if (items.every((n) => n.read)) return;
  items = items.map((n) => (n.read ? n : { ...n, read: true }));
  emit();
}

export function clearNotifications() {
  ensureHydrated();
  if (items.length === 0) return;
  items = [];
  emit();
}

/* ------------------------------------------------------------------ */
/* Derivação a partir do runtime                                       */
/* ------------------------------------------------------------------ */

interface Candidate {
  key: string;
  type: NotificationType;
  title: string;
  detail: string;
  at: string;
  instanceId: string;
  instanceName: string;
  taskId?: string;
}

function taskCandidates(
  instance: WorkflowInstance,
  task: RuntimeTask,
  now: number,
): Candidate[] {
  const base = {
    instanceId: instance.id,
    instanceName: instance.name,
    taskId: task.id,
  };
  const out: Candidate[] = [];
  const kind = taskKind(task);
  const sla = taskSla(task, now);
  const open = isOpen(task);

  if (open) {
    if (kind === "aprovação") {
      out.push({
        ...base,
        key: `aprovação:${task.id}`,
        type: "aprovação",
        title: "Aprovação pendente",
        detail: `${task.name} — ${instance.processName}`,
        at: task.startedAt ?? task.createdAt,
      });
    } else if (kind === "decisão") {
      out.push({
        ...base,
        key: `decisão:${task.id}`,
        type: "decisão",
        title: "Decisão pendente",
        detail: `${task.name} — ${instance.processName}`,
        at: task.startedAt ?? task.createdAt,
      });
    } else {
      out.push({
        ...base,
        key: `tarefa:${task.id}`,
        type: "tarefa",
        title: "Nova tarefa atribuída",
        detail: `${task.name} — ${instance.processName}`,
        at: task.createdAt,
      });
    }

    if (task.correctionRequested) {
      out.push({
        ...base,
        key: `correção:${task.id}:${task.correctionReason ?? ""}`,
        type: "correção",
        title: "Correção solicitada",
        detail: task.correctionReason?.trim()
          ? `${task.name}: ${task.correctionReason}`
          : task.name,
        at: instance.updatedAt,
      });
    }

    if (task.slaOverdueAt || sla.late) {
      out.push({
        ...base,
        key: `atraso:${task.id}`,
        type: "atraso",
        title: "Prazo vencido",
        detail: `${task.name} ultrapassou o prazo definido.`,
        at: task.slaOverdueAt ?? new Date(now).toISOString(),
      });
    } else if (task.slaWarnedAt || sla.status === "próximo do vencimento") {
      out.push({
        ...base,
        key: `prazo:${task.id}`,
        type: "prazo",
        title: "Prazo próximo do vencimento",
        detail: `${task.name} está próxima do limite.`,
        at: task.slaWarnedAt ?? new Date(now).toISOString(),
      });
    }
  }

  return out;
}

function instanceCandidates(instance: WorkflowInstance, now: number): Candidate[] {
  const out: Candidate[] = [];
  if (instance.state === "concluída") {
    out.push({
      key: `execução:${instance.id}`,
      type: "execução",
      title: "Execução concluída",
      detail: `${instance.name} foi finalizada.`,
      at: instance.completedAt ?? instance.updatedAt,
      instanceId: instance.id,
      instanceName: instance.name,
    });
  }
  return out.concat(
    instance.tasks
      .filter((t) => t.state !== "cancelada")
      .flatMap((task) => taskCandidates(instance, task, now)),
  );
}

/** Materializa fatos ainda não notificados. Idempotente por chave. */
export function syncNotifications(instances: WorkflowInstance[], now = Date.now()) {
  if (typeof window === "undefined") return;
  ensureHydrated();
  const known = new Set(items.map((n) => n.key));
  const fresh = instances
    .filter((i) => i.state !== "cancelada")
    .flatMap((instance) => instanceCandidates(instance, now))
    .filter((c) => !known.has(c.key))
    .map<AppNotification>((c) => ({
      id: `ntf-${Math.random().toString(36).slice(2, 9)}`,
      read: false,
      ...c,
    }));

  if (fresh.length === 0) return;
  items = [...fresh, ...items].slice(0, NOTIFICATION_LIMIT);
  emit();
}

/** Mantém as notificações alinhadas ao estado atual das execuções. */
export function useNotificationSync() {
  const instances = useWorkflowInstances();
  useEffect(() => {
    syncNotifications(instances);
  }, [instances]);
}
