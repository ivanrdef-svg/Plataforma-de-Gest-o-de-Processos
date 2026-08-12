import { AlertTriangle, Clock, History, Timer } from "lucide-react";
import { EmptyState } from "@/components/layout/page";
import { Pill } from "@/components/ui/pill";
import {
  OverdueFlag,
  SlaCountdown,
  SlaProgress,
  SlaStatusBadge,
} from "@/components/runtime/sla-badges";
import {
  NO_SLA_LABEL,
  PAUSE_CLOCK_NOTE,
  SLA_OCCURRENCE_STATUS_TONE,
  specLabel,
} from "@/config/sla-model";
import { formatDuration, useNow } from "@/lib/sla";
import {
  formatDateTime,
  hasSla,
  instanceSla,
  instanceSpec,
  isOpen,
  slaOccurrences,
  taskSla,
  taskSpec,
  type WorkflowInstance,
} from "@/lib/runtime-store";

/**
 * Build 014 — aba temporal da execução: SLA da instância, prazos das tarefas
 * e ocorrências registradas. Tudo derivado de timestamps reais.
 */
export function RuntimeSla({ instance }: { instance: WorkflowInstance }) {
  const now = useNow();
  const sla = instanceSla(instance, now);
  const spec = instanceSpec(instance);
  const occurrences = slaOccurrences(instance);
  const tasks = [...instance.tasks].sort((a, b) => a.order - b.order);

  if (!hasSla(instance)) {
    return (
      <EmptyState
        icon={<Timer className="h-5 w-5" />}
        title={NO_SLA_LABEL}
        description="Defina prazos na definição do workflow — nenhum prazo é inventado pela plataforma."
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-medium">SLA da execução</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Prazo declarado {specLabel(spec)} · início {formatDateTime(instance.startedAt)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SlaStatusBadge status={sla.status} size="md" />
            {sla.late && <OverdueFlag size="md" />}
          </div>
        </div>
        {sla.applicable ? (
          <>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Metric label="Data limite" value={formatDateTime(instance.slaDueAt)} />
              <Metric label="Tempo decorrido" value={formatDuration(sla.elapsedMs)} />
              <Metric
                label={sla.late ? "Excedido em" : "Tempo restante"}
                value={formatDuration(sla.late ? sla.overdueMs : sla.remainingMs)}
              />
            </div>
            <div className="mt-4">
              <SlaProgress sla={sla} />
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                {sla.percent}% do prazo consumido.
              </p>
            </div>
          </>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">
            Sem SLA de execução definido — apenas prazos por tarefa.
          </p>
        )}
        {instance.state === "pausada" && (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-700 dark:text-amber-400">
            <Clock className="h-3 w-3" />
            {PAUSE_CLOCK_NOTE}
          </p>
        )}
      </section>

      <section className="rounded-xl border bg-card p-5">
        <h3 className="text-sm font-medium">Prazos por tarefa</h3>
        <ul className="mt-4 space-y-2">
          {tasks.map((task) => {
            const taskComputation = taskSla(task, now);
            return (
              <li
                key={task.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border bg-surface/40 px-3 py-2"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium">{task.name}</span>
                  <span className="block text-[11px] text-muted-foreground">
                    {specLabel(taskSpec(task))}
                    {task.dueAt ? ` · limite ${formatDateTime(task.dueAt)}` : ""}
                  </span>
                </span>
                {taskComputation.applicable && (
                  <SlaCountdown sla={taskComputation} />
                )}
                {isOpen(task) && taskComputation.late && <OverdueFlag />}
                <SlaStatusBadge status={taskComputation.status} />
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-xl border bg-card p-5">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">Ocorrências de SLA</h3>
        </div>
        {occurrences.length === 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Nenhuma violação de prazo registrada nesta execução.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {occurrences.map((occurrence) => (
              <li
                key={occurrence.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2"
              >
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-destructive" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium">
                    {occurrence.objectName}
                  </span>
                  <span className="block text-[11px] text-muted-foreground">
                    {occurrence.type === "tarefa" ? "Tarefa" : "Workflow"} ·
                    prazo {occurrence.deadlineLabel} · limite{" "}
                    {formatDateTime(occurrence.dueAt)} · atraso{" "}
                    {formatDuration(occurrence.overdueMs)} · responsável{" "}
                    {occurrence.owner || "—"}
                  </span>
                </span>
                <Pill tone={SLA_OCCURRENCE_STATUS_TONE[occurrence.status]} size="sm">
                  {occurrence.status}
                </Pill>
                <span className="text-[11px] text-muted-foreground">
                  {formatDateTime(occurrence.at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-surface/40 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium tabular-nums">{value}</p>
    </div>
  );
}
