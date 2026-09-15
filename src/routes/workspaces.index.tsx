import { createFileRoute } from "@tanstack/react-router";
import { LayoutGrid } from "lucide-react";
import { WorkspaceLayout } from "@/components/workspace/workspace-layout";
import { WorkspaceAiPanel } from "@/components/workspace/workspace-ai-panel";
import { EmptyState } from "@/components/layout/page";

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
    <EmptyState
      icon={<LayoutGrid className="h-5 w-5" />}
      title="Nenhum workspace disponível"
      description="Os objetos reais continuam acessíveis pelos respectivos módulos."
    />
  );
}

function WorkspacesPage() {
  return (
    <WorkspaceLayout
      title="Workspaces"
      subtitle="Todo objeto da plataforma é aberto e evoluído dentro de um workspace."
      contextBar={<span>0 workspaces</span>}
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
    />
  );
}
