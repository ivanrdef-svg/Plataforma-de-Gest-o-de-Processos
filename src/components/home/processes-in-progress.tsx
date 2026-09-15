import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Workflow } from "lucide-react";
import { EmptyState, SectionHeader } from "@/components/layout/page";
import { getWorkingProcessVersion, useProcessDocs } from "@/lib/process-store";

/**
 * Processos com uma versão de trabalho persistida.
 */
export function ProcessesInProgress() {
  const processes = useProcessDocs()
    .map((doc) => ({ doc, version: getWorkingProcessVersion(doc) }))
    .filter((item) => Boolean(item.version));

  return (
    <section>
      <SectionHeader
        title="Processos em andamento"
        description="Modelagens ativas na engenharia de processos."
        action={
          <Link
            to="/processos"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Process Center <ArrowUpRight className="h-3 w-3" />
          </Link>
        }
      />
      {processes.length === 0 ? (
        <EmptyState
          icon={<Workflow className="h-5 w-5" />}
          title="Nenhum processo em andamento"
          description="Processos com uma versão de trabalho aparecerão aqui."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
        {processes.map(({ doc, version }) => {
          if (!version) return null;
          return (
          <Link
            key={doc.id}
            to="/processos/$processId"
            params={{ processId: doc.id }}
            className="group rounded-xl border bg-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-float"
          >
            <div className="flex items-center gap-2">
              <Workflow className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate text-sm font-medium">{version.definition.name}</span>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              {version.definition.area} · {version.definition.steps.length} etapas
            </p>
            <p className="mt-3 text-[11px] text-muted-foreground">
              Versão {version.number} · Em desenvolvimento
            </p>
          </Link>
          );
        })}
        </div>
      )}
    </section>
  );
}
