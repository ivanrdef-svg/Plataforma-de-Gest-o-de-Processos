import { AlertTriangle, CheckCircle2, GitBranch, ShieldCheck, Timer } from "lucide-react";
import type { WorkflowDoc } from "@/lib/workflow-store";
import { stepConfigured } from "./workflow-steps";
import {
  ExecutionKindBadge,
  OutcomeBadge,
} from "@/components/runtime/execution-badges";
import {
  decisionFlow,
  stepKind,
  transitionsOf,
  validateExecutionRules,
} from "@/lib/execution-rules";
import { specLabel } from "@/config/sla-model";
import {
  defaultTaskSpecOf,
  instanceSpecOf,
  stepHasOwnSpec,
  validateSlaRules,
} from "@/lib/sla";
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
  const approvals = doc.steps.filter((s) => stepKind(s) === "aprovação");
  const decisions = doc.steps.filter((s) => stepKind(s) === "decisão");
  // Build 014 — a validação temporal soma-se à validação das regras.
  const issues = [...validateExecutionRules(doc), ...validateSlaRules(doc)];
  const instanceSpec = instanceSpecOf(doc);
  const defaultSpec = defaultTaskSpecOf(doc);
  const ownSpecs = doc.steps.filter(stepHasOwnSpec);
  const flow = decisionFlow(doc);

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Metric icon={GitBranch} label="Decisões" value={decisions.length} />
        <Metric icon={ShieldCheck} label="Aprovações" value={approvals.length} />
        <Metric icon={GitBranch} label="Condições" value={conditionals.length} />
        <Metric
          icon={Timer}
          label="Prazos definidos"
          value={deadlines.length + ownSpecs.length}
        />
        <Metric
          icon={AlertTriangle}
          label="Etapas pendentes"
          value={pending.length}
          alert={pending.length > 0}
        />
      </section>

      <section className="rounded-xl border bg-card p-4">
        <h3 className="text-sm font-medium">Prazos e SLA</h3>
        <dl className="mt-3 grid gap-3 sm:grid-cols-3">
          <div>
            <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
              SLA da execução
            </dt>
            <dd className="mt-1 text-xs font-medium">{specLabel(instanceSpec)}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Prazo padrão das tarefas
            </dt>
            <dd className="mt-1 text-xs font-medium">{specLabel(defaultSpec)}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Etapas com prazo próprio
            </dt>
            <dd className="mt-1 text-xs font-medium tabular-nums">{ownSpecs.length}</dd>
          </div>
        </dl>
        {ownSpecs.length > 0 && (
          <ul className="mt-3 space-y-1">
            {ownSpecs.map((step) => (
              <li key={step.id} className="text-[11px] text-muted-foreground">
                <span className="text-foreground">{step.name}</span> ·{" "}
                {step.slaAmount} {step.slaUnit ?? "horas"}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="text-sm font-medium">Consistência das regras</h3>
        {issues.length === 0 ? (
          <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Nenhuma inconsistência: todas as regras têm destino definido.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {issues.map((issue) => (
              <li
                key={issue.id}
                className={cn(
                  "flex items-start gap-2 rounded-lg border px-3 py-2 text-xs",
                  issue.severity === "erro"
                    ? "border-destructive/30 bg-destructive/5 text-destructive"
                    : "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400",
                )}
              >
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  <span className="font-medium">{issue.step}</span>
                  <span className="opacity-80"> · {issue.message}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="text-sm font-medium">Fluxo de decisão</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Resultado de cada etapa e para onde a execução segue.
        </p>
        <ul className="mt-2 space-y-2">
          {flow.map((node) => (
            <li key={node.stepId} className="rounded-lg border bg-card px-3 py-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium">{node.name || "Etapa sem nome"}</span>
                <ExecutionKindBadge kind={node.kind} />
              </div>
              <ul className="mt-1.5 space-y-1">
                {node.branches.map((branch) => (
                  <li
                    key={`${node.stepId}-${branch.label}`}
                    className="text-[11px] text-muted-foreground"
                  >
                    <span className="font-medium text-foreground">{branch.label}</span>
                    {" → "}
                    {branch.target}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="text-sm font-medium">Aprovações</h3>
        {approvals.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Nenhuma etapa de aprovação configurada.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {approvals.map((step) => (
              <li key={step.id} className="rounded-lg border bg-card px-3 py-2 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{step.name}</span>
                  <span className="text-muted-foreground">
                    aprovador: {step.approver || step.owner || "—"}
                  </span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {transitionsOf(doc, step).map((t) => (
                    <span key={t.outcome} className="inline-flex items-center gap-1">
                      <OutcomeBadge outcome={t.outcome} />
                      <span className="text-[11px] text-muted-foreground">
                        → {t.nextStepName}
                      </span>
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
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
