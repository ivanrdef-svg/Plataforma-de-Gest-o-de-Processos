import { useState } from "react";
import { ChevronDown, Link2, Timer } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StepTypeBadge } from "@/components/process/process-step-type";
import { ResponsibilityBadge } from "@/components/governance/governance-badges";
import { RESPONSIBILITY_ORDER } from "@/config/governance-model";
import {
  EXECUTION_RULE_HINTS,
  WORKFLOW_EXECUTION_TYPES,
  executionLabel,
} from "@/config/workflow-model";
import { getStepType, type ProcessStepTypeId } from "@/config/process-model";
import { StepRulesEditor } from "./step-rules-editor";
import type { WorkflowDoc, WorkflowStep } from "@/lib/workflow-store";
import { cn } from "@/lib/utils";

/**
 * Build 011 — etapas executáveis do Workflow.
 *
 * As etapas continuam sendo as do Processo (Process Modeling Engine): aqui
 * apenas se configura o que a execução futura precisará saber.
 */

function Field({
  label,
  value,
  onChange,
  hint,
  area,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  area?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {area ? (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={hint}
          className="mt-1 min-h-[60px] resize-none text-xs"
        />
      ) : (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={hint}
          className="mt-1 h-8 text-xs"
        />
      )}
    </label>
  );
}

export function stepConfigured(step: WorkflowStep) {
  return Boolean(
    step.owner.trim() &&
      step.inputs.trim() &&
      step.outputs.trim() &&
      step.deadline.trim() &&
      step.expectedAction.trim(),
  );
}

export function WorkflowSteps({
  steps,
  onChange,
  doc,
}: {
  steps: WorkflowStep[];
  onChange: (id: string, patch: Partial<WorkflowStep>) => void;
  /** Build 013 — quando presente, habilita a configuração das regras. */
  doc?: WorkflowDoc;
}) {

  const [open, setOpen] = useState<Record<string, boolean>>({});

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {steps.length} etapas herdadas do processo de origem ·{" "}
        {steps.filter(stepConfigured).length} prontas para execução
      </p>

      {steps.map((step, i) => {
        const type = getStepType(step.type);
        const expanded = open[step.id];
        const ready = stepConfigured(step);
        return (
          <article key={step.id} className="rounded-xl border bg-card">
            <button
              type="button"
              onClick={() => setOpen((o) => ({ ...o, [step.id]: !o[step.id] }))}
              className="flex w-full items-center gap-3 px-4 py-3 text-left"
            >
              <span className="w-6 shrink-0 tabular-nums text-[11px] text-muted-foreground/70">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {step.name || "Etapa sem nome"}
                </span>
                <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                  {step.owner || "sem responsável"}
                  {step.deadline ? ` · ${step.deadline}` : ""}
                  {step.dependsOn ? ` · depende de ${step.dependsOn}` : ""}
                </span>
              </span>
              <span className="hidden shrink-0 text-[11px] text-muted-foreground sm:inline">
                {executionLabel(step.type, type.label)}
              </span>
              <StepTypeBadge type={step.type} />
              <ResponsibilityBadge role={step.role} />
              <span
                className={cn(
                  "hidden shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium sm:inline-block",
                  ready
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    : "bg-amber-500/10 text-amber-700 dark:text-amber-400",
                )}
              >
                {ready ? "Configurada" : "Pendente"}
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                  expanded && "rotate-180",
                )}
              />
            </button>

            {expanded && (
              <div className="grid gap-3 border-t px-4 py-4 md:grid-cols-2">
                <label className="block">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Tipo de execução
                  </span>
                  <Select
                    value={step.type ?? "atividade"}
                    onValueChange={(v) =>
                      onChange(step.id, { type: v as ProcessStepTypeId })
                    }
                  >
                    <SelectTrigger className="mt-1 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WORKFLOW_EXECUTION_TYPES.map((id) => (
                        <SelectItem key={id} value={id} className="text-xs">
                          {executionLabel(id, getStepType(id).label)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>

                <label className="block">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Papel na governança
                  </span>
                  <Select
                    value={step.role}
                    onValueChange={(v) =>
                      onChange(step.id, { role: v as WorkflowStep["role"] })
                    }
                  >
                    <SelectTrigger className="mt-1 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RESPONSIBILITY_ORDER.map((role) => (
                        <SelectItem key={role} value={role} className="text-xs">
                          {role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>

                <Field
                  label="Responsável"
                  value={step.owner}
                  onChange={(v) => onChange(step.id, { owner: v })}
                  hint="Quem executa esta etapa"
                />
                <Field
                  label="Dependências"
                  value={step.dependsOn}
                  onChange={(v) => onChange(step.id, { dependsOn: v })}
                  hint="Etapa anterior necessária"
                />
                <Field
                  label="Entrada"
                  value={step.inputs}
                  onChange={(v) => onChange(step.id, { inputs: v })}
                />
                <Field
                  label="Saída"
                  value={step.outputs}
                  onChange={(v) => onChange(step.id, { outputs: v })}
                />
                <Field
                  label="Tempo estimado"
                  value={step.duration}
                  onChange={(v) => onChange(step.id, { duration: v })}
                />
                <Field
                  label="Prazo"
                  value={step.deadline}
                  onChange={(v) => onChange(step.id, { deadline: v })}
                  hint={EXECUTION_RULE_HINTS.deadline}
                />
                <Field
                  label="Pré-condição"
                  value={step.precondition}
                  onChange={(v) => onChange(step.id, { precondition: v })}
                  hint={EXECUTION_RULE_HINTS.precondition}
                  area
                />
                <Field
                  label="Condição"
                  value={step.condition}
                  onChange={(v) => onChange(step.id, { condition: v })}
                  hint={EXECUTION_RULE_HINTS.condition}
                  area
                />
                <Field
                  label="Ação esperada"
                  value={step.expectedAction}
                  onChange={(v) => onChange(step.id, { expectedAction: v })}
                  hint={EXECUTION_RULE_HINTS.expectedAction}
                  area
                />
                <Field
                  label="Descrição"
                  value={step.description}
                  onChange={(v) => onChange(step.id, { description: v })}
                  area
                />

                {doc && <StepRulesEditor doc={doc} step={step} />}

                <p className="col-span-full inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Link2 className="h-3 w-3" />
                  Etapa vinculada ao processo de origem.
                  <Timer className="ml-2 h-3 w-3" />
                  Regras aplicadas na execução da instância.
                </p>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
