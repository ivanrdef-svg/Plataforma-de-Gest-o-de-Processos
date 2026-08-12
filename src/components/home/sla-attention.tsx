import { Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowUpRight, Clock } from "lucide-react";
import { SectionHeader } from "@/components/layout/page";
import { OverdueFlag, SlaCountdown } from "@/components/runtime/sla-badges";
import { useNow } from "@/lib/sla";
import {
  allOverdueTasks,
  taskSla,
  tasksAtRisk,
  useSlaMonitor,
  useWorkflowInstances,
} from "@/lib/runtime-store";

/**
 * Build 014 — "Prazos em risco": tarefas atrasadas e próximas do vencimento
 * em todas as execuções abertas. Atraso é condição temporal, não estado.
 */
export function SlaAttention() {
  const instances = useWorkflowInstances();
  const now = useNow();
  useSlaMonitor();

  const overdue = allOverdueTasks(instances, now);
  const atRisk = instances
    .filter((i) => i.state !== "concluída" && i.state !== "cancelada")
    .flatMap((instance) => tasksAtRisk(instance, now).map((task) => ({ instance, task })));

  const list = [...overdue, ...atRisk].slice(0, 6);
  if (list.length === 0) return null;

  return (
    <section>
      <SectionHeader
        title="Prazos em risco"
        description={`${overdue.length} tarefa(s) atrasada(s) · ${atRisk.length} próxima(s) do vencimento.`}
        action={
          <Link
            to="/execucao"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Ver execuções <ArrowUpRight className="h-3 w-3" />
          </Link>
        }
      />
      <div className="divide-y rounded-xl border bg-card">
        {list.map(({ instance, task }) => {
          const sla = taskSla(task, now);
          return (
            <Link
              key={task.id}
              to="/execucao/$instanceId"
              params={{ instanceId: instance.id }}
              className="flex flex-wrap items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
            >
              {sla.late ? (
                <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
              ) : (
                <Clock className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">{task.name}</span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  {instance.processName} · {task.owner || "sem responsável"}
                </span>
              </span>
              <SlaCountdown sla={sla} dueAt={task.dueAt} />
              {sla.late && <OverdueFlag />}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
