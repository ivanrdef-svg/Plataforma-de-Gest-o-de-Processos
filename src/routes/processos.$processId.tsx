import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, Copy, Download, FileText, Save, Share2, Star, Workflow } from "lucide-react";
import { toast } from "sonner";
import { WorkspaceLayout } from "@/components/workspace/workspace-layout";
import { WorkspaceAiPanel } from "@/components/workspace/workspace-ai-panel";
import { WorkspaceStatusBar } from "@/components/workspace/workspace-status-bar";
import { WorkspaceContextBar } from "@/components/workspace/workspace-context-bar";
import { WorkspaceMeta } from "@/components/workspace/workspace-meta";
import { LifecycleBadge } from "@/components/lifecycle/lifecycle-badge";
import { GovernanceTab } from "@/components/governance/governance-tab";
import { LifecyclePanel, LifecycleTab } from "@/components/lifecycle/lifecycle-panel";
import { useLifecycle, type LifecycleSeed } from "@/lib/lifecycle-store";
import { ProcessSectionBlock } from "@/components/process/process-section-block";
import { ProcessSteps } from "@/components/process/process-steps";
import { ProcessOrigin } from "@/components/process/process-origin";
import { ProcessRules } from "@/components/process/process-rules";
import { ProcessParticipants } from "@/components/process/process-participants";
import { ProcessTimeline } from "@/components/process/process-timeline";
import { ProcessConsistencyPanel } from "@/components/process/process-consistency-panel";
import { BpmReadinessBanner } from "@/components/process/bpm-readiness";
import { BpmDesigner } from "@/components/bpm/bpm-designer";
import { ProcessMetadataPanel } from "@/components/process/process-metadata-panel";
import { RelationshipsTab } from "@/components/relationships/relationships-tab";
import { RelationshipSummary } from "@/components/relationships/relationship-summary";
import { EmptyState } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { usePopsForProcess } from "@/lib/pop-store";
import { useProcessStepMappings } from "@/lib/pop-process-step-mapping-store";

