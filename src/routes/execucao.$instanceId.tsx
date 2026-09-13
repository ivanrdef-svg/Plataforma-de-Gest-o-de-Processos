import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ChevronLeft,
  Ban,
  Pause,
  Play,
  PlayCircle,
} from "lucide-react";
import { toast } from "sonner";
import { WorkspaceLayout } from "@/components/workspace/workspace-layout";
import { WorkspaceMeta } from "@/components/workspace/workspace-meta";
import { WorkspaceContextBar } from "@/components/workspace/workspace-context-bar";
import { WorkspaceStatusBar } from "@/components/workspace/workspace-status-bar";
import { WorkspaceAiPanel } from "@/components/workspace/workspace-ai-panel";
import { GovernanceTab } from "@/components/governance/governance-tab";
import { EmptyState } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InstanceStateBadge } from "@/components/runtime/runtime-badges";
import { RuntimeOverview } from "@/components/runtime/runtime-overview";
import { RuntimeTasks } from "@/components/runtime/runtime-tasks";
import { RuntimeProcess } from "@/components/runtime/runtime-process";
import { RuntimeParticipants } from "@/components/runtime/runtime-participants";
import { RuntimeHistory } from "@/components/runtime/runtime-history";
import { RuntimeSla } from "@/components/runtime/runtime-sla";
import { OverdueFlag, SlaStatusBadge } from "@/components/runtime/sla-badges";
import { formatRemaining, useNow } from "@/lib/sla";
import { DEMO_ENVIRONMENT } from "@/config/workspace-demo";
import { lifecycleStatusOf, useWorkflowDoc } from "@/lib/workflow-store";
import {
  cancelInstance,
  currentTask,
  formatDateTime,
  formatElapsed,
  instanceProgress,
  openTasks,
  overdueTasks,
  pauseInstance,
  resumeInstance,
  instanceSla,
  useSlaMonitor,
  useWorkflowInstance,
} from "@/lib/runtime-store";

