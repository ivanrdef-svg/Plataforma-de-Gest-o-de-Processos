import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, FileText, GitBranch, History } from "lucide-react";
import { RelationshipsTab } from "@/components/relationships/relationships-tab";
import { WorkspaceLayout } from "@/components/workspace/workspace-layout";
import { WorkspaceAiPanel } from "@/components/workspace/workspace-ai-panel";
import { WorkspaceStatusBar } from "@/components/workspace/workspace-status-bar";
import { WorkspaceContextBar } from "@/components/workspace/workspace-context-bar";
import { WorkspaceMeta, WorkspaceStatusPill } from "@/components/workspace/workspace-meta";
import { WorkspaceHeaderActions } from "@/components/workspace/workspace-header-actions";
import { EmptyState } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import {
  DEMO_ENVIRONMENT,
  DEMO_RELATIONS,
  DEMO_WORKSPACES,
} from "@/config/workspace-demo";

export const Route = createFileRoute("/workspaces/$workspaceId")({
  component: WorkspaceDetail,
  head: () => ({
    meta: [
      { title: "Workspace — Process Platform" },
      {
        name: "description",
        content:
          "Workspace com header, context bar, abas, painel lateral e barra de status.",
      },
      { property: "og:title", content: "Workspace — Process Platform" },
      {
        property: "og:description",
        content:
          "Workspace com header, context bar, abas, painel lateral e barra de status.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function WorkspaceDetail() {
  const { workspaceId } = Route.useParams();
  const ws = DEMO_WORKSPACES.find((w) => w.id === workspaceId) ?? DEMO_WORKSPACES[0]!;

  return (
    <WorkspaceLayout
      title={ws.name}
      subtitle={ws.description}
      meta={
        <WorkspaceMeta
          items={[
            { label: "Tipo", value: ws.type },
            { label: "Versão", value: ws.version },
            { label: "Status", value: <WorkspaceStatusPill status={ws.status} /> },
            { label: "Responsável", value: ws.owner },
            { label: "Atualizado", value: ws.updatedAt },
          ]}
        />
      }
      actions={
        <>
          <WorkspaceHeaderActions name={ws.name} />
          <Button asChild variant="ghost" size="sm" className="gap-1.5">
            <Link to="/workspaces">
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Workspaces</span>
            </Link>
          </Button>
        </>
      }
      contextBar={
        <WorkspaceContextBar
          groups={[
            { label: "Relacionamentos", items: DEMO_RELATIONS.relacionamentos },
            { label: "Dependências", items: DEMO_RELATIONS.dependencias },
            { label: "Impactos", items: DEMO_RELATIONS.impactos },
            { label: "Objetos relacionados", items: DEMO_RELATIONS.objetos },
          ]}
        />
      }
      tabs={[
        {
          id: "resumo",
          label: "Resumo",
          content: (
            <EmptyState
              icon={<FileText className="h-5 w-5" />}
              title="Resumo do objeto"
              description="Visão consolidada do objeto será construída nas próximas sprints."
            />
          ),
        },
        {
          id: "documentacao",
          label: "Documentação",
          content: (
            <EmptyState
              icon={<FileText className="h-5 w-5" />}
              title="Documentação"
              description="Editor estruturado de conhecimento e POP chega em breve."
            />
          ),
        },
        {
          id: "relacionamentos",
          label: "Relacionamentos",
          content: (
            <RelationshipsTab
              objectId={ws.id}
              objectName={ws.name}
              objectType={ws.type}
            />
          ),
        },
        {
          id: "historico",
          label: "Histórico",
          content: (
            <EmptyState
              icon={<History className="h-5 w-5" />}
              title="Histórico de versões"
              description="Trilha completa de alterações e aprovações."
            />
          ),
        },
      ]}
      sidePanel={<WorkspaceAiPanel />}
      statusBar={
        <WorkspaceStatusBar
          status={DEMO_ENVIRONMENT.status}
          lastSync={DEMO_ENVIRONMENT.lastSync}
          version={`${ws.version} · ${DEMO_ENVIRONMENT.version}`}
          environment={DEMO_ENVIRONMENT.environment}
        />
      }
    >
      <EmptyState icon={<GitBranch className="h-5 w-5" />} title="Sem conteúdo" />
    </WorkspaceLayout>
  );
}
