import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Ban, CheckCircle2, GitBranch, PlayCircle, ShieldCheck, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/layout/page";
import { TaskStateBadge } from "@/components/runtime/runtime-badges";
import {
  ApprovalStateBadge,
  ExecutionKindBadge,
  OutcomeBadge,
} from "@/components/runtime/execution-badges";
import {
  OUTCOMES_BY_KIND,
  OUTCOMES_REQUIRING_JUSTIFICATION,
  type TaskOutcome,
} from "@/config/execution-rules";
import { Pill } from "@/components/ui/pill";
import {
  blockTask,
  formatDateTime,
  resolveTask,
  startTask,
  taskKind,
  type RuntimeTask,
  type WorkflowInstance,
} from "@/lib/runtime-store";
import { cn } from "@/lib/utils";

/** Build 012 — lista de tarefas da instância + painel de execução da tarefa. */
export function RuntimeTasks({
  instance,
  initialTaskId,
}: {
  instance: WorkflowInstance;
  initialTaskId?: string | undefined;
}) {
  const [openId, setOpenId] = useState<string | null>(initialTaskId ?? null);
  const task = instance.tasks.find((t) => t.id === openId) ?? null;

  if (instance.tasks.length === 0) {
    return (
      <EmptyState
        icon={<PlayCircle className="h-5 w-5" />}
        title="Nenhuma tarefa gerada"
        description="As tarefas são criadas a partir das etapas executáveis do workflow."
      />
    );
  }

  return (
    <div className="space-y-2">
      {[...instance.tasks]
        .sort((a, b) => a.order - b.order)
        .map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setOpenId(t.id)}
            className={cn(
              "flex w-full flex-wrap items-center gap-3 rounded-xl border bg-card px-4 py-3 text-left transition-colors hover:border-primary/30",
              t.state === "concluída" && "opacity-70",
            )}
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{t.name}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {t.owner || "sem responsável"} · {t.role}
                {t.deadline ? ` · prazo ${t.deadline}` : ""}
              </span>
            </span>
            {t.blockedReason && t.state === "bloqueada" && (
              <Pill tone="bg-amber-500/10 text-amber-700 dark:text-amber-400" size="sm">
                {t.blockedReason}
              </Pill>
            )}
            {t.outcome && <OutcomeBadge outcome={t.outcome} />}
            {taskKind(t) !== "tarefa" && <ExecutionKindBadge kind={taskKind(t)} />}
            <TaskStateBadge state={t.state} />
          </button>
        ))}

      <TaskSheet
        instance={instance}
        task={task}
        onClose={() => setOpenId(null)}
      />
    </div>
  );
}