export const Route = createFileRoute("/execucao/$instanceId")({
  /** Build 015 — deep link vindo da Inbox: abre direto a tarefa. */
  validateSearch: (search: Record<string, unknown>): { task?: string } => {
    const task = typeof search["task"] === "string" ? (search["task"] as string) : undefined;
    return task ? { task } : {};
  },
  component: RuntimeWorkspace,
  head: () => ({
    meta: [
      { title: "Execução em andamento — Runtime Workspace" },
      {
        name: "description",
        content:
          "Acompanhe tarefas, progresso, governança e histórico de uma execução de workflow.",
      },
      { property: "og:title", content: "Execução em andamento — Runtime Workspace" },
      {
        property: "og:description",
        content: "Tarefas, progresso e histórico de uma instância de workflow.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function RuntimeWorkspace() {
  const { instanceId } = Route.useParams();
  const { task: focusTaskId } = Route.useSearch();
  const now = useNow();
  useSlaMonitor();
  const instance = useWorkflowInstance(instanceId);
  const workflow = useWorkflowDoc(instance?.workflowId ?? "");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");

  if (!instance) {
    return (
      <div className="p-10">
        <EmptyState
          icon={<PlayCircle className="h-5 w-5" />}
          title="Execução não encontrada"
          description="Volte ao Runtime Center para escolher uma execução."
        />
      </div>
    );
  }

  const progress = instanceProgress(instance);
  const active = currentTask(instance);
  const closed = instance.state === "concluída" || instance.state === "cancelada";

  const sla = instanceSla(instance, now);
  const late = overdueTasks(instance, now);

  const governanceSeed = {
    objectId: instance.workflowId,
    kind: "workflow" as const,
    name: instance.workflowName,
    owner: instance.owner,
    status: workflow ? lifecycleStatusOf(workflow) : "publicado",
    updatedAt: instance.updatedAt,
  };

  return (
    <>
      <WorkspaceLayout
        title={instance.name}
        subtitle={`Execução do processo ${instance.processName}. Este processo está acontecendo agora.`}
        meta={
          <WorkspaceMeta
            items={[
              { label: "Código", value: instance.code },
              { label: "Tipo", value: "Execução" },
              { label: "Workflow", value: instance.workflowName },
              {
                label: "Versão de origem",
                value: instance.workflowVersion
                  ? `V${instance.workflowVersion}`
                  : instance.version,
              },
              { label: "Versão", value: instance.version },
              {
                label: "Estado",
                value: <InstanceStateBadge state={instance.state} />,
              },
              { label: "Responsável", value: instance.owner || "—" },
              { label: "Progresso", value: `${progress}%` },
              { label: "Tempo decorrido", value: formatElapsed(instance) },
              {
                label: "SLA",
                value: <SlaStatusBadge status={sla.status} />,
              },
            ]}
          />
        }
        actions={
          <>
            {instance.state === "pausada" ? (
              <Button
                size="sm"
                variant="outline"
                className="h-8"
                onClick={() => {
                  resumeInstance(instance.id);
                  toast.success("Execução retomada");
                }}
              >
                <Play className="mr-1.5 h-3.5 w-3.5" />
                Retomar execução
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="h-8"
                disabled={closed}
                onClick={() => {
                  pauseInstance(instance.id);
                  toast("Execução pausada");
                }}
              >
                <Pause className="mr-1.5 h-3.5 w-3.5" />
                Pausar execução
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-8"
              disabled={closed}
              onClick={() => setCancelOpen(true)}
            >
              <Ban className="mr-1.5 h-3.5 w-3.5" />
              Cancelar execução
            </Button>
            <Button asChild variant="ghost" size="sm" className="gap-1.5">
              <Link to="/execucao">
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Runtime Center</span>
              </Link>
            </Button>
          </>
        }
        contextBar={
          <WorkspaceContextBar
            groups={[
              { label: "Processo", items: [instance.processName] },
              { label: "Área", items: [instance.area] },
              { label: "Etapa atual", items: [active?.name ?? "—"] },
              ...(late.length > 0
                ? [{ label: "Atraso", items: [`${late.length} tarefa(s) atrasada(s)`] }]
                : []),
            ]}
          />
        }
        tabs={[
          {
            id: "visao-geral",
            label: "Visão geral",
            content: <RuntimeOverview instance={instance} />,
          },
          {
            id: "tarefas",
            label: "Tarefas",
            content: (
              <RuntimeTasks instance={instance} initialTaskId={focusTaskId} />
            ),
          },
          {
            id: "prazos",
            label: "Prazos",
            content: <RuntimeSla instance={instance} />,
          },
          {
            id: "processo",
            label: "Processo",
            content: <RuntimeProcess instance={instance} />,
          },
          {
            id: "governanca",
            label: "Governança atual do Workflow",
            content: (
              workflow ? <GovernanceTab seed={governanceSeed} lifecycleSeed={governanceSeed} /> : (
                <p className="text-xs text-muted-foreground">Workflow de origem indisponível.</p>
              )
            ),
          },
          {
            id: "participantes",
            label: "Participantes",
            content: <RuntimeParticipants instance={instance} />,
          },
          {
            id: "historico",
            label: "Histórico",
            content: <RuntimeHistory instance={instance} />,
          },
        ]}
        defaultTab={focusTaskId ? "tarefas" : "visao-geral"}
        sidePanel={
          <div className="space-y-6">
            <section>
              <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Execução
              </h3>
              <p className="mt-2 text-2xl font-semibold tabular-nums">{progress}%</p>
              <Progress value={progress} className="mt-2 h-1.5" />
              <dl className="mt-4 space-y-2 text-xs">
                <Row label="Estado" value={instance.state} />
                <Row label="Tarefas abertas" value={String(openTasks(instance).length)} />
                <Row label="Etapa atual" value={active?.name ?? "—"} />
                <Row label="Início" value={formatDateTime(instance.startedAt)} />
                <Row
                  label="Atualização"
                  value={formatDateTime(instance.updatedAt)}
                />
                <Row
                  label="SLA"
                  value={sla.applicable ? formatRemaining(sla) : "Sem SLA definido"}
                />
                <Row label="Tarefas atrasadas" value={String(late.length)} />
              </dl>
              {late.length > 0 && (
                <div className="mt-3">
                  <OverdueFlag />
                </div>
              )}
            </section>
            <Separator />
            <WorkspaceAiPanel />
          </div>
        }
        statusBar={
          <WorkspaceStatusBar
            status={DEMO_ENVIRONMENT.status}
            lastSync={DEMO_ENVIRONMENT.lastSync}
            version={`${instance.version} · ${DEMO_ENVIRONMENT.version}`}
            environment={DEMO_ENVIRONMENT.environment}
          />
        }
      />

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancelar execução</DialogTitle>
            <DialogDescription>
              A instância será encerrada. A definição do workflow não é afetada.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motivo do cancelamento…"
            className="min-h-20 text-sm"
          />
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" size="sm" onClick={() => setCancelOpen(false)}>
              Voltar
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                if (!reason.trim()) {
                  toast.error("Informe o motivo do cancelamento");
                  return;
                }
                cancelInstance(instance.id, reason.trim());
                setCancelOpen(false);
                setReason("");
                toast("Execução cancelada");
              }}
            >
              Cancelar execução
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="max-w-[60%] text-right font-medium">{value}</dd>
    </div>
  );
}
