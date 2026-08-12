import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PlayCircle, Search } from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";
import { EmptyState } from "@/components/layout/page";
import { Input } from "@/components/ui/input";
import { Pill } from "@/components/ui/pill";
import { Progress } from "@/components/ui/progress";
import { InstanceStateBadge } from "@/components/runtime/runtime-badges";
import {
  RUNTIME_CENTER_STATS,
  RUNTIME_FILTERS,
  type RuntimeFilterId,
} from "@/config/runtime-model";
import {
  currentTask,
  formatDateTime,
  instanceProgress,
  openTasks,
  useWorkflowInstances,
  type WorkflowInstance,
} from "@/lib/runtime-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/execucao/")({
  component: RuntimeCenter,
  head: () => ({
    meta: [
      { title: "Execução — Workflow Runtime Center" },
      {
        name: "description",
        content:
          "Acompanhe as execuções de workflow em andamento, pausadas, concluídas e canceladas.",
      },
      { property: "og:title", content: "Execução — Workflow Runtime Center" },
      {
        property: "og:description",
        content:
          "Instâncias de workflow em execução, com progresso, tarefas e responsáveis.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function RuntimeCenter() {
  const instances = useWorkflowInstances();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<RuntimeFilterId>("todas");

  const stats = useMemo(() => {
    return {
      execucao: instances.filter((i) => i.state === "em execução").length,
      aguardando: instances.reduce((acc, i) => acc + openTasks(i).length, 0),
      concluidas: instances.filter((i) => i.state === "concluída").length,
      pausadas: instances.filter((i) => i.state === "pausada").length,
    } as Record<string, number>;
  }, [instances]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return instances.filter((i) => {
      if (filter !== "todas" && i.state !== filter) return false;
      if (!q) return true;
      return [i.name, i.code, i.workflowName, i.processName, i.owner]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [instances, query, filter]);

  const recent = instances.slice(0, 3);

  return (
    <AppShell>
      <div className="px-6 py-8 md:px-10">
        <header>
          <h1 className="text-xl font-semibold tracking-tight">
            Workflow Runtime Center
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Aqui os processos estão acontecendo. Cada execução é uma instância de uma
            definição de workflow publicada.
          </p>
        </header>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {RUNTIME_CENTER_STATS.map((s) => (
            <div key={s.id} className="rounded-xl border bg-card px-4 py-3">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {s.label}
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {stats[s.id] ?? 0}
              </p>
            </div>
          ))}
        </section>

        {recent.length > 0 && (
          <section className="mt-8">
            <h2 className="text-sm font-medium">Execuções recentes</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {recent.map((i) => (
                <Link
                  key={i.id}
                  to="/execucao/$instanceId"
                  params={{ instanceId: i.id }}
                  className="rounded-xl border bg-card px-4 py-3 transition-colors hover:border-primary/30"
                >
                  <p className="truncate text-sm font-medium">{i.name}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {i.workflowName}
                  </p>
                  <div className="mt-3">
                    <InstanceStateBadge state={i.state} />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pesquisar execuções, workflows, processos, responsáveis…"
              className="h-9 pl-9 text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {RUNTIME_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={cn(
                  "rounded-md px-2.5 py-1.5 text-xs transition-colors",
                  filter === f.id
                    ? "bg-muted font-medium text-foreground"
                    : "text-muted-foreground hover:bg-muted/60",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <section className="mt-4">
          {visible.length === 0 ? (
            <EmptyState
              icon={<PlayCircle className="h-5 w-5" />}
              title="Nenhuma execução por aqui"
              description="Abra a aba Execução de um workflow e inicie a primeira instância."
            />
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {visible.map((i) => (
                <InstanceCard key={i.id} instance={i} />
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function InstanceCard({ instance }: { instance: WorkflowInstance }) {
  const progress = instanceProgress(instance);
  const active = currentTask(instance);

  return (
    <article className="rounded-xl border bg-card p-4 transition-colors hover:border-primary/30">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            to="/execucao/$instanceId"
            params={{ instanceId: instance.id }}
            className="block truncate text-sm font-medium hover:underline"
          >
            {instance.name}
          </Link>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {instance.code} · {instance.workflowName} · {instance.owner}
          </p>
        </div>
        <InstanceStateBadge state={instance.state} />
      </div>

      <Progress value={progress} className="mt-3 h-1.5" />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Pill tone="bg-muted text-muted-foreground" size="sm">
          {progress}% concluído
        </Pill>
        <Pill tone="bg-muted text-muted-foreground" size="sm">
          {openTasks(instance).length} tarefas abertas
        </Pill>
        {active && (
          <Pill tone="bg-primary/10 text-primary" size="sm">
            Etapa atual: {active.name}
          </Pill>
        )}
        <span className="ml-auto text-[11px] text-muted-foreground">
          {formatDateTime(instance.updatedAt)}
        </span>
      </div>
    </article>
  );
}
