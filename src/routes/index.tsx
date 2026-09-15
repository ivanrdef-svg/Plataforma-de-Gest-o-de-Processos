import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  BookOpen,
  ListChecks,
  Search,
  Star,
  TrendingUp,
} from "lucide-react";
import { PageContainer, SectionHeader } from "@/components/layout/page";
import { PLATFORM_MODULES } from "@/config/modules";
import { useGlobalSearch } from "@/components/search/global-search-context";
import { ConnectedKnowledge } from "@/components/home/connected-knowledge";
import { ProcessesInProgress } from "@/components/home/processes-in-progress";
import { AwaitingActions } from "@/components/home/awaiting-actions";
import { GovernanceAttention } from "@/components/home/governance-attention";
import { WorkflowExecutionWidget } from "@/components/home/workflow-execution-widget";
import { RunningExecutions } from "@/components/home/running-executions";
import { MyTasks } from "@/components/home/my-tasks";
import { SlaAttention } from "@/components/home/sla-attention";
import { EmptyState } from "@/components/layout/page";
import { getAuthoringProcessVersion, useProcessDocs } from "@/lib/process-store";
import { usePopDocs } from "@/lib/pop-store";
import { useWorkflowDocs } from "@/lib/workflow-store";

export const Route = createFileRoute("/")({
  component: Launchpad,
  head: () => ({
    meta: [
      { title: "Launchpad — Process Platform" },
      {
        name: "description",
        content:
          "Ponto de partida da plataforma: pesquisa global, workspaces recentes, tarefas e conhecimento.",
      },
      { property: "og:title", content: "Launchpad — Process Platform" },
      {
        property: "og:description",
        content:
          "Ponto de partida da plataforma: pesquisa global, workspaces recentes, tarefas e conhecimento.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function Launchpad() {
  const { open } = useGlobalSearch();
  const processes = useProcessDocs();
  const pops = usePopDocs();
  const workflows = useWorkflowDocs();
  const favorites = processes.filter((process) => process.favorite);
  const visibleModules = PLATFORM_MODULES.filter((module) => module.id !== "workspaces").slice(
    0,
    6,
  );

  return (
    <PageContainer>
      <section className="mb-12">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Launchpad
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
          Comece pelo conhecimento
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
          O conhecimento origina o processo, o BPM o representa, o workflow o executa
          e a analytics o mede.
        </p>

        <button
          type="button"
          onClick={open}
          className="mt-6 flex h-12 w-full max-w-2xl items-center gap-3 rounded-xl border bg-card px-4 text-left text-sm text-muted-foreground shadow-soft transition-shadow hover:shadow-float"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span>Pesquisar processos, POPs, conhecimento e workflows</span>
          <kbd className="ml-auto hidden rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] sm:inline-block">
            ⌘K
          </kbd>
        </button>
      </section>

      <div className="grid gap-10 lg:grid-cols-3">
        <div className="space-y-10 lg:col-span-2">
          <AwaitingActions />

          <ProcessesInProgress />

          <SlaAttention />

          <GovernanceAttention />
          <WorkflowExecutionWidget />
          <RunningExecutions />

          <ConnectedKnowledge />


          <section>
            <SectionHeader title="Explorar conhecimento" description="Módulos da plataforma." />
            <div className="grid gap-3 sm:grid-cols-2">
              {visibleModules.map((module) => {
                const Icon = module.icon;
                return (
                  <div
                    key={module.id}
                    className="group rounded-xl border bg-card p-4 transition-shadow hover:shadow-soft"
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{module.name}</span>
                      {module.status !== "available" && (
                        <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                          em breve
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      {module.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <div className="space-y-10">
          <MyTasks />


          <section>
            <SectionHeader
              title="Favoritos"
              action={
                <Link
                  to="/favoritos"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  Ver todos <ArrowUpRight className="h-3 w-3" />
                </Link>
              }
            />
            {favorites.length === 0 ? (
              <EmptyState
                icon={<Star className="h-5 w-5" />}
                title="Nenhum favorito ainda"
              />
            ) : (
              <div className="divide-y rounded-xl border bg-card">
                {favorites.map((process) => {
                  const definition = getAuthoringProcessVersion(process)?.definition;
                  if (!definition) return null;
                  return (
                    <Link
                      key={process.id}
                      to="/processos/$processId"
                      params={{ processId: process.id }}
                      className="flex items-center gap-3 px-4 py-3"
                    >
                      <Star className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <p className="min-w-0 truncate text-sm">{definition.name}</p>
                      <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">
                        Processo
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          <section>
            <SectionHeader
              title="Indicadores"
              description="Área reservada para indicadores futuros."
            />
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Processos", value: processes.length, icon: TrendingUp },
                { label: "POPs", value: pops.length, icon: BookOpen },
                { label: "Workflows", value: workflows.length, icon: ListChecks },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border bg-card p-4">
                  <p className="text-[11px] text-muted-foreground">{item.label}</p>
                  <p className="mt-1 text-xl font-semibold tracking-tight">{item.value}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </PageContainer>
  );
}
