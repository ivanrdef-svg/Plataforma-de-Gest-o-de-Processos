import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  BookOpen,
  Clock,
  LayoutGrid,
  ListChecks,
  Search,
  Star,
  TrendingUp,
} from "lucide-react";
import { PageContainer, SectionHeader } from "@/components/layout/page";
import { PLATFORM_MODULES } from "@/config/modules";
import {
  DEMO_FAVORITES,
  DEMO_WORKSPACES,
} from "@/config/workspace-demo";
import { useGlobalSearch } from "@/components/search/global-search-context";
import { ContinueWorking } from "@/components/home/continue-working";
import { ConnectedKnowledge } from "@/components/home/connected-knowledge";
import { ProcessesInProgress } from "@/components/home/processes-in-progress";
import { AwaitingActions } from "@/components/home/awaiting-actions";
import { GovernanceAttention } from "@/components/home/governance-attention";
import { WorkflowExecutionWidget } from "@/components/home/workflow-execution-widget";
import { RunningExecutions } from "@/components/home/running-executions";
import { MyTasks } from "@/components/home/my-tasks";
import { CardQuickActions } from "@/components/workspace/card-quick-actions";

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
          <span>Pesquisar processos, POPs, conhecimento e workspaces</span>
          <kbd className="ml-auto hidden rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] sm:inline-block">
            ⌘K
          </kbd>
        </button>
      </section>

      <div className="grid gap-10 lg:grid-cols-3">
        <div className="space-y-10 lg:col-span-2">
          <section>
            <SectionHeader
              title="Continue trabalhando"
              description="Últimos objetos abertos por você."
            />
            <ContinueWorking />
          </section>

          <section>
            <SectionHeader
              title="Continuar de onde parei"
              description="Retome o último objeto aberto."
            />
            <Link
              to="/workspaces/$workspaceId"
              params={{ workspaceId: DEMO_WORKSPACES[0]!.id }}
              className="group flex items-center gap-4 rounded-xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-float"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Clock className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{DEMO_WORKSPACES[0]!.name}</p>
                <p className="text-xs text-muted-foreground">
                  {DEMO_WORKSPACES[0]!.type} · {DEMO_WORKSPACES[0]!.version} ·{" "}
                  {DEMO_WORKSPACES[0]!.updatedAt}
                </p>
              </div>
              <ArrowUpRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
          </section>

          <section>
            <SectionHeader
              title="Workspaces recentes"
              action={
                <Link
                  to="/workspaces"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  Ver todos <ArrowUpRight className="h-3 w-3" />
                </Link>
              }
            />
            <div className="grid gap-3 sm:grid-cols-2">
              {DEMO_WORKSPACES.map((ws) => (
                <Link
                  key={ws.id}
                  to="/workspaces/$workspaceId"
                  params={{ workspaceId: ws.id }}
                  className="group rounded-xl border bg-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-float"
                >
                  <div className="flex items-center gap-2">
                    <LayoutGrid className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate text-sm font-medium">{ws.name}</span>
                    <CardQuickActions name={ws.name} className="ml-auto -mr-1" />
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {ws.description}
                  </p>
                  <p className="mt-3 text-[11px] text-muted-foreground/80">
                    {ws.owner} · {ws.updatedAt}
                  </p>
                </Link>
              ))}
            </div>
          </section>

          <AwaitingActions />

          <ProcessesInProgress />

          <GovernanceAttention />
          <WorkflowExecutionWidget />
          <RunningExecutions />

          <ConnectedKnowledge />


          <section>
            <SectionHeader title="Explorar conhecimento" description="Módulos da plataforma." />
            <div className="grid gap-3 sm:grid-cols-2">
              {PLATFORM_MODULES.slice(0, 6).map((module) => {
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
            <div className="divide-y rounded-xl border bg-card">
              {DEMO_FAVORITES.map((item) => (
                <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                  <Star className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <p className="min-w-0 truncate text-sm">{item.title}</p>
                  <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">
                    {item.type}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <SectionHeader
              title="Indicadores"
              description="Área reservada para indicadores futuros."
            />
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Processos", value: "—", icon: TrendingUp },
                { label: "POPs", value: "—", icon: BookOpen },
                { label: "Workflows", value: "—", icon: ListChecks },
                { label: "Riscos", value: "—", icon: TrendingUp },
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
