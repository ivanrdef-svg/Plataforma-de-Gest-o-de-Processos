import { Link } from "@tanstack/react-router";
import { CheckCircle2, CircleDot, Circle, AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { InstanceStateBadge } from "@/components/runtime/runtime-badges";
import { ApprovalStateBadge } from "@/components/runtime/execution-badges";
import {
  completionBlockers,
  currentTask,
  pendingApprovals,
  pendingDecisions,
  formatDateTime,
  formatElapsed,
  instanceProgress,
  type WorkflowInstance,
} from "@/lib/runtime-store";

/** Build 012 — Visão geral e progresso da execução. */
export function RuntimeOverview({ instance }: { instance: WorkflowInstance }) {
  const progress = instanceProgress(instance);
  const active = currentTask(instance);
  const done = instance.tasks.filter((t) => t.state === "concluída").length;
  const blocked = instance.tasks.filter((t) => t.state === "bloqueada");
  const approvals = pendingApprovals(instance);
  const decisions = pendingDecisions(instance);
  const blockers = instance.state === "concluída" ? [] : completionBlockers(instance);

  const rows: Array<[string, React.ReactNode]> = [
    ["Execução", instance.name],
    [
      "Workflow",
      <Link
        key="wf"
        to="/workflow/$workflowId"
        params={{ workflowId: instance.workflowId }}
        className="text-primary hover:underline"
      >
        {instance.workflowName}
      </Link>,
    ],
    [
      "Processo",
      <Link
        key="pr"
        to="/processos/$processId"
        params={{ processId: instance.processId }}
        className="text-primary hover:underline"
      >
        {instance.processName}
      </Link>,
    ],
    ["Estado", <InstanceStateBadge key="st" state={instance.state} />],
    ["Responsável", instance.owner || "—"],
    ["Início", formatDateTime(instance.startedAt)],
    ["Última atualização", formatDateTime(instance.updatedAt)],
    ["Etapa atual", active ? active.name : "—"],
    ["Tempo decorrido", formatElapsed(instance)],
  ];

  return (
    <div className="space-y-6">
      {(approvals.length > 0 || decisions.length > 0 || blockers.length > 0) && (
        <section className="rounded-xl border bg-surface/40 p-4">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Pendências de execução
          </span>
          <ul className="mt-2 space-y-1.5 text-xs">
            {approvals.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-2">
                <ApprovalStateBadge state={t.approvalState ?? "pendente"} />
                <span className="font-medium">{t.name}</span>
                <span className="text-muted-foreground">
                  aprovador {t.approver || t.owner || "—"}
                </span>
              </li>
            ))}
            {decisions.map((t) => (
              <li key={t.id} className="text-muted-foreground">
                <span className="font-medium text-foreground">{t.name}</span> ·
                decisão aguardando escolha
              </li>
            ))}
          </ul>
          {blockers.length > 0 && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              Conclusão bloqueada por: {blockers.join(" · ")}.
            </p>
          )}
        </section>
      )}

      {instance.state === "concluída" && (
        <section className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5 text-center">
          <CheckCircle2 className="mx-auto h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          <p className="mt-2 text-sm font-medium">Workflow concluído.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {instance.result} Concluída em {formatDateTime(instance.completedAt)} ·
            tempo total {formatElapsed(instance)} · responsável {instance.owner || "—"}.
          </p>
        </section>
      )}

      {instance.state === "cancelada" && (
        <section className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
          <p className="text-sm font-medium">Execução cancelada</p>
          <p className="mt-1 text-xs text-muted-foreground">{instance.cancelReason}</p>
        </section>
      )}

      <section className="rounded-xl border bg-card p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-medium">Progresso da execução</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {done} de {instance.tasks.length} tarefas concluídas
            </p>
          </div>
          <span className="text-3xl font-semibold tabular-nums">{progress}%</span>
        </div>
        <Progress value={progress} className="mt-4 h-1.5" />
      </section>

      {blocked.length > 0 && (
        <section className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <p className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-3.5 w-3.5" />
            {blocked.length} tarefa(s) bloqueada(s)
          </p>
          <ul className="mt-2 space-y-1">
            {blocked.map((t) => (
              <li key={t.id} className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{t.name}</span> —{" "}
                {t.blockedReason}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-xl border bg-card p-5">
        <h3 className="text-sm font-medium">Dados da execução</h3>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-start justify-between gap-4">
              <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {label}
              </dt>
              <dd className="text-right text-xs font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="rounded-xl border bg-card p-5">
        <h3 className="text-sm font-medium">Sequência de etapas</h3>
        <ol className="mt-4 space-y-3">
          {[...instance.tasks]
            .sort((a, b) => a.order - b.order)
            .map((task) => {
              const isCurrent = active?.id === task.id;
              const Icon =
                task.state === "concluída"
                  ? CheckCircle2
                  : isCurrent
                    ? CircleDot
                    : Circle;
              return (
                <li key={task.id} className="flex items-start gap-3">
                  <Icon
                    className={
                      task.state === "concluída"
                        ? "mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                        : isCurrent
                          ? "mt-0.5 h-4 w-4 shrink-0 text-primary"
                          : "mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50"
                    }
                  />
                  <div className="min-w-0">
                    <p
                      className={
                        isCurrent ? "text-sm font-medium" : "text-sm text-muted-foreground"
                      }
                    >
                      {task.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {task.owner || "sem responsável"}
                      {task.deadline ? ` · prazo ${task.deadline}` : ""}
                      {isCurrent ? " · etapa atual" : ""}
                    </p>
                  </div>
                </li>
              );
            })}
        </ol>
      </section>
    </div>
  );
}
