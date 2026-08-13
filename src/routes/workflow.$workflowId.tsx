import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ChevronLeft,
  Copy,
  Download,
  RefreshCw,
  Save,
  Share2,
  Star,
  Workflow as WorkflowIcon,
} from "lucide-react";
import { toast } from "sonner";
import { WorkspaceLayout } from "@/components/workspace/workspace-layout";
import { WorkspaceAiPanel } from "@/components/workspace/workspace-ai-panel";
import { WorkspaceStatusBar } from "@/components/workspace/workspace-status-bar";
import { WorkspaceContextBar } from "@/components/workspace/workspace-context-bar";
import { WorkspaceMeta } from "@/components/workspace/workspace-meta";
import { LifecycleBadge } from "@/components/lifecycle/lifecycle-badge";
import { LifecyclePanel, LifecycleTab } from "@/components/lifecycle/lifecycle-panel";
import { GovernanceTab } from "@/components/governance/governance-tab";
import { RelationshipsTab } from "@/components/relationships/relationships-tab";
import { RelationshipSummary } from "@/components/relationships/relationship-summary";
import { WorkflowSummary } from "@/components/workflow/workflow-summary";
import { WorkflowSteps } from "@/components/workflow/workflow-steps";
import { WorkflowParticipants } from "@/components/workflow/workflow-participants";
import { WorkflowRules } from "@/components/workflow/workflow-rules";
import { WorkflowExecution } from "@/components/workflow/workflow-execution";
import { WorkflowValidationTab } from "@/components/workflow/workflow-validation-tab";
import { WorkflowMetadataPanel } from "@/components/workflow/workflow-metadata-panel";
import { EmptyState } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DEMO_ENVIRONMENT } from "@/config/workspace-demo";
import { WORKFLOW_DEMO_HISTORY } from "@/config/workflow-model";
import { useLifecycle, type LifecycleSeed } from "@/lib/lifecycle-store";
import { useProcessDocs } from "@/lib/process-store";
import {
  addWorkflowParticipant,
  lifecycleStatusOf,
  removeWorkflowParticipant,
  syncWorkflowWithProcess,
  toggleWorkflowParticipantStep,
  updateWorkflowDoc,
  updateWorkflowParticipant,
  updateWorkflowStep,
  useWorkflowDoc,
  type WorkflowDoc,
} from "@/lib/workflow-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/workflow/$workflowId")({
  component: WorkflowWorkspace,
  head: () => ({
    meta: [
      { title: "Workflow Workspace — Process Platform" },
      {
        name: "description",
        content:
          "Configure etapas executáveis, participantes, regras e governança da definição de workflow.",
      },
      { property: "og:title", content: "Workflow Workspace — Process Platform" },
      {
        property: "og:description",
        content:
          "Definição executável herdada do processo modelado, pronta para o runtime.",
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

function WorkflowHistory() {
  return (
    <ol className="relative space-y-6 border-l pl-6">
      {WORKFLOW_DEMO_HISTORY.map((event) => (
        <li key={`${event.date}-${event.title}`} className="relative">
          <span className="absolute -left-[27px] top-1.5 h-2 w-2 rounded-full bg-primary/60 ring-4 ring-background" />
          <p className="text-[11px] text-muted-foreground">{event.date}</p>
          <p className="mt-0.5 text-sm font-medium">{event.title}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {event.detail}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground/80">
            por {event.author}
          </p>
        </li>
      ))}
    </ol>
  );
}

function WorkflowWorkspace() {
  const { workflowId } = Route.useParams();
  const doc = useWorkflowDoc(workflowId);
  const processes = useProcessDocs();

  const lifecycleSeed: LifecycleSeed = {
    objectId: doc?.id ?? "",
    kind: "workflow",
    name: doc?.name ?? "",
    owner: doc?.owner ?? "",
    status: doc ? lifecycleStatusOf(doc) : "",
    updatedAt: doc?.savedAt ?? doc?.revisedAt ?? "",
  };
  const lifecycle = useLifecycle(lifecycleSeed);

  if (!doc) {
    return (
      <div className="p-10">
        <EmptyState
          icon={<WorkflowIcon className="h-5 w-5" />}
          title="Workflow não encontrado"
          description="Volte ao Workflow Center para escolher ou criar uma definição."
        />
      </div>
    );
  }

  const patch = (values: Partial<WorkflowDoc>) => updateWorkflowDoc(doc.id, values);

  return (
    <WorkspaceLayout
      title={doc.name}
      subtitle={doc.description}
      meta={
        <WorkspaceMeta
          items={[
            { label: "Código", value: doc.code },
            { label: "Tipo", value: "Workflow" },
            { label: "Processo", value: doc.processName },
            { label: "Versão", value: doc.version },
            {
              label: "Estado",
              value: <LifecycleBadge state={lifecycle.state} size="sm" />,
            },
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
              toast.success("Workflow salvo", {
                description: "Definição guardada localmente.",
              });
            }}
          />
          <ActionButton
            label="Reimportar etapas do processo"
            icon={RefreshCw}
            onClick={() => {
              const process = processes.find((p) => p.id === doc.processId);
              if (!process) {
                toast.error("Processo de origem não encontrado");
                return;
              }
              syncWorkflowWithProcess(doc.id, process);
              toast.success("Etapas sincronizadas", {
                description: "Configuração de execução preservada.",
              });
            }}
          />
          <ActionButton
            label="Duplicar"
            icon={Copy}
            onClick={() =>
              toast("Duplicar", { description: "Disponível em uma próxima build." })
            }
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
            onClick={() => patch({ favorite: !doc.favorite })}
          />
          <Button asChild variant="ghost" size="sm" className="gap-1.5">
            <Link to="/workflow">
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Workflow Center</span>
            </Link>
          </Button>
        </>
      }
      contextBar={
        <WorkspaceContextBar
          groups={[
            { label: "Processo de origem", items: [doc.processName] },
            { label: "Área", items: [doc.area] },
            {
              label: "Participantes",
              items: doc.participants.slice(0, 4).map((p) => p.name),
            },
          ]}
        />
      }
      tabs={[
        { id: "resumo", label: "Resumo", content: <WorkflowSummary doc={doc} /> },
        {
          id: "etapas",
          label: "Etapas",
          content: (
            <WorkflowSteps
              key={doc.id}
              steps={doc.steps}
              doc={doc}
              onChange={(id, p) => updateWorkflowStep(doc.id, id, p)}
            />
          ),
        },
        {
          id: "participantes",
          label: "Participantes",
          content: (
            <WorkflowParticipants
              doc={doc}
              onChange={(id, p) => updateWorkflowParticipant(doc.id, id, p)}
              onToggleStep={(id, stepId) =>
                toggleWorkflowParticipantStep(doc.id, id, stepId)
              }
              onAdd={() => addWorkflowParticipant(doc.id)}
              onRemove={(id) => removeWorkflowParticipant(doc.id, id)}
            />
          ),
        },
        { id: "regras", label: "Regras", content: <WorkflowRules doc={doc} /> },
        {
          id: "validacao",
          label: "Validação",
          content: <WorkflowValidationTab doc={doc} />,
        },
        {
          id: "execucao",
          label: "Execução",
          content: <WorkflowExecution doc={doc} />,
        },
        {
          id: "relacionamentos",
          label: "Relacionamentos",
          content: (
            <div className="space-y-8">
              <RelationshipSummary objectId={doc.id} />
              <RelationshipsTab
                objectId={doc.id}
                objectName={doc.name}
                objectType="Processo"
              />
            </div>
          ),
        },
        {
          id: "governanca",
          label: "Governança",
          content: (
            <GovernanceTab seed={lifecycleSeed} lifecycleSeed={lifecycleSeed} />
          ),
        },
        {
          id: "historico",
          label: "Histórico",
          content: (
            <div className="space-y-10">
              <LifecycleTab seed={lifecycleSeed} />
              <WorkflowHistory />
            </div>
          ),
        },
      ]}
      defaultTab="resumo"
      sidePanel={
        <div className="space-y-6">
          <LifecyclePanel seed={lifecycleSeed} showTimeline={false} />
          <Separator />
          <WorkflowMetadataPanel key={doc.id} doc={doc} onChange={patch} />
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
