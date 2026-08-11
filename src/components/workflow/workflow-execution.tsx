import { PlayCircle, ShieldAlert, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { WorkflowDoc } from "@/lib/workflow-store";
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

  return (
    <div className="space-y-6">
      <section className="rounded-xl border bg-card p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-medium">Prontidão para execução</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              O motor de execução será ativado em uma evolução futura da
              plataforma.
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

      <section className="rounded-xl border border-dashed bg-surface/40 p-5">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Runtime de execução
        </span>
        <p className="mt-2 text-xs text-muted-foreground">
          Instâncias, filas de trabalho, SLA e monitoramento em tempo real serão
          construídos sobre esta definição, sem alterá-la.
        </p>
        <Button size="sm" variant="outline" className="mt-4 h-8" disabled>
          <PlayCircle className="mr-1.5 h-3.5 w-3.5" />
          Iniciar execução (em breve)
        </Button>
        {!ready && (
          <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
            <ShieldAlert className="h-3 w-3" />
            Complete a configuração das etapas antes da publicação.
          </p>
        )}
      </section>
    </div>
  );
}
