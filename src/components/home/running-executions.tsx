import { Link } from "@tanstack/react-router";
import { ArrowUpRight, PlayCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { InstanceStateBadge } from "@/components/runtime/runtime-badges";
import {
  currentTask,
  instanceProgress,
  useWorkflowInstances,
} from "@/lib/runtime-store";

/** Build 012 — "Execuções em andamento" no Launchpad. */
export function RunningExecutions() {
  const instances = useWorkflowInstances()
    .filter((i) => i.state === "em execução" || i.state === "pausada")
    .slice(0, 4);

  return (
    <section className="rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="inline-flex items-center gap-1.5 text-sm font-medium">
          <PlayCircle className="h-4 w-4 text-muted-foreground" />
          Execuções em andamento
        </h2>
        <Link
          to="/execucao"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Runtime Center
          <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>

      {instances.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Nenhuma execução ativa. Inicie a execução de um workflow configurado.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {instances.map((i) => {
            const progress = instanceProgress(i);
            const active = currentTask(i);
            return (
              <li key={i.id}>
                <Link
                  to="/execucao/$instanceId"
                  params={{ instanceId: i.id }}
                  className="block rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/60"
                >
                  <span className="flex items-center gap-3">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium">
                        {i.name}
                      </span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {active ? `Etapa atual: ${active.name}` : i.workflowName}
                      </span>
                    </span>
                    <InstanceStateBadge state={i.state} />
                    <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                      {progress}%
                    </span>
                  </span>
                  <Progress value={progress} className="mt-1.5 h-1" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
