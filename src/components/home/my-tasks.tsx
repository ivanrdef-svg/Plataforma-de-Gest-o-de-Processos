import { Link } from "@tanstack/react-router";
import { ArrowUpRight, ListChecks } from "lucide-react";
import { SectionHeader } from "@/components/layout/page";
import { TaskStateBadge } from "@/components/runtime/runtime-badges";
import { OverdueFlag } from "@/components/runtime/sla-badges";
import { useNow } from "@/lib/sla";
import { taskSla, useWorkflowInstances } from "@/lib/runtime-store";

/** Build 012 — "Minhas tarefas" alimentado pelas instâncias em execução. */
export function MyTasks() {
  const instances = useWorkflowInstances();
  const now = useNow();

  const rows = instances.flatMap((instance) =>
    instance.tasks
      .filter((t) => t.state !== "cancelada")
      .map((task) => ({ instance, task })),
  );

  const open = rows.filter((r) =>
    ["pendente", "em andamento", "bloqueada"].includes(r.task.state),
  );
  const done = rows
    .filter((r) => r.task.state === "concluída")
    .sort((a, b) => (b.task.completedAt ?? "").localeCompare(a.task.completedAt ?? ""))
    .slice(0, 3);

  const list = [...open, ...done].slice(0, 8);

  return (
    <section>
      <SectionHeader
        title="Minhas tarefas"
        description="Tarefas geradas pelas execuções em andamento."
        action={
          <Link
            to="/execucao"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Ver execuções <ArrowUpRight className="h-3 w-3" />
          </Link>
        }
      />
      {list.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-card/40 px-4 py-6 text-center text-xs text-muted-foreground">
          Nenhuma tarefa ainda. Inicie a execução de um workflow.
        </p>
      ) : (
        <div className="divide-y rounded-xl border bg-card">
          {list.map(({ instance, task }) => {
            const sla = taskSla(task, now);
            return (
            <Link
              key={task.id}
              to="/execucao/$instanceId"
              params={{ instanceId: instance.id }}
              className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
            >
              <ListChecks className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">{task.name}</span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  {instance.processName}
                  {task.deadline ? ` · prazo ${task.deadline}` : ""}
                </span>
              </span>
              {sla.late && <OverdueFlag />}
              <TaskStateBadge state={task.state} />
            </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
