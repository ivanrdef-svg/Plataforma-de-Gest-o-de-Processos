import { Link } from "@tanstack/react-router";
import { ArrowUpRight, PlayCircle } from "lucide-react";
import { workflowReadiness } from "@/components/workflow/workflow-execution";
import { useWorkflowDocs } from "@/lib/workflow-store";

/** Build 011 — widget "Execução" do Launchpad. */
export function WorkflowExecutionWidget() {
  const workflows = useWorkflowDocs().slice(0, 4);

  return (
    <section className="rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="inline-flex items-center gap-1.5 text-sm font-medium">
          <PlayCircle className="h-4 w-4 text-muted-foreground" />
          Execução
        </h2>
        <Link
          to="/workflow"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Workflow Center
          <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>

      {workflows.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Nenhum workflow ainda. Transforme um processo modelado em uma definição
          executável.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {workflows.map((w) => {
            const { score } = workflowReadiness(w);
            return (
              <li key={w.id}>
                <Link
                  to="/workflow/$workflowId"
                  params={{ workflowId: w.id }}
                  className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/60"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium">{w.name}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {w.processName} · {w.steps.length} etapas
                    </span>
                  </span>
                  <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                    {score}%
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
