import { createFileRoute } from "@tanstack/react-router";
import { LayoutGrid } from "lucide-react";
import { WorkspaceLayout } from "@/components/workspace/workspace-layout";
import { EmptyState } from "@/components/layout/page";

export const Route = createFileRoute("/workspaces")({
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

function WorkspacesPage() {
  return (
    <WorkspaceLayout
      title="Workspaces"
      subtitle="Todo objeto da plataforma é aberto e evoluído dentro de um workspace."
      contextBar={<span>Estrutura base pronta para os próximos módulos</span>}
      tabs={[
        {
          id: "todos",
          label: "Todos",
          content: (
            <EmptyState
              icon={<LayoutGrid className="h-5 w-5" />}
              title="Nenhum workspace criado"
              description="A criação de workspaces será habilitada em uma próxima sprint."
            />
          ),
        },
        {
          id: "meus",
          label: "Meus",
          content: (
            <EmptyState
              icon={<LayoutGrid className="h-5 w-5" />}
              title="Você ainda não participa de workspaces"
            />
          ),
        },
      ]}
      sidePanel={
        <div className="space-y-6">
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Contexto
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Painéis contextuais mostram propriedades, relacionamentos, histórico e o
              assistente de IA do objeto aberto.
            </p>
          </div>
        </div>
      }
      statusBar={<span>Pronto</span>}
    />
  );
}
