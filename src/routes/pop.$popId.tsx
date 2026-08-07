import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ChevronLeft,
  Copy,
  Download,
  FileText,
  Save,
  Share2,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { WorkspaceLayout } from "@/components/workspace/workspace-layout";
import { WorkspaceAiPanel } from "@/components/workspace/workspace-ai-panel";
import { WorkspaceStatusBar } from "@/components/workspace/workspace-status-bar";
import { WorkspaceContextBar } from "@/components/workspace/workspace-context-bar";
import { WorkspaceMeta } from "@/components/workspace/workspace-meta";
import { LifecycleBadge } from "@/components/lifecycle/lifecycle-badge";
import { LifecyclePanel, LifecycleTab } from "@/components/lifecycle/lifecycle-panel";
import { useLifecycle, type LifecycleSeed } from "@/lib/lifecycle-store";
import { PopSectionBlock } from "@/components/pop/pop-section-block";
import { PopSectionIndex } from "@/components/pop/pop-section-index";
import { PopMetadataPanel } from "@/components/pop/pop-metadata-panel";
import { PopRelations, PopHistory } from "@/components/pop/pop-relations";
import { RelationshipsTab } from "@/components/relationships/relationships-tab";
import { RelationshipSummary } from "@/components/relationships/relationship-summary";
import { EmptyState } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DEMO_ENVIRONMENT } from "@/config/workspace-demo";
import { POP_DEMO_RELATIONS } from "@/config/pop-structure";
import {
  duplicatePopDoc,
  updatePopDoc,
  updatePopSection,
  usePopDoc,
  type PopDoc,
  type PopSection,
} from "@/lib/pop-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pop/$popId")({
  component: PopWorkspace,
  head: () => ({
    meta: [
      { title: "POP Builder — Process Platform" },
      {
        name: "description",
        content:
          "Editor estruturado de Procedimentos Operacionais Padrão: seções, metadados, relacionamentos e histórico.",
      },
      { property: "og:title", content: "POP Builder — Process Platform" },
      {
        property: "og:description",
        content:
          "Crie POPs como objetos estruturados da plataforma, não como documentos de texto.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function PopEditor({
  doc,
  onSection,
}: {
  doc: PopDoc;
  onSection: (sectionId: string, patch: Partial<PopSection>) => void;
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [active, setActive] = useState(doc.sections[0]?.id);

  const goTo = (id: string) => {
    setActive(id);
    setCollapsed((c) => ({ ...c, [id]: false }));
    if (typeof document !== "undefined") {
      document
        .getElementById(`pop-section-${id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="flex gap-8">
      <aside className="sticky top-6 hidden h-fit w-56 shrink-0 md:block">
        <PopSectionIndex
          sections={doc.sections}
          activeId={active}
          onSelect={goTo}
        />
        <Separator className="my-3" />
        <div className="flex gap-2">
          <button
            type="button"
            className="text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => setCollapsed({})}
          >
            Expandir tudo
          </button>
          <span className="text-[11px] text-muted-foreground/50">·</span>
          <button
            type="button"
            className="text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            onClick={() =>
              setCollapsed(
                Object.fromEntries(doc.sections.map((s) => [s.id, true])),
              )
            }
          >
            Recolher tudo
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1 space-y-3">
        {doc.sections.map((section, i) => (
          <PopSectionBlock
            key={section.id}
            index={i}
            section={section}
            open={!collapsed[section.id]}
            onToggle={() =>
              setCollapsed((c) => ({ ...c, [section.id]: !c[section.id] }))
            }
            onChange={(patch) => onSection(section.id, patch)}
          />
        ))}
      </div>
    </div>
  );
}

function ActionButton({
  label,
  icon: Icon,
  onClick,
  active,
}: {
  label: string;
  icon: typeof Save;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label={label}
          onClick={onClick}
          className={cn("h-8 w-8 p-0", active && "text-primary")}
        >
          <Icon className={cn("h-4 w-4", active && "fill-current")} />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function PopWorkspace() {
  const { popId } = Route.useParams();
  const doc = usePopDoc(popId);

  const contextGroups = useMemo(
    () =>
      POP_DEMO_RELATIONS.map((g) => ({
        label: g.group,
        items: g.items.map((i) => i.name),
      })),
    [],
  );

  const lifecycleSeed: LifecycleSeed = {
    objectId: doc?.id ?? "",
    kind: "pop",
    name: doc?.name ?? "",
    owner: doc?.owner ?? "",
    status: doc?.status ?? "",
    updatedAt: doc?.savedAt ?? doc?.revisedAt ?? "",
  };
  const lifecycle = useLifecycle(lifecycleSeed);

  if (!doc) {
    return (
      <div className="p-10">
        <EmptyState
          icon={<FileText className="h-5 w-5" />}
          title="POP não encontrado"
          description="Crie um novo POP pelo menu Novo do Knowledge Center."
        />
      </div>
    );
  }

  const patch = (values: Partial<PopDoc>) => updatePopDoc(doc.id, values);

  return (
    <WorkspaceLayout
      title={doc.name}
      subtitle={doc.description}
      meta={
        <WorkspaceMeta
          items={[
            { label: "Código", value: doc.code },
            { label: "Tipo", value: "POP" },
            { label: "Categoria", value: doc.category },
            { label: "Versão", value: doc.version },
            {
              label: "Estado",
              value: <LifecycleBadge state={lifecycle.state} size="sm" />,
            },
            { label: "Responsável", value: doc.owner },
            { label: "Última revisão", value: doc.revisedAt },
          ]}
        />
      }
      actions={
        <>
          <ActionButton
            label="Salvar"
            icon={Save}
            onClick={() => {
              patch({});
              toast.success("POP salvo", {
                description: "Alterações guardadas localmente.",
              });
            }}
          />
          <ActionButton
            label="Duplicar"
            icon={Copy}
            onClick={() => {
              const copy = duplicatePopDoc(doc.id);
              toast.success("POP duplicado", { description: copy?.name });
            }}
          />
          <ActionButton
            label="Exportar"
            icon={Download}
            onClick={() =>
              toast("Exportar", { description: "Disponível em uma próxima build." })
            }
          />
          <ActionButton
            label="Compartilhar"
            icon={Share2}
            onClick={() =>
              toast("Compartilhar", {
                description: "Disponível em uma próxima build.",
              })
            }
          />
          <ActionButton
            label={doc.favorite ? "Remover dos favoritos" : "Favoritar"}
            icon={Star}
            active={doc.favorite}
            onClick={() => {
              patch({ favorite: !doc.favorite });
              toast(doc.favorite ? "Removido dos favoritos" : "Adicionado aos favoritos");
            }}
          />
          <Button asChild variant="ghost" size="sm" className="gap-1.5">
            <Link to="/knowledge">
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Knowledge Center</span>
            </Link>
          </Button>
        </>
      }
      contextBar={<WorkspaceContextBar groups={contextGroups} />}
      tabs={[
        {
          id: "estrutura",
          label: "Estrutura do POP",
          content: (
            <PopEditor
              key={doc.id}
              doc={doc}
              onSection={(sectionId, sectionPatch) =>
                updatePopSection(doc.id, sectionId, sectionPatch)
              }
            />
          ),
        },
        {
          id: "relacionamentos",
          label: "Relacionamentos",
          content: (
            <div className="space-y-8">
              <section className="space-y-3">
                <div>
                  <h2 className="text-sm font-medium">Resumo de relacionamentos</h2>
                  <p className="text-xs text-muted-foreground">
                    Normas, conhecimentos, processos, checklists, riscos e controles
                    ligados a este POP.
                  </p>
                </div>
                <RelationshipSummary objectId={doc.id} />
              </section>

              <section className="space-y-3">
                <h2 className="text-sm font-medium">Rede de relacionamentos</h2>
                <RelationshipsTab
                  objectId={doc.id}
                  objectName={doc.name}
                  objectType="POP"
                />
              </section>

              <section className="space-y-3">
                <h2 className="text-sm font-medium">Vínculos de referência</h2>
                <PopRelations />
              </section>
            </div>
          ),
        },
        {
          id: "historico",
          label: "Histórico",
          content: (
            <div className="space-y-10">
              <LifecycleTab seed={lifecycleSeed} />
              <PopHistory />
            </div>
          ),
        },
      ]}
      defaultTab="estrutura"
      sidePanel={
        <div className="space-y-6">
          <LifecyclePanel seed={lifecycleSeed} showTimeline={false} />
          <Separator />
          <PopMetadataPanel key={doc.id} doc={doc} onChange={patch} />
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
