import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowUpRight, PlayCircle, ShieldAlert, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StartWorkflowDialog } from "@/components/runtime/start-workflow-dialog";
import { InstanceStateBadge } from "@/components/runtime/runtime-badges";
import {
  instanceProgress,
  tryStartInstanceFromWorkflow,
  useWorkflowInstances,
} from "@/lib/runtime-store";
import { validateWorkflow } from "@/lib/workflow-validation";
import {
  currentWorkflowVersion,
  publishedWorkflowVersion,
  type WorkflowDoc,
} from "@/lib/workflow-store";
import { stepConfigured } from "./workflow-steps";

/**
 * Build 011 — preparação para o Workflow Runtime.
 * A execução real chega em uma build futura; aqui medimos a prontidão.
 */
export function workflowReadiness(doc: WorkflowDoc) {
  const checks = [
    { label: "Processo de origem vinculado", ok: Boolean(doc.processId) },
    { label: "Etapas executáveis definidas", ok: doc.steps.length > 0 },
    {
      label: "Todas as etapas configuradas",
      ok: doc.steps.length > 0 && doc.steps.every(stepConfigured),
    },
    { label: "Participantes atribuídos", ok: doc.participants.length > 0 },
    {
      label: "Responsável do workflow definido",
      ok: Boolean(doc.owner.trim()),
    },
    {
      label: "Prazos informados",
      ok: doc.steps.length > 0 && doc.steps.every((s) => s.deadline.trim()),
    },
  ];
  const done = checks.filter((c) => c.ok).length;
  return { checks, score: Math.round((done / checks.length) * 100) };
}

export function WorkflowExecution({ doc }: { doc: WorkflowDoc }) {
  const { checks, score } = workflowReadiness(doc);
  const ready = score === 100;
  const isArchived = doc.status === "arquivado";
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const instances = useWorkflowInstances().filter((i) => i.workflowId === doc.id);
  // Build 016 — definição inválida não gera instância.
  // Build 017.1 — a execução usa sempre a versão publicada, nunca o rascunho.
  const published = publishedWorkflowVersion(doc);
  const validation = published?.content ? validateWorkflow(published.content) : undefined;
  const current = currentWorkflowVersion(doc);
  const viewingDraft = Boolean(
    published && current && current.number !== published.number,
  );

  const start = () => {
    const result = tryStartInstanceFromWorkflow(doc);
    setOpen(false);
    if (!result.ok) {
      if (result.reason === "arquivado") {
        toast.error("Execução bloqueada", {
          description: "Este Workflow está arquivado e não pode iniciar novas execuções.",
        });
      } else if (result.reason === "no-published-version") {
        toast.error("Nenhuma versão publicada", {
          description:
            "Este Workflow não possui uma versão publicada disponível para execução.",
        });
      } else {
        toast.error("Execução bloqueada", {
          description: `${result.validation.errors.length} erro(s) de validação impedem o início.`,
        });
      }
      return;
    }
    toast.success("Execução iniciada", {
      description: `${result.instance.tasks.length} tarefas criadas.`,
    });
    navigate({
      to: "/execucao/$instanceId",
      params: { instanceId: result.instance.id },
    });
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border bg-card p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-medium">Prontidão do conteúdo em edição</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Quanto mais completa a definição, mais confiável é a execução.
            </p>
          </div>
          <span className="text-3xl font-semibold tabular-nums">{score}%</span>
        </div>
        <Progress value={score} className="mt-4 h-1.5" />
        <ul className="mt-4 space-y-1.5">
          {checks.map((c) => (
            <li key={c.label} className="flex items-center gap-2 text-xs">
              <span
                className={
                  c.ok
                    ? "h-1.5 w-1.5 rounded-full bg-emerald-500"
                    : "h-1.5 w-1.5 rounded-full bg-amber-500"
                }
              />
              <span className={c.ok ? "" : "text-muted-foreground"}>{c.label}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border bg-card p-5">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Runtime de execução
        </span>
        <p className="mt-2 text-xs text-muted-foreground">
          Iniciar cria uma instância da versão publicada. As tarefas nascem das
          etapas congeladas nessa versão — a definição permanece intacta.
        </p>
        {viewingDraft && published && (
          <p className="mt-2 text-[11px] text-amber-600 dark:text-amber-400">
            Você está vendo o rascunho V{current?.number}. A execução usará a versão
            publicada V{published.number}, não o rascunho em edição.
          </p>
        )}
        <Button
          size="sm"
          className="mt-4 h-8"
          disabled={!published?.content || !validation?.canStart || isArchived}
          onClick={() => setOpen(true)}
        >
          <PlayCircle className="mr-1.5 h-3.5 w-3.5" />
          {published ? `Iniciar Workflow · V${published.number} publicada` : "Iniciar Workflow"}
        </Button>
        {isArchived ? (
          <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-destructive">
            <ShieldAlert className="h-3 w-3" />
            Este Workflow está arquivado e não pode iniciar novas execuções.
          </p>
        ) : !published?.content ? (
          <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-destructive">
            <ShieldAlert className="h-3 w-3" />
            Este Workflow não possui uma versão publicada disponível para execução.
          </p>
        ) : validation && !validation.canStart ? (
          <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-destructive">
            <ShieldAlert className="h-3 w-3" />
            {validation.errors.length} erro(s) de validação bloqueiam novas execuções
            na versão publicada.
          </p>
        ) : (
          !ready && (
            <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
              <ShieldAlert className="h-3 w-3" />
              Ainda há configuração pendente no conteúdo em edição.
            </p>
          )
        )}
      </section>

      <section className="rounded-xl border bg-card p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-medium">Execuções desta definição</h3>
          <Link
            to="/execucao"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            Runtime Center
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
        {instances.length === 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Nenhuma execução iniciada ainda.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {instances.map((i) => (
              <li key={i.id}>
                <Link
                  to="/execucao/$instanceId"
                  params={{ instanceId: i.id }}
                  className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/60"
                >
                  <span className="min-w-0 flex-1 truncate text-xs font-medium">
                    {i.code} · {i.name}
                  </span>
                  <InstanceStateBadge state={i.state} />
                  <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                    {instanceProgress(i)}%
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <StartWorkflowDialog
        doc={doc}
        open={open}
        onOpenChange={setOpen}
        onConfirm={start}
      />
    </div>
  );
}
