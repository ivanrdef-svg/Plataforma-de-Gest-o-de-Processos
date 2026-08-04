import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, ChevronLeft, FileText, History, Share2 } from "lucide-react";
import { WorkspaceLayout } from "@/components/workspace/workspace-layout";
import { WorkspaceAiPanel } from "@/components/workspace/workspace-ai-panel";
import { WorkspaceStatusBar } from "@/components/workspace/workspace-status-bar";
import { WorkspaceContextBar } from "@/components/workspace/workspace-context-bar";
import { WorkspaceMeta, WorkspaceStatusPill } from "@/components/workspace/workspace-meta";
import { EmptyState } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import { DEMO_ENVIRONMENT, DEMO_RELATIONS } from "@/config/workspace-demo";
import { KNOWLEDGE_PACKAGES, getKnowledgePackage } from "@/config/knowledge-demo";

export const Route = createFileRoute("/knowledge/$packageId")({
  component: KnowledgePackageWorkspace,
  head: () => ({
    meta: [
      { title: "Knowledge Package — Process Platform" },
      {
        name: "description",
        content:
          "Workspace de um Knowledge Package: resumo, conteúdo, relacionamentos e histórico.",
      },
      { property: "og:title", content: "Knowledge Package — Process Platform" },
      {
        property: "og:description",
        content:
          "Workspace de um Knowledge Package: resumo, conteúdo, relacionamentos e histórico.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function KnowledgePackageWorkspace() {
  const { packageId } = Route.useParams();
  const pkg = getKnowledgePackage(packageId) ?? KNOWLEDGE_PACKAGES[0]!;

  return (
    <WorkspaceLayout
      title={pkg.name}
      subtitle={pkg.description}
      meta={
        <WorkspaceMeta
          items={[
            { label: "Tipo", value: "Knowledge Package" },
            { label: "Categoria", value: pkg.category },
            { label: "Versão", value: pkg.version },
            { label: "Status", value: <WorkspaceStatusPill status={pkg.status} /> },
            { label: "Responsável", value: pkg.owner },
            { label: "Atualizado", value: pkg.updatedAt },
          ]}
        />
      }
      actions={
        <Button asChild variant="ghost" size="sm" className="gap-1.5">
          <Link to="/knowledge">
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Knowledge Center</span>
          </Link>
        </Button>
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
              icon={<BookOpen className="h-5 w-5" />}
              title="Resumo do Knowledge Package"
              description="Visão consolidada do pacote de conhecimento será construída nas próximas builds."
            />
          ),
        },
        {
          id: "conteudo",
          label: "Conteúdo",
          content: (
            <EmptyState
              icon={<FileText className="h-5 w-5" />}
              title="Conteúdo estruturado"
              description="Artigos, blocos e mídias do pacote de conhecimento chegam em breve."
            />
          ),
        },
        {
          id: "relacionamentos",
          label: "Relacionamentos",
          content: (
            <EmptyState
              icon={<Share2 className="h-5 w-5" />}
              title="Relacionamentos"
              description="Conexões deste conhecimento com processos, POPs, riscos e controles."
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
              description="Trilha completa de alterações e aprovações do pacote."
            />
          ),
        },
      ]}
      sidePanel={<WorkspaceAiPanel />}
      statusBar={
        <WorkspaceStatusBar
          status={DEMO_ENVIRONMENT.status}
          lastSync={DEMO_ENVIRONMENT.lastSync}
          version={`${pkg.version} · ${DEMO_ENVIRONMENT.version}`}
          environment={DEMO_ENVIRONMENT.environment}
        />
      }
    />
  );
}
