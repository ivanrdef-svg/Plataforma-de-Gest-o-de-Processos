import { AlertTriangle, CheckCircle2, GitBranch, Timer } from "lucide-react";
import type { WorkflowDoc } from "@/lib/workflow-store";
import { stepConfigured } from "./workflow-steps";
import { cn } from "@/lib/utils";

/**
 * Build 011 — regras de execução consolidadas.
 * Leitura das regras já configuradas nas etapas, sem duplicar dados.
 */
export function WorkflowRules({ doc }: { doc: WorkflowDoc }) {
  const conditionals = doc.steps.filter((s) => s.condition.trim());
  const preconditions = doc.steps.filter((s) => s.precondition.trim());
  const deadlines = doc.steps.filter((s) => s.deadline.trim());
  const pending = doc.steps.filter((s) => !stepConfigured(s));

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-3">
        <Metric icon={GitBranch} label="Condições" value={conditionals.length} />
        <Metric icon={Timer} label="Prazos definidos" value={deadlines.length} />
        <Metric
          icon={AlertTriangle}
          label="Etapas pendentes"
          value={pending.length}
          alert={pending.length > 0}
        />
      </section>

      <RuleGroup
        title="Pré-condições"
        empty="Nenhuma pré-condição definida nas etapas."
        items={preconditions.map((s) => ({
          id: s.id,
          step: s.name,
          text: s.precondition,
        }))}
      />
      <RuleGroup
        title="Condições de execução"
        empty="Nenhuma condição registrada — o fluxo é sequencial."
        items={conditionals.map((s) => ({
          id: s.id,
          step: s.name,
          text: s.condition,
        }))}
      />
      <RuleGroup
        title="Prazos"
        empty="Nenhum prazo definido."
        items={deadlines.map((s) => ({ id: s.id, step: s.name, text: s.deadline }))}
      />
      <RuleGroup
        title="Dependências"
        empty="Nenhuma dependência entre etapas."
        items={doc.steps
          .filter((s) => s.dependsOn.trim())
          .map((s) => ({ id: s.id, step: s.name, text: `depende de ${s.dependsOn}` }))}
      />
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  alert,
}: {
  icon: typeof Timer;
  label: string;
  value: number;
  alert?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-card px-4 py-3">
      <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </span>
      <p
        className={cn(
          "mt-1 text-2xl font-semibold tabular-nums",
          alert && "text-amber-600 dark:text-amber-400",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function RuleGroup({
  title,
  items,
  empty,
}: {
  title: string;
  items: Array<{ id: string; step: string; text: string }>;
  empty: string;
}) {
  return (
    <section>
      <h3 className="text-sm font-medium">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">{empty}</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-start gap-2 rounded-lg border bg-card px-3 py-2 text-xs"
            >
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span>
                <span className="font-medium">{item.step}</span>
                <span className="text-muted-foreground"> · {item.text}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
