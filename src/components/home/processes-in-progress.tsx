import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Workflow } from "lucide-react";
import { SectionHeader } from "@/components/layout/page";
import { PROCESS_DEMO_IN_PROGRESS } from "@/config/process-structure";

/**
 * Build 006 — widget discreto "Processos em andamento" no Launchpad.
 * Dados simulados. Não substitui nenhum widget existente.
 */
export function ProcessesInProgress() {
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
      <div className="grid gap-3 sm:grid-cols-3">
        {PROCESS_DEMO_IN_PROGRESS.map((p) => (
          <Link
            key={p.id}
            to="/processos"
            className="group rounded-xl border bg-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-float"
          >
            <div className="flex items-center gap-2">
              <Workflow className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate text-sm font-medium">{p.name}</span>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              {p.area} · {p.steps} etapas
            </p>
            <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${p.progress}%` }}
              />
            </div>
            <p className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="truncate">{p.stage}</span>
              <span className="shrink-0 tabular-nums">{p.progress}%</span>
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