import { DEMO_ENVIRONMENT } from "@/config/workspace-demo";
import { PROCESS_DEMO_HISTORY, PROCESS_DEMO_ORIGIN } from "@/config/process-structure";
import {
  addProcessParticipant,
  addProcessRule,
  addProcessStep,
  ensureProcessModel,
  removeProcessParticipant,
  removeProcessRule,
  toggleParticipantStep,
  updateProcessParticipant,
  updateProcessRule,
  duplicateProcessDoc,
  moveProcessStep,
  removeProcessStep,
  updateProcessDoc,
  updateWorkingProcessDefinition,
  createProcessVersion,
  publishProcessVersion,
  getProcessVersion,
  getAuthoringProcessVersion,
  updateProcessSection,
  updateProcessStep,
  useProcessDoc,
  type ProcessDefinition,
} from "@/lib/process-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/processos/$processId")({
  validateSearch: (search: Record<string, unknown>): { tab?: "bpmn"; versionId?: string } => ({
    ...(typeof search["versionId"] === "string" ? { versionId: search["versionId"] } : {}),
    ...(search["tab"] === "bpmn" ? { tab: "bpmn" as const } : {}),
  }),
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
  disabled,
}: {
  label: string;
  icon: typeof Save;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label={label}
          disabled={disabled}
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

function ProcessStructure({ processId, definition, editable }: {
  processId: string;
  definition: ProcessDefinition;
  editable: boolean;
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [active, setActive] = useState(definition.sections[0]?.id);

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
          {definition.sections.map((s, i) => (
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
            onClick={() => setCollapsed(Object.fromEntries(definition.sections.map((s) => [s.id, true])))}
          >
            Recolher tudo
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1 space-y-3">
        {definition.sections.map((section, i) => (
          <ProcessSectionBlock
            key={section.id}
            index={i}
            section={section}
            open={!editable || !collapsed[section.id]}
            onToggle={() => setCollapsed((c) => ({ ...c, [section.id]: !c[section.id] }))}
            onChange={(patch) => editable && updateProcessSection(processId, section.id, patch)}
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
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{event.detail}</p>
          <p className="mt-1 text-[11px] text-muted-foreground/80">por {event.author}</p>
        </li>
      ))}
    </ol>
  );
}

/** Build 028 — POPs estruturalmente vinculados a este Processo. */
function LinkedPopsSection({ processId }: { processId: string }) {
  const linkedPops = usePopsForProcess(processId);
  // Build 029 — contagem derivada de seções mapeadas (somente leitura).
  const mappings = useProcessStepMappings(processId);

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-medium">POPs vinculados</h2>
        <p className="text-xs text-muted-foreground">
          Procedimentos Operacionais Padrão estruturalmente ligados a este processo.
        </p>
      </div>

      {linkedPops.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-5 w-5" />}
          title="Nenhum POP vinculado a este Processo."
          description="O vínculo é criado a partir do workspace de cada POP."
        />
      ) : (
        <div className="space-y-2">
          {linkedPops.map((pop) => (
            <Card key={pop.id} className="transition-colors hover:bg-muted/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <Link
                      to="/pop/$popId"
                      params={{ popId: pop.id }}
                      className="block truncate text-sm font-medium text-foreground hover:underline"
                    >
                      {pop.name}
                    </Link>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      {pop.code} · v{pop.version} · {pop.owner}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-[11px] text-muted-foreground">
                      {
                        mappings.filter((m) => m.popId === pop.id && m.status === "confirmado")
                          .length
                      }{" "}
                      seções mapeadas
                    </span>
                    <Pill size="sm">{pop.status}</Pill>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

function ProcessWorkspace() {
  const { processId } = Route.useParams();
  const { tab, versionId } = Route.useSearch();
  const navigate = Route.useNavigate();
  const processDoc = useProcessDoc(processId);
  const doc = processDoc;
  // HISTORICAL_EXPLICIT when versionId is supplied; otherwise AUTHORING_VERSION.
  const selectedVersion = doc
    ? (versionId ? getProcessVersion(doc, versionId) : getAuthoringProcessVersion(doc))
    : undefined;
  const selectedDefinition = selectedVersion?.definition;
  const authoringDefinition = doc ? getAuthoringProcessVersion(doc)?.definition : undefined;
  const editable = Boolean(
    selectedVersion && selectedVersion.id === doc?.workingVersionId &&
    selectedVersion.status === "rascunho",
  );

  /* Build 007 — injeta os blocos do modelo organizacional em processos
     criados em builds anteriores, preservando todo o conteúdo existente. */
  useEffect(() => {
    if (editable) ensureProcessModel(processId);
  }, [processId, editable]);

  const lifecycleSeed: LifecycleSeed = {
    objectId: doc?.id ?? "",
    kind: "processo",
    name: authoringDefinition?.name ?? "",
    owner: authoringDefinition?.owner ?? "",
    status: doc?.legacyLifecycleSeedStatus ?? "",
    updatedAt: doc?.savedAt ?? doc?.createdAt ?? "",
  };
  const lifecycle = useLifecycle(lifecycleSeed);

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

  if (!selectedVersion || !selectedDefinition) {
    return (
      <div className="p-10">
        <p>Versão do processo não encontrada.</p>
        <Link to="/processos/$processId" params={{ processId }} search={{}}>
          Abrir versão de autoria
        </Link>
      </div>
    );
  }

  const patch = (values: Partial<ProcessDefinition>) => {
    if (editable) updateWorkingProcessDefinition(doc.id, values);
  };
  const selectVersion = (id: string) => {
    void navigate({ search: { ...(tab ? { tab } : {}), versionId: id } });
  };
  const createVersion = (baseId?: string) => {
    const result = createProcessVersion(doc.id, baseId);
    if (!result.ok) {
      toast.error("Não foi possível criar a versão", { description: result.reason });
      return;
    }
    selectVersion(result.version.id);
    toast.success("Nova versão rascunho criada");
  };
  const publishVersion = () => {
    if (!editable) return;
    const result = publishProcessVersion(doc.id);
    if (!result.ok) {
      toast.error("Não foi possível publicar", { description: result.reason });
      return;
    }
    toast.success("Versão publicada");
  };

  return (
    <WorkspaceLayout
      title={selectedDefinition.name}
      subtitle={selectedDefinition.description}
      meta={
        <WorkspaceMeta
          items={[
            { label: "Código", value: doc.code },
            { label: "Tipo", value: "Processo" },
            { label: "Categoria", value: selectedDefinition.category },
            { label: "Versão", value: `V${selectedVersion.number}` },
            { label: "Status da versão", value: selectedVersion.status },
            {
              label: "Estado do Processo",
              value: <LifecycleBadge state={lifecycle.state} size="sm" />,
            },
            { label: "Responsável", value: selectedDefinition.owner },
            { label: "Etapas", value: String(selectedDefinition.steps.length) },
            { label: "Última revisão", value: selectedVersion.updatedAt },
          ]}
        />
      }
      actions={
        <>
          <ActionButton
            label="Salvar"
            disabled={!editable}
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
              const copy = duplicateProcessDoc(doc.id, selectedVersion.id);
              toast.success("Processo duplicado", { description: copy ? getAuthoringProcessVersion(copy)?.definition.name : undefined });
            }}
          />
          <ActionButton
            label="Exportar"
            icon={Download}
            onClick={() => toast("Exportar", { description: "Disponível em uma próxima build." })}
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
              updateProcessDoc(doc.id, { favorite: !doc.favorite });
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
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="process-version">Versão</label>
            <select id="process-version" value={selectedVersion.id} onChange={(event) => selectVersion(event.target.value)} className="rounded border bg-background px-2 py-1 text-xs">
              {doc.versions.map((version) => <option key={version.id} value={version.id}>V{version.number} · {version.status}</option>)}
            </select>
            {selectedVersion.basedOnVersionId && <span className="text-xs">Baseada em V{getProcessVersion(doc, selectedVersion.basedOnVersionId)?.number}</span>}
            {!editable && <span className="text-xs">Definição somente leitura</span>}
            <Button size="sm" variant="outline" disabled={Boolean(doc.workingVersionId) || !doc.publishedVersionId} onClick={() => createVersion()}>Criar nova versão</Button>
            <Button size="sm" variant="outline" disabled={Boolean(doc.workingVersionId)} onClick={() => createVersion(selectedVersion.id)}>Criar draft a partir desta versão</Button>
            <Button size="sm" disabled={!editable} onClick={publishVersion}>Publicar draft</Button>
          </div>
          <WorkspaceContextBar
          groups={PROCESS_DEMO_ORIGIN.map((g) => ({
            label: g.group,
            items: g.items.map((i) => i.name),
          }))}
        />
        </div>
      }
      tabs={[
        {
          id: "estrutura",
          label: "Estrutura",
          content: (
            <fieldset disabled={!editable}>
              <ProcessStructure key={selectedVersion.id} processId={doc.id}
                definition={selectedDefinition} editable={editable} />
            </fieldset>
          ),
        },
        {
          id: "etapas",
          label: "Etapas",
          content: (
            <fieldset disabled={!editable}>
              <ProcessSteps
                key={selectedVersion.id}
                readOnly={!editable}
                steps={selectedDefinition.steps}
                onChange={(id, p) => editable && updateProcessStep(doc.id, id, p)}
                onMove={(id, delta) => editable && moveProcessStep(doc.id, id, delta)}
                onRemove={(id) => editable && removeProcessStep(doc.id, id)}
                onAdd={() => editable && addProcessStep(doc.id)}
              />
            </fieldset>
          ),
        },
        {
          id: "timeline",
          label: "Timeline",
          content: <ProcessTimeline steps={selectedDefinition.steps} />,
        },
        {
          id: "regras",
          label: "Regras",
          content: (
            <fieldset disabled={!editable}>
              <ProcessRules
                rules={selectedDefinition.rules ?? []}
                onChange={(id, p) => editable && updateProcessRule(doc.id, id, p)}
                onRemove={(id) => editable && removeProcessRule(doc.id, id)}
                onAdd={() => editable && addProcessRule(doc.id)}
              />
            </fieldset>
          ),
        },
        {
          id: "participantes",
          label: "Participantes",
          content: (
            <fieldset disabled={!editable}>
              <ProcessParticipants
                participants={selectedDefinition.participants ?? []}
                steps={selectedDefinition.steps}
                onChange={(id, p) => editable && updateProcessParticipant(doc.id, id, p)}
                onToggleStep={(id, stepId) => editable && toggleParticipantStep(doc.id, id, stepId)}
                onRemove={(id) => editable && removeProcessParticipant(doc.id, id)}
                onAdd={() => editable && addProcessParticipant(doc.id)}
                onImportFromSteps={() => {
                  if (!editable) return;
                  const mapped = new Set((selectedDefinition.participants ?? []).map((p) => p.name.trim()));
                  const owners = [
                    ...new Set(selectedDefinition.steps.map((s) => s.owner.trim()).filter(Boolean)),
                  ].filter((o) => !mapped.has(o));
                  owners.forEach((owner) =>
                    addProcessParticipant(doc.id, {
                      name: owner,
                      area: selectedDefinition.area,
                      stepIds: selectedDefinition.steps.filter((s) => s.owner.trim() === owner).map((s) => s.id),
                    }),
                  );
                  toast.success("Participantes importados", {
                    description: `${owners.length} responsável(is) das etapas.`,
                  });
                }}
              />
            </fieldset>
          ),
        },
        {
          id: "origem",
          label: "Origem",
          content: <ProcessOrigin processName={selectedDefinition.name} />,
        },
        {
          id: "bpmn",
          label: "Modelagem BPM",
          content: (
            <div className="space-y-6">
              <BpmReadinessBanner doc={selectedDefinition} />
              <BpmDesigner key={doc.id} doc={doc} version={selectedVersion} />
            </div>
          ),
        },

        {
          id: "relacionamentos",
          label: "Relacionamentos",
          content: (
            <div className="space-y-8">
              <LinkedPopsSection processId={doc.id} />

              <Separator />

              <section className="space-y-3">
                <div>
                  <h2 className="text-sm font-medium">Resumo de relacionamentos</h2>
                  <p className="text-xs text-muted-foreground">
                    Conhecimentos, POPs, normas, riscos e controles ligados a este processo.
                  </p>
                </div>
                <RelationshipSummary objectId={doc.id} />
              </section>

              <section className="space-y-3">
                <h2 className="text-sm font-medium">Rede de relacionamentos</h2>
                <RelationshipsTab objectId={doc.id} objectName={selectedDefinition.name} objectType="Processo" />
              </section>
            </div>
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
          content: (
            <div className="space-y-10">
              <LifecycleTab seed={lifecycleSeed} />
              <ProcessHistory />
            </div>
          ),
        },
      ]}
      defaultTab={tab ?? "estrutura"}
      sidePanel={
        <div className="space-y-6">
          <LifecyclePanel seed={lifecycleSeed} showTimeline={false} />
          <Separator />
          <fieldset disabled={!editable}>
            <ProcessMetadataPanel key={selectedVersion.id} doc={doc}
              version={selectedVersion} onChange={patch} />
          </fieldset>
          <Separator />
          <ProcessConsistencyPanel doc={selectedDefinition} />
          <Separator />
          <WorkspaceAiPanel />
        </div>
      }
      statusBar={
        <WorkspaceStatusBar
          status={DEMO_ENVIRONMENT.status}
          lastSync={DEMO_ENVIRONMENT.lastSync}
          version={`V${selectedVersion.number} · ${DEMO_ENVIRONMENT.version}`}
          environment={DEMO_ENVIRONMENT.environment}
        />
      }
    />
  );
}
