import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExecutionKindBadge } from "@/components/runtime/execution-badges";
import { SlaField } from "@/components/workflow/sla-field";
import { specLabel } from "@/config/sla-model";
import { defaultTaskSpecOf } from "@/lib/sla";
import {
  DECISION_HINTS,
  EXECUTION_KINDS,
  type ExecutionKind,
} from "@/config/execution-rules";
import {
  outcomesOf,
  stepKind,
  transitionsOf,
  decisionOptions,
} from "@/lib/execution-rules";
import {
  addDecisionOption,
  removeDecisionOption,
  setOutcomeTransition,
  setStepSla,
  updateDecisionOption,
  updateWorkflowStep,
  type WorkflowDoc,
  type WorkflowStep,
} from "@/lib/workflow-store";

const END = "__fim__";

/**
 * Build 013 — configuração das regras operacionais de UMA etapa executável.
 * Renderizado dentro do editor de etapas já existente (Build 011).
 */
export function StepRulesEditor({
  doc,
  step,
}: {
  doc: WorkflowDoc;
  step: WorkflowStep;
}) {
  const kind = stepKind(step);
  const others = doc.steps.filter((s) => s.id !== step.id);
  const options = decisionOptions(step);
  const defaultSpec = defaultTaskSpecOf(doc);

  return (
    <div className="col-span-full space-y-4 rounded-xl border bg-surface/40 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Regras de execução
        </span>
        <ExecutionKindBadge kind={kind} />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Natureza da etapa
          </span>
          <Select
            value={kind}
            onValueChange={(v) =>
              updateWorkflowStep(doc.id, step.id, { kind: v as ExecutionKind })
            }
          >
            <SelectTrigger className="mt-1 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EXECUTION_KINDS.map((k) => (
                <SelectItem key={k} value={k} className="text-xs">
                  {k}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        {kind === "aprovação" && (
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Aprovador
            </span>
            <Input
              value={step.approver ?? ""}
              onChange={(e) =>
                updateWorkflowStep(doc.id, step.id, { approver: e.target.value })
              }
              placeholder={step.owner || "Quem aprova esta etapa"}
              className="mt-1 h-8 text-xs"
            />
          </label>
        )}

        {kind === "decisão" && (
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Pergunta da decisão
            </span>
            <Input
              value={step.decisionQuestion ?? ""}
              onChange={(e) =>
                updateWorkflowStep(doc.id, step.id, {
                  decisionQuestion: e.target.value,
                })
              }
              placeholder={DECISION_HINTS.question}
              className="mt-1 h-8 text-xs"
            />
          </label>
        )}

        <label className="block">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Etapa de correção
          </span>
          <StepSelect
            value={step.correctionStepId ?? ""}
            steps={others}
            emptyLabel="Etapa anterior (padrão)"
            onChange={(v) =>
              updateWorkflowStep(doc.id, step.id, { correctionStepId: v })
            }
          />
        </label>

        <label className="block">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            SE condição verdadeira, ir para
          </span>
          <StepSelect
            value={step.conditionTargetStepId ?? ""}
            steps={others}
            emptyLabel="Sequência padrão"
            onChange={(v) =>
              updateWorkflowStep(doc.id, step.id, { conditionTargetStepId: v })
            }
          />
        </label>

        {/* Build 014 — prazo específico desta etapa. */}
        <SlaField
          label="Prazo da etapa"
          hint={
            defaultSpec
              ? `Padrão do workflow: ${specLabel(defaultSpec)}.`
              : "Sem prazo padrão definido no workflow."
          }
          placeholder={defaultSpec ? `${defaultSpec.amount}` : "Sem prazo"}
          amount={step.slaAmount}
          unit={step.slaUnit}
          onChange={(amount, unit) => setStepSla(doc.id, step.id, amount, unit)}
        />
      </div>


      {kind === "decisão" && (
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Opções da decisão
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => addDecisionOption(doc.id, step.id)}
            >
              <Plus className="mr-1 h-3 w-3" />
              Nova opção
            </Button>
          </div>
          {options.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Nenhuma opção — a decisão ainda não pode ser executada.
            </p>
          ) : (
            <ul className="space-y-2">
              {options.map((option) => (
                <li
                  key={option.id}
                  className="grid gap-2 rounded-lg border bg-card p-2 md:grid-cols-[1fr_1fr_auto]"
                >
                  <Input
                    value={option.label}
                    onChange={(e) =>
                      updateDecisionOption(doc.id, step.id, option.id, {
                        label: e.target.value,
                      })
                    }
                    placeholder={DECISION_HINTS.option}
                    className="h-8 text-xs"
                  />
                  <StepSelect
                    value={option.nextStepId}
                    steps={others}
                    emptyLabel="Próxima etapa (padrão)"
                    onChange={(v) =>
                      updateDecisionOption(doc.id, step.id, option.id, {
                        nextStepId: v,
                      })
                    }
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    aria-label={`Remover opção ${option.label}`}
                    onClick={() => removeDecisionOption(doc.id, step.id, option.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="space-y-2">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Resultado → próxima etapa
        </span>
        <ul className="space-y-2">
          {outcomesOf(step).map((outcome) => {
            const transition = transitionsOf(doc, step).find(
              (t) => t.outcome === outcome,
            );
            return (
              <li
                key={outcome}
                className="grid items-center gap-2 rounded-lg border bg-card p-2 md:grid-cols-[140px_1fr]"
              >
                <span className="text-xs font-medium">{outcome}</span>
                <StepSelect
                  value={step.outcomeTransitions?.[outcome] ?? ""}
                  steps={others}
                  emptyLabel={
                    transition?.nextStepName
                      ? `Padrão · ${transition.nextStepName}`
                      : "Padrão · fim da execução"
                  }
                  onChange={(v) => setOutcomeTransition(doc.id, step.id, outcome, v)}
                />
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function StepSelect({
  value,
  steps,
  emptyLabel,
  onChange,
}: {
  value: string;
  steps: WorkflowStep[];
  emptyLabel: string;
  onChange: (value: string) => void;
}) {
  return (
    <Select
      value={value || END}
      onValueChange={(v) => onChange(v === END ? "" : v)}
    >
      <SelectTrigger className="mt-1 h-8 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={END} className="text-xs">
          {emptyLabel}
        </SelectItem>
        {steps.map((s) => (
          <SelectItem key={s.id} value={s.id} className="text-xs">
            {s.name || "Etapa sem nome"}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
