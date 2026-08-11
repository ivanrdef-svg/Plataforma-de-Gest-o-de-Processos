import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Network, Workflow as WorkflowIcon } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import type { WorkflowDoc } from "@/lib/workflow-store";
import { workflowReadiness } from "./workflow-execution";
import { stepConfigured } from "./workflow-steps";

/** Build 011 — resumo do Workflow, ligando definição, processo e BPM. */
export function WorkflowSummary({ doc }: { doc: WorkflowDoc }) {
  const { score } = workflowReadiness(doc);
  const configured = doc.steps.filter(stepConfigured).length;

  return (
    <div className="space-y-6">
      <section className="rounded-xl border bg-card p-5">
        <h3 className="text-sm font-medium">Objetivo</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {doc.objective || "Objetivo herdado do processo de origem."}
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-4">
        <Stat label="Etapas" value={doc.steps.length} />
        <Stat label="Configuradas" value={configured} />
        <Stat label="Participantes" value={doc.participants.length} />
        <Stat label="Prontidão" value={`${score}%`} />
      </section>

      <section className="rounded-xl border bg-card p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="inline-flex items-center gap-1.5 text-sm font-medium">
              <Network className="h-3.5 w-3.5 text-muted-foreground" />
              Processo de origem
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {doc.processName} · {doc.processVersion}
            </p>
          </div>
          <Button asChild variant="ghost" size="sm" className="h-8">
            <Link to="/processos/$processId" params={{ processId: doc.processId }}>
              Abrir processo
              <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
        <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <WorkflowIcon className="h-3 w-3" />
          O diagrama BPM do processo continua sendo a representação gráfica
          oficial deste fluxo.
        </p>
      </section>

      <section className="rounded-xl border bg-card p-5">
        <h3 className="text-sm font-medium">Evolução da definição</h3>
        <Progress value={score} className="mt-3 h-1.5" />
        <p className="mt-2 text-xs text-muted-foreground">
          {configured} de {doc.steps.length} etapas prontas para execução.
        </p>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border bg-card px-4 py-3">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
