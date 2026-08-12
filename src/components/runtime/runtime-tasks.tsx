import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Ban, CheckCircle2, PlayCircle } from "lucide-react";
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
import { Pill } from "@/components/ui/pill";
import {
  blockTask,
  completeTask,
  formatDateTime,
  startTask,
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

            <div className="mt-4 flex items-center gap-2">
              <TaskStateBadge state={task.state} size="md" />
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
                disabled={closed || task.state === "concluída"}
                onClick={() => {
                  completeTask(instance.id, task.id, note);
                  toast.success("Tarefa concluída", { description: task.name });
                  onClose();
                }}
              >
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                Concluir tarefa
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
