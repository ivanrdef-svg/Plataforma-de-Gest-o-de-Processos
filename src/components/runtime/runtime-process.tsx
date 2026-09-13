import { Link } from "@tanstack/react-router";
import { ArrowUpRight, GitBranch, Workflow as WorkflowIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RelationshipSummary } from "@/components/relationships/relationship-summary";
import { RelationshipsTab } from "@/components/relationships/relationships-tab";
import { currentTask, type WorkflowInstance } from "@/lib/runtime-store";
import { useWorkflowDoc } from "@/lib/workflow-store";
import { getRuntimeHistory } from "@/lib/runtime-history";

/** Build 012 — processo de origem visível durante a execução. */
export function RuntimeProcess({ instance }: { instance: WorkflowInstance }) {
  const history = getRuntimeHistory(instance, useWorkflowDoc(instance.workflowId));
  const active = currentTask(instance);

  return (
    <div className="space-y-6">
      <section className="rounded-xl border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="inline-flex items-center gap-1.5 text-sm font-medium">
              <WorkflowIcon className="h-4 w-4 text-muted-foreground" />
              {instance.processName}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Origem desta execução · workflow {instance.workflowName} ·{" "}
              {instance.version}
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild size="sm" variant="outline" className="h-8">
              <Link
                to="/processos/$processId"
                params={{ processId: instance.processId }}
              >
                Ver processo
                <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
            <Button asChild size="sm" variant="ghost" className="h-8">
              <Link
                to="/processos/$processId"
                params={{ processId: instance.processId }}
                hash="bpm"
              >
                <GitBranch className="mr-1.5 h-3.5 w-3.5" />
                Ver BPM
              </Link>
            </Button>
          </div>
        </div>

        <ol className="mt-5 space-y-2">
          {history.steps.map((step, index) => {
            const isCurrent = active?.stepId === step.id;
            return (
              <li
                key={step.id}
                className={
                  isCurrent
                    ? "rounded-lg border border-primary/40 bg-primary/5 px-3 py-2"
                    : "rounded-lg border px-3 py-2"
                }
              >
                <p className="text-xs font-medium">
                  {index + 1}. {step.name}
                  {isCurrent && (
                    <span className="ml-2 text-[11px] text-primary">etapa atual</span>
                  )}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {step.owner || "sem responsável"}
                  {step.duration ? ` · ${step.duration}` : ""}
                </p>
              </li>
            );
          })}
          {history.provenance === "unknown" && (
            <li className="text-xs text-muted-foreground">
              Informação histórica da versão indisponível. Exibindo apenas tarefas registradas na execução.
            </li>
          )}
        </ol>
      </section>

      <section className="space-y-6">
        <RelationshipSummary objectId={instance.processId} />
        <RelationshipsTab
          objectId={instance.processId}
          objectName={instance.processName}
          objectType="Processo"
        />
      </section>
    </div>
  );
}
