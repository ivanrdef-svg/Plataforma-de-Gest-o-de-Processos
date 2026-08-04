import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, LayoutGrid } from "lucide-react";
import { WorkspaceLayout } from "@/components/workspace/workspace-layout";
import { WorkspaceAiPanel } from "@/components/workspace/workspace-ai-panel";
import { WorkspaceStatusBar } from "@/components/workspace/workspace-status-bar";
import { WorkspaceStatusPill } from "@/components/workspace/workspace-meta";
import { EmptyState } from "@/components/layout/page";
import { DEMO_ENVIRONMENT, DEMO_WORKSPACES } from "@/config/workspace-demo";

export const Route = createFileRoute("/workspaces/")({
  component: WorkspacesPage,
  head: () => ({
    meta: [
      { title: "Workspaces — Process Platform" },
      {
        name: "description",
        content:
          "Espaços de trabalho onde processos, conhecimento e procedimentos são construídos.",
      },
      { property: "og:title", content: "Workspaces — Process Platform" },
      {
        property: "og:description",
        content:
          "Espaços de trabalho onde processos, conhecimento e procedimentos são construídos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function WorkspaceCards() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {DEMO_WORKSPACES.map((ws) => (
        <Link
          key={ws.id}
          to="/workspaces/$workspaceId"
          params={{ workspaceId: ws.id }}
          className="group rounded-xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-float"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{ws.name}</span>
            <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            <WorkspaceStatusPill status={ws.status} className="ml-auto" />
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {ws.description}
          </p>
          <p className="mt-3 text-[11px] text-muted-foreground/80">
            {ws.type} · {ws.version} · {ws.owner} · {ws.updatedAt}
          </p>
        </Link>
      ))}
    </div>
  );
}

function WorkspacesPage() {
  return (
    <WorkspaceLayout
      title="Workspaces"
      subtitle="Todo objeto da plataforma é aberto e evoluído dentro de um workspace."
      contextBar={<span>Estrutura base pronta para os próximos módulos</span>}
      tabs={[
        { id: "todos", label: "Todos", content: <WorkspaceCards /> },
        {
          id: "meus",
          label: "Meus",
          content: (
            <EmptyState
              icon={<LayoutGrid className="h-5 w-5" />}
              title="Você ainda não participa de workspaces"
              description="A associação de pessoas a workspaces chega em uma próxima sprint."
            />
          ),
        },
      ]}
      sidePanel={<WorkspaceAiPanel />}
      statusBar={
        <WorkspaceStatusBar
          status={DEMO_ENVIRONMENT.status}
          lastSync={DEMO_ENVIRONMENT.lastSync}
          version={DEMO_ENVIRONMENT.version}
          environment={DEMO_ENVIRONMENT.environment}
        />
      }
    />
  );
}