function TaskSheet({
  instance,
  task,
  onClose,
}: {
  instance: WorkflowInstance;
  task: RuntimeTask | null;
  onClose: () => void;
}) {
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [blocking, setBlocking] = useState(false);
  const [justification, setJustification] = useState("");

  const closed = instance.state === "concluída" || instance.state === "cancelada";

  const rows: Array<[string, string]> = task
    ? [
        ["Workflow", instance.workflowName],
        ["Processo", instance.processName],
        ["Responsável", task.owner || "—"],
        ["Papel", task.role],
        ["Prazo", task.deadline || "—"],
        ["Criada em", formatDateTime(task.createdAt)],
        ["Concluída em", formatDateTime(task.completedAt)],
        ["Entradas", task.inputs || "—"],
        ["Saídas", task.outputs || "—"],
        ["Pré-condição", task.precondition || "—"],
        ["Ação esperada", task.expectedAction || "—"],
      ]
    : [];

  return (
    <Sheet
      open={Boolean(task)}
      onOpenChange={(open) => {
        if (!open) {
          setNote("");
          setReason("");
          setBlocking(false);
          onClose();
        }
      }}
    >
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {task && (
          <>
            <SheetHeader>
              <SheetTitle className="pr-6 text-base">{task.name}</SheetTitle>
              <SheetDescription>
                {task.description || "Tarefa gerada a partir da etapa executável."}
              </SheetDescription>
            </SheetHeader>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <TaskStateBadge state={task.state} size="md" />
              <ExecutionKindBadge kind={taskKind(task)} size="md" />
              {task.outcome && <OutcomeBadge outcome={task.outcome} size="md" />}
              {task.approvalState && (
                <ApprovalStateBadge state={task.approvalState} size="md" />
              )}
              <Link
                to="/processos/$processId"
                params={{ processId: instance.processId }}
                className="text-xs text-primary hover:underline"
              >
                Ver processo
              </Link>
            </div>

            <dl className="mt-5 space-y-2 rounded-xl border bg-surface/40 p-4">
              {rows.map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-4">
                  <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    {label}
                  </dt>
                  <dd className="max-w-[60%] text-right text-xs font-medium">{value}</dd>
                </div>
              ))}
            </dl>

            {task.blockedReason && task.state === "bloqueada" && (
              <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                Bloqueio: {task.blockedReason}
              </p>
            )}

            {task.correctionRequested && (
              <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                Correção solicitada
                {task.correctionReason ? `: ${task.correctionReason}` : "."}
              </p>
            )}

            {task.justification && (
              <p className="mt-4 rounded-lg border bg-surface/40 px-3 py-2 text-xs text-muted-foreground">
                Justificativa registrada: {task.justification}
              </p>
            )}

            <div className="mt-5">
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Observações
              </label>
              <Textarea
                value={note || task.notes}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Registre o que foi executado…"
                className="mt-1.5 min-h-20 text-sm"
                disabled={closed || task.state === "concluída"}
              />
            </div>

            {blocking && (
              <div className="mt-4">
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Motivo do bloqueio
                </label>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Descreva o impedimento…"
                  className="mt-1.5 min-h-16 text-sm"
                />
              </div>
            )}

            <ExecutionPanel
              instance={instance}
              task={task}
              closed={closed}
              note={note}
              justification={justification}
              setJustification={setJustification}
              onDone={onClose}
            />

            <div className="mt-5 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={closed || task.state !== "pendente"}
                onClick={() => {
                  startTask(instance.id, task.id);
                  toast.success("Tarefa iniciada", { description: task.name });
                }}
              >
                <PlayCircle className="mr-1.5 h-3.5 w-3.5" />
                Iniciar tarefa
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={closed || task.state === "concluída"}
                onClick={() => {
                  if (!blocking) {
                    setBlocking(true);
                    return;
                  }
                  if (!reason.trim()) {
                    toast.error("Informe o motivo do bloqueio");
                    return;
                  }
                  blockTask(instance.id, task.id, reason.trim());
                  toast("Tarefa bloqueada", { description: reason.trim() });
                  setBlocking(false);
                  setReason("");
                }}
              >
                <Ban className="mr-1.5 h-3.5 w-3.5" />
                {blocking ? "Confirmar bloqueio" : "Bloquear tarefa"}
              </Button>
            </div>

          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

/** Build 013 — resultado, aprovação ou decisão conforme a regra da etapa. */
function ExecutionPanel({
  instance,
  task,
  closed,
  note,
  justification,
  setJustification,
  onDone,
}: {
  instance: WorkflowInstance;
  task: RuntimeTask;
  closed: boolean;
  note: string;
  justification: string;
  setJustification: (value: string) => void;
  onDone: () => void;
}) {
  const kind = taskKind(task);
  const done = closed || task.state === "concluída" || task.state === "cancelada";

  function apply(outcome: TaskOutcome, optionId?: string) {
    if (
      OUTCOMES_REQUIRING_JUSTIFICATION.includes(outcome) &&
      !justification.trim()
    ) {
      toast.error("Justificativa obrigatória", {
        description: `Registre o motivo para "${outcome}".`,
      });
      return;
    }
    resolveTask(instance.id, task.id, {
      outcome,
      ...(optionId ? { optionId } : {}),
      justification: justification.trim(),
      note,
    });
    toast.success("Resultado registrado", { description: `${task.name} · ${outcome}` });
    setJustification("");
    onDone();
  }

  if (kind === "decisão") {
    return (
      <section className="mt-5 rounded-xl border bg-surface/40 p-4">
        <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
          <GitBranch className="h-3.5 w-3.5" />
          Decisão
        </span>
        <p className="mt-1 text-sm">
          {task.question || "Escolha o caminho da execução."}
        </p>
        {task.decisionLabel && (
          <p className="mt-2 text-xs text-muted-foreground">
            Opção escolhida: {task.decisionLabel}
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {(task.options ?? []).map((option) => (
            <Button
              key={option.id}
              size="sm"
              variant="outline"
              disabled={done}
              onClick={() => apply("concluído", option.id)}
            >
              {option.label || "Opção sem rótulo"}
            </Button>
          ))}
          {(task.options ?? []).length === 0 && (
            <p className="text-xs text-muted-foreground">
              Nenhuma opção configurada na definição do workflow.
            </p>
          )}
        </div>
      </section>
    );
  }

  if (kind === "aprovação") {
    return (
      <section className="mt-5 rounded-xl border bg-surface/40 p-4">
        <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" />
          Aprovação
        </span>
        <p className="mt-1 text-xs text-muted-foreground">
          Aprovador: {task.approver || task.owner || "—"} · papel {task.role}
        </p>
        <label className="mt-3 block text-[11px] uppercase tracking-wider text-muted-foreground">
          Justificativa
        </label>
        <Textarea
          value={justification}
          onChange={(e) => setJustification(e.target.value)}
          placeholder="Obrigatória para rejeição ou solicitação de correção…"
          className="mt-1.5 min-h-16 text-sm"
          disabled={done}
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" disabled={done} onClick={() => apply("aprovado")}>
            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
            Aprovar
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={done}
            onClick={() => apply("rejeitado")}
          >
            <XCircle className="mr-1.5 h-3.5 w-3.5" />
            Rejeitar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={done}
            onClick={() => apply("necessita correção")}
          >
            Solicitar correção
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-5 rounded-xl border bg-surface/40 p-4">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
        Resultado da tarefa
      </span>
      <div className="mt-3 flex flex-wrap gap-2">
        {OUTCOMES_BY_KIND.tarefa.map((outcome) => (
          <Button
            key={outcome}
            size="sm"
            variant={outcome === "concluído" ? "default" : "outline"}
            disabled={done}
            onClick={() => apply(outcome)}
          >
            {outcome === "concluído" && (
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
            )}
            {outcome === "concluído" ? "Concluir tarefa" : "Marcar não aplicável"}
          </Button>
        ))}
      </div>
    </section>
  );
}
