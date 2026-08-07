import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ChevronLeft,
  Copy,
  Download,
  Save,
  Share2,
  Star,
  Workflow,
} from "lucide-react";
import { toast } from "sonner";
import { WorkspaceLayout } from "@/components/workspace/workspace-layout";
import { WorkspaceAiPanel } from "@/components/workspace/workspace-ai-panel";
import { WorkspaceStatusBar } from "@/components/workspace/workspace-status-bar";
import { WorkspaceContextBar } from "@/components/workspace/workspace-context-bar";
import { WorkspaceMeta, WorkspaceStatusPill } from "@/components/workspace/workspace-meta";
import { ProcessSectionBlock } from "@/components/process/process-section-block";
import { ProcessSteps } from "@/components/process/process-steps";
import { ProcessOrigin } from "@/components/process/process-origin";
import { BpmDesigner } from "@/components/bpm/bpm-designer";
import { ProcessMetadataPanel } from "@/components/process/process-metadata-panel";
import { RelationshipsTab } from "@/components/relationships/relationships-tab";
import { RelationshipSummary } from "@/components/relationships/relationship-summary";
import { EmptyState } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DEMO_ENVIRONMENT } from "@/config/workspace-demo";
import {
  PROCESS_DEMO_HISTORY,
  PROCESS_DEMO_ORIGIN,
} from "@/config/process-structure";
import {
  addProcessStep,
  duplicateProcessDoc,
  moveProcessStep,
  removeProcessStep,
  updateProcessDoc,
  updateProcessSection,
  updateProcessStep,
  useProcessDoc,
  type ProcessDoc,
} from "@/lib/process-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/processos/$processId")({
  component: ProcessWorkspace,
  head: () => ({
    meta: [
      { title: "Process Builder — Process Platform" },
      {
        name: "description",
        content:
          "Modelagem estruturada de processos: escopo, entradas, saídas, etapas, origem no conhecimento e relacionamentos.",
      },
      { property: "og:title", content: "Process Builder — Process Platform" },
      {
        property: "og:description",
        content:
          "Modele processos como entidades estruturadas, prontos para a futura modelagem BPM.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

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

function ProcessStructure({ doc }: { doc: ProcessDoc }) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [active, setActive] = useState(doc.sections[0]?.id);

  const goTo = (id: string) => {
    setActive(id);
    setCollapsed((c) => ({ ...c, [id]: false }));
    if (typeof document !== "undefined") {
      document
        .getElementById(`process-section-${id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="flex gap-8">
      <aside className="sticky top-6 hidden h-fit w-56 shrink-0 md:block">
        <nav aria-label="Seções do processo" className="space-y-0.5">
          <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground/80">
            Estrutura
          </p>
          {doc.sections.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => goTo(s.id)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                active === s.id
                  ? "bg-muted font-medium text-foreground"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              <span className="tabular-nums text-[10px] text-muted-foreground/70">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="truncate">{s.title}</span>
            </button>
          ))}
        </nav>
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
              setCollapsed(Object.fromEntries(doc.sections.map((s) => [s.id, true])))
            }
          >
            Recolher tudo
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1 space-y-3">
        {doc.sections.map((section, i) => (
          <ProcessSectionBlock
            key={section.id}
            index={i}
            section={section}
            open={!collapsed[section.id]}
            onToggle={() =>
              setCollapsed((c) => ({ ...c, [section.id]: !c[section.id] }))
            }
            onChange={(patch) => updateProcessSection(doc.id, section.id, patch)}
          />
        ))}
      </div>
    </div>
  );
}

function ProcessHistory() {
  return (
    <ol className="relative space-y-6 border-l pl-6">
      {PROCESS_DEMO_HISTORY.map((event) => (
        <li key={`${event.date}-${event.title}`} className="relative">
          <span className="absolute -left-[27px] top-1.5 h-2 w-2 rounded-full bg-primary/60 ring-4 ring-background" />
          <p className="text-[11px] text-muted-foreground">{event.date}</p>
          <p className="mt-0.5 text-sm font-medium">{event.title}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {event.detail}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground/80">por {event.author}</p>
        </li>
      ))}
    </ol>
  );
}

function ProcessWorkspace() {
  const { processId } = Route.useParams();
  const doc = useProcessDoc(processId);

  if (!doc) {
    return (
      <div className="p-10">
        <EmptyState
          icon={<Workflow className="h-5 w-5" />}
          title="Processo não encontrado"
          description="Volte ao Process Center para escolher ou criar um processo."
        />
      </div>
    );
  }

  const patch = (values: Partial<ProcessDoc>) => updateProcessDoc(doc.id, values);

  return (
    <WorkspaceLayout
      title={doc.name}
      subtitle={doc.description}
      meta={
        <WorkspaceMeta
          items={[
            { label: "Código", value: doc.code },
            { label: "Tipo", value: "Processo" },
            { label: "Categoria", value: doc.category },
            { label: "Versão", value: doc.version },
            { label: "Status", value: <WorkspaceStatusPill status={doc.status} /> },
            { label: "Responsável", value: doc.owner },
            { label: "Etapas", value: String(doc.steps.length) },
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
              toast.success("Processo salvo", {
                description: "Alterações guardadas localmente.",
              });
            }}
          />
          <ActionButton
            label="Duplicar"
            icon={Copy}
            onClick={() => {
              const copy = duplicateProcessDoc(doc.id);
              toast.success("Processo duplicado", { description: copy?.name });
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
            <Link to="/processos">
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Process Center</span>
            </Link>
          </Button>
        </>
      }
      contextBar={
        <WorkspaceContextBar
          groups={PROCESS_DEMO_ORIGIN.map((g) => ({
            label: g.group,
            items: g.items.map((i) => i.name),
          }))}
        />
      }
      tabs={[
        {
          id: "estrutura",
          label: "Estrutura",
          content: <ProcessStructure key={doc.id} doc={doc} />,
        },
        {
          id: "etapas",
          label: "Etapas",
          content: (
            <ProcessSteps
              steps={doc.steps}
              onChange={(id, p) => updateProcessStep(doc.id, id, p)}
              onMove={(id, delta) => moveProcessStep(doc.id, id, delta)}
              onRemove={(id) => removeProcessStep(doc.id, id)}
              onAdd={() => addProcessStep(doc.id)}
            />
          ),
        },
        {
          id: "origem",
          label: "Origem",
          content: <ProcessOrigin processName={doc.name} />,
        },
        {
          id: "bpmn",
          label: "Modelagem BPM",
          content: <BpmDesigner key={doc.id} doc={doc} />,
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
                    Conhecimentos, POPs, normas, riscos e controles ligados a este
                    processo.
                  </p>
                </div>
                <RelationshipSummary objectId={doc.id} />
              </section>

              <section className="space-y-3">
                <h2 className="text-sm font-medium">Rede de relacionamentos</h2>
                <RelationshipsTab
                  objectId={doc.id}
                  objectName={doc.name}
                  objectType="Processo"
                />
              </section>
            </div>
          ),
        },
        { id: "historico", label: "Histórico", content: <ProcessHistory /> },
      ]}
      defaultTab="estrutura"
      sidePanel={
        <div className="space-y-6">
          <ProcessMetadataPanel key={doc.id} doc={doc} onChange={patch} />
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
