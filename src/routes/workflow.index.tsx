import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Play,
  Plus,
  Search,
  Star,
  Workflow as WorkflowIcon,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/shell/app-shell";
import { EmptyState } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pill } from "@/components/ui/pill";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LifecycleBadge } from "@/components/lifecycle/lifecycle-badge";
import { RelationshipIndicators } from "@/components/relationships/relationship-badges";
import { useRelationshipStats } from "@/lib/relationship-store";
import { workflowReadiness } from "@/components/workflow/workflow-execution";
import { WORKFLOW_CENTER_STATS } from "@/config/workflow-model";
import { stateFromLegacyStatus } from "@/config/lifecycle-model";
import { useProcessDocs } from "@/lib/process-store";
import {
  createWorkflowFromProcess,
  lifecycleStatusOf,
  updateWorkflowDoc,
  useWorkflowDocs,
  type WorkflowDoc,
} from "@/lib/workflow-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/workflow/")({
  component: WorkflowCenter,
  head: () => ({
    meta: [
      { title: "Workflow Center — Process Platform" },
      {
        name: "description",
        content:
          "Transforme processos modelados em definições de workflow executáveis: etapas, participantes, regras e governança.",
      },
      { property: "og:title", content: "Workflow Center — Process Platform" },
      {
        property: "og:description",
        content:
          "Definições de workflow herdadas dos processos, prontas para o motor de execução.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const FILTERS = [
  { id: "todos", label: "Todos" },
  { id: "configuracao", label: "Em configuração" },
  { id: "publicados", label: "Publicados" },
  { id: "favoritos", label: "Favoritos" },
] as const;

function WorkflowCenter() {
  const workflows = useWorkflowDocs();
  const processes = useProcessDocs();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("todos");

  const stats = useMemo(() => {
    const steps = workflows.reduce((acc, w) => acc + w.steps.length, 0);
    const participants = workflows.reduce(
      (acc, w) => acc + w.participants.length,
      0,
    );
    return {
      total: workflows.length,
      configuracao: workflows.filter((w) => w.status === "em configuração").length,
      publicados: workflows.filter((w) => w.status === "publicado").length,
      execucao: 0,
      etapas: steps,
      participantes: participants,
    } as Record<string, number>;
  }, [workflows]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return workflows.filter((w) => {
      if (filter === "configuracao" && w.status !== "em configuração") return false;
      if (filter === "publicados" && w.status !== "publicado") return false;
      if (filter === "favoritos" && !w.favorite) return false;
      if (!q) return true;
      return [w.name, w.code, w.processName, w.owner, w.area]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [workflows, query, filter]);

  const recent = workflows.slice(0, 3);

  const create = (processId: string) => {
    const process = processes.find((p) => p.id === processId);
    if (!process) return;
    const doc = createWorkflowFromProcess(process);
    toast.success("Workflow criado", {
      description: `${doc.steps.length} etapas herdadas de ${process.name}.`,
    });
    navigate({ to: "/workflow/$workflowId", params: { workflowId: doc.id } });
  };

  return (
    <AppShell>
      <div className="px-6 py-8 md:px-10">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Workflow Center</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Transforme processos modelados em definições executáveis. O workflow
              herda o processo — nunca o substitui.
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="h-9">
                <Plus className="mr-1.5 h-4 w-4" />
                Novo workflow
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel className="text-xs">
                Criar a partir de um processo
              </DropdownMenuLabel>
              {processes.length === 0 ? (
                <DropdownMenuItem disabled className="text-xs">
                  Nenhum processo modelado ainda
                </DropdownMenuItem>
              ) : (
                processes.map((p) => (
                  <DropdownMenuItem
                    key={p.id}
                    className="text-xs"
                    onSelect={() => create(p.id)}
                  >
                    <span className="truncate">{p.name}</span>
                    <span className="ml-auto text-[10px] text-muted-foreground">
                      {p.steps.length} etapas
                    </span>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <section className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {WORKFLOW_CENTER_STATS.map((s) => (
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
            <h2 className="text-sm font-medium">Workflows recentes</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {recent.map((w) => (
                <Link
                  key={w.id}
                  to="/workflow/$workflowId"
                  params={{ workflowId: w.id }}
                  className="group rounded-xl border bg-card px-4 py-3 transition-colors hover:border-primary/30"
                >
                  <p className="truncate text-sm font-medium">{w.name}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {w.processName}
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1 text-[11px] text-primary opacity-0 transition-opacity group-hover:opacity-100">
                    Abrir workspace
                    <ArrowUpRight className="h-3 w-3" />
                  </span>
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
              placeholder="Pesquisar workflows, processos, responsáveis…"
              className="h-9 pl-9 text-sm"
            />
          </div>
          <div className="flex gap-1.5">
            {FILTERS.map((f) => (
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
              icon={<WorkflowIcon className="h-5 w-5" />}
              title="Nenhum workflow por aqui"
              description="Crie um workflow a partir de um processo já modelado para preparar a execução."
            />
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {visible.map((w) => (
                <WorkflowCard key={w.id} doc={w} />
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function WorkflowConnections({ objectId }: { objectId: string }) {
  const stats = useRelationshipStats(objectId);
  return <RelationshipIndicators stats={stats} compact />;
}

function WorkflowCard({ doc }: { doc: WorkflowDoc }) {
  const { score } = workflowReadiness(doc);
  return (
    <article className="group relative rounded-xl border bg-card p-4 transition-colors hover:border-primary/30">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            to="/workflow/$workflowId"
            params={{ workflowId: doc.id }}
            className="block truncate text-sm font-medium hover:underline"
          >
            {doc.name}
          </Link>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {doc.code} · {doc.processName} · {doc.owner}
          </p>
        </div>
        <button
          type="button"
          aria-label={doc.favorite ? "Remover dos favoritos" : "Favoritar"}
          onClick={() => updateWorkflowDoc(doc.id, { favorite: !doc.favorite })}
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <Star className={cn("h-4 w-4", doc.favorite && "fill-current text-primary")} />
        </button>
      </div>

      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
        {doc.description}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <LifecycleBadge state={stateFromLegacyStatus(lifecycleStatusOf(doc))} size="sm" />
        <Pill tone="bg-muted text-muted-foreground" size="sm">
          {doc.steps.length} etapas
        </Pill>
        <Pill tone="bg-muted text-muted-foreground" size="sm">
          {doc.participants.length} participantes
        </Pill>
        <Pill
          tone={
            score === 100
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
          }
          size="sm"
        >
          <Play className="mr-1 h-3 w-3" />
          {score}% pronto
        </Pill>
        <WorkflowConnections objectId={doc.id} />
      </div>
    </article>
  );
}
