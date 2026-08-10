import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, ChevronLeft } from "lucide-react";
import { RelationshipsTab } from "@/components/relationships/relationships-tab";
import { RelationshipIndicators } from "@/components/relationships/relationship-badges";
import { useRelationshipStats } from "@/lib/relationship-store";
import { WorkspaceLayout } from "@/components/workspace/workspace-layout";
import { WorkspaceAiPanel } from "@/components/workspace/workspace-ai-panel";
import { WorkspaceStatusBar } from "@/components/workspace/workspace-status-bar";
import { WorkspaceContextBar } from "@/components/workspace/workspace-context-bar";
import { WorkspaceMeta } from "@/components/workspace/workspace-meta";
import { LifecycleBadge } from "@/components/lifecycle/lifecycle-badge";
import { GovernanceTab } from "@/components/governance/governance-tab";
import { LifecyclePanel, LifecycleTab } from "@/components/lifecycle/lifecycle-panel";
import { useLifecycle, type LifecycleSeed } from "@/lib/lifecycle-store";
import { WorkspaceHeaderActions } from "@/components/workspace/workspace-header-actions";
import { BlockEditor } from "@/components/knowledge/block-editor";
import { KnowledgePropertiesPanel } from "@/components/knowledge/knowledge-properties-panel";
import { EmptyState } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { DEMO_ENVIRONMENT, DEMO_RELATIONS } from "@/config/workspace-demo";
import {
  useKnowledgeDocs,
  updateKnowledgeDoc,
  type KnowledgeDoc,
} from "@/lib/knowledge-store";

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

function KnowledgeSummary({ doc }: { doc: KnowledgeDoc }) {
  const stats = useRelationshipStats(doc.id);
  return (
    <div className="max-w-3xl space-y-6">
      <p className="text-sm leading-relaxed text-muted-foreground">{doc.description}</p>
      <RelationshipIndicators stats={stats} />
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: "Blocos de conteúdo", value: doc.blocks.length },
          { label: "Objetos conectados", value: stats.total },
          { label: "Tags", value: doc.tags.length },
          { label: "Palavras-chave", value: doc.keywords.length },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border bg-card px-4 py-3">
            <p className="text-[11px] text-muted-foreground">{item.label}</p>
            <p className="mt-1 text-xl font-semibold tracking-tight">{item.value}</p>
          </div>
        ))}
      </div>
      {doc.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {doc.tags.map((t) => (
            <span
              key={t}
              className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function KnowledgePackageWorkspace() {
  const { packageId } = Route.useParams();
  const docs = useKnowledgeDocs();
  const doc = docs.find((d) => d.id === packageId) ?? docs[0];

  const lifecycleSeed: LifecycleSeed = {
    objectId: doc?.id ?? "",
    kind: "knowledge",
    name: doc?.name ?? "",
    owner: doc?.owner ?? "",
    status: doc?.status ?? "",
    updatedAt: doc?.updatedAt ?? "",
  };
  const lifecycle = useLifecycle(lifecycleSeed);

  if (!doc) {
    return (
      <div className="p-10">
        <EmptyState
          icon={<BookOpen className="h-5 w-5" />}
          title="Knowledge Package não encontrado"
          description="Volte ao Knowledge Center para escolher outro pacote de conhecimento."
        />
      </div>
    );
  }

  const patch = (values: Partial<KnowledgeDoc>) => {
    updateKnowledgeDoc(doc.id, values);
  };

  return (
    <WorkspaceLayout
      title={doc.name}
      subtitle={doc.description}
      meta={
        <WorkspaceMeta
          items={[
            { label: "Tipo", value: doc.type },
            { label: "Categoria", value: doc.category },
            { label: "Versão", value: doc.version },
            {
              label: "Estado",
              value: <LifecycleBadge state={lifecycle.state} size="sm" />,
            },
            { label: "Responsável", value: doc.owner },
            { label: "Atualizado", value: doc.updatedAt },
          ]}
        />
      }
      actions={
        <>
          <WorkspaceHeaderActions name={doc.name} />
          <Button asChild variant="ghost" size="sm" className="gap-1.5">
            <Link to="/knowledge">
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Knowledge Center</span>
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
          content: <KnowledgeSummary doc={doc} />,
        },
        {
          id: "conteudo",
          label: "Conteúdo",
          content: (
            <BlockEditor
              key={doc.id}
              blocks={doc.blocks}
              onChange={(blocks) => {
                const first = blocks[0];
                const name =
                  first?.type === "title" && first.text?.trim()
                    ? first.text.trim()
                    : doc.name;
                patch({ blocks, name });
              }}
            />

          ),
        },
        {
          id: "relacionamentos",
          label: "Relacionamentos",
          content: (
            <RelationshipsTab
              objectId={doc.id}
              objectName={doc.name}
              objectType={doc.type}
            />
          ),
        },
        {
          id: "governanca",
          label: "Governança",
          content: <GovernanceTab seed={lifecycleSeed} lifecycleSeed={lifecycleSeed} />,
        },
        {
          id: "historico",
          label: "Histórico",
          content: <LifecycleTab seed={lifecycleSeed} />,
        },
      ]}
      defaultTab="conteudo"
      sidePanel={
        <div className="space-y-6">
          <LifecyclePanel seed={lifecycleSeed} showTimeline={false} />
          <Separator />
          <KnowledgePropertiesPanel key={doc.id} doc={doc} onChange={patch} />
          <Separator />
          <WorkspaceAiPanel />
        </div>
      }
      statusBar={
        <WorkspaceStatusBar
          status={DEMO_ENVIRONMENT.status}
          lastSync={DEMO_ENVIRONMENT.lastSync}
          version={`${doc.version} · ${DEMO_ENVIRONMENT.version}`}
          environment={DEMO_ENVIRONMENT.environment}
        />
      }
    />
  );
}
