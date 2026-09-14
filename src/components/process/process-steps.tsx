import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  CircleCheck,
  CircleDot,
  Clock,
  GitBranch,
  LogIn,
  LogOut,
  Plus,
  Trash2,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { AutoTextarea } from "./process-section-block";
import { StepTypePicker } from "./process-step-type";
import { PROCESS_EXECUTION_MODES } from "@/config/process-model";
import type { ProcessStep } from "@/lib/process-store";


/**
 * Build 006 — Etapas do Processo.
 *
 * Ainda não há BPM: as etapas são organizadas como uma lista estruturada,
 * com trilha de conexão visual entre elas para reforçar a ideia de fluxo
 * sem transformar a tela em um editor de fluxograma.
 */

function Field({
  label,
  icon: Icon,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  icon: typeof User;
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </Label>
      <Input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 text-xs"
      />
    </div>
  );
}

function StepCard({
  index,
  total,
  step,
  readOnly,
  onChange,
  onMove,
  onRemove,
}: {
  index: number;
  total: number;
  step: ProcessStep;
  readOnly: boolean;
  onChange: (patch: Partial<ProcessStep>) => void;
  onMove: (delta: number) => void;
  onRemove: () => void;
}) {
  const [expanded, setOpen] = useState(false);
  const open = readOnly || expanded;

  return (
    <div className="relative pl-10">
      <span className="absolute left-0 top-3 flex h-7 w-7 items-center justify-center rounded-full border bg-background text-[11px] font-medium tabular-nums text-muted-foreground">
        {index + 1}
      </span>
      {index < total - 1 && (
        <span className="absolute left-[13px] top-10 h-[calc(100%-1rem)] w-px bg-border" />
      )}

      <div className="group rounded-xl border bg-card transition-colors hover:border-border-strong">
        <div className="flex items-start gap-2 px-4 py-3">
          <button
            type="button"
            aria-label={open ? "Recolher etapa" : "Expandir etapa"}
            onClick={() => setOpen((o) => !o)}
            className="mt-0.5 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                !open && "-rotate-90",
              )}
            />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={step.name}
                onChange={(e) => onChange({ name: e.target.value })}
                placeholder="Nome da etapa"
                className="min-w-0 flex-1 bg-transparent text-sm font-medium tracking-tight outline-none"
              />
              <StepTypePicker
                value={step.type}
                onChange={(type) => onChange({ type })}
              />
            </div>
            {!open && (
              <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[11px] text-muted-foreground">
                {step.owner && (
                  <span className="inline-flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {step.owner}
                  </span>
                )}
                {step.duration && (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {step.duration}
                  </span>
                )}
                {step.outputs && (
                  <span className="inline-flex items-center gap-1">
                    <LogOut className="h-3 w-3" />
                    {step.outputs}
                  </span>
                )}
                {step.execution === "paralela" && (
                  <span className="rounded-full border border-dashed px-1.5 text-[10px]">
                    Paralela
                  </span>
                )}
              </p>
            )}
          </div>


          <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
            <Button
              variant="ghost"
              size="sm"
              aria-label="Mover para cima"
              className="h-7 w-7 p-0"
              onClick={() => onMove(-1)}
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              aria-label="Mover para baixo"
              className="h-7 w-7 p-0"
              onClick={() => onMove(1)}
            >
              <ArrowDown className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              aria-label="Remover etapa"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
              onClick={onRemove}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {open && (
          <div className="space-y-4 border-t px-4 py-4 pl-10">
            <AutoTextarea
              value={step.description}
              onChange={(description) => onChange({ description })}
              placeholder="O que acontece nesta etapa…"
            />

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Field
                label="Responsável"
                icon={User}
                value={step.owner}
                placeholder="Área ou cargo"
                onChange={(owner) => onChange({ owner })}
              />
              <Field
                label="Entradas"
                icon={LogIn}
                value={step.inputs}
                placeholder="O que a etapa recebe"
                onChange={(inputs) => onChange({ inputs })}
              />
              <Field
                label="Saídas"
                icon={LogOut}
                value={step.outputs}
                placeholder="O que a etapa entrega"
                onChange={(outputs) => onChange({ outputs })}
              />
              <Field
                label="Tempo estimado"
                icon={Clock}
                value={step.duration}
                placeholder="Ex.: 2 dias"
                onChange={(duration) => onChange({ duration })}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Pré-condições"
                icon={CircleDot}
                value={step.preconditions ?? ""}
                placeholder="O que precisa existir antes"
                onChange={(preconditions) => onChange({ preconditions })}
              />
              <Field
                label="Pós-condições"
                icon={CircleCheck}
                value={step.postconditions ?? ""}
                placeholder="Estado esperado ao concluir"
                onChange={(postconditions) => onChange({ postconditions })}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <GitBranch className="h-3 w-3" />
                  Execução
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {PROCESS_EXECUTION_MODES.map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => onChange({ execution: mode.id })}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-[10px] capitalize transition-colors",
                        (step.execution ?? "sequencial") === mode.id
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "text-muted-foreground hover:border-border-strong hover:text-foreground",
                      )}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>
              <Field
                label="Depende de"
                icon={GitBranch}
                value={step.dependsOn ?? ""}
                placeholder="Etapa(s) anteriores"
                onChange={(dependsOn) => onChange({ dependsOn })}
              />
            </div>



            <div className="rounded-lg bg-muted/50 px-3 py-2">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Observações
              </Label>
              <AutoTextarea
                minRows={1}
                value={step.notes}
                onChange={(notes) => onChange({ notes })}
                placeholder="Exceções, riscos e pontos de atenção desta etapa…"
                className="mt-1 text-xs"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function ProcessSteps({
  steps,
  readOnly = false,
  onChange,
  onMove,
  onRemove,
  onAdd,
}: {
  steps: ProcessStep[];
  readOnly?: boolean;
  onChange: (id: string, patch: Partial<ProcessStep>) => void;
  onMove: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium">Etapas do Processo</h2>
          <p className="text-xs text-muted-foreground">
            {steps.length} etapas mapeadas · organize a sequência antes da modelagem BPM.
          </p>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={onAdd}>
          <Plus className="h-3.5 w-3.5" />
          Nova etapa
        </Button>
      </div>

      <div className="space-y-3">
        {steps.map((step, i) => (
          <StepCard
            key={step.id}
            index={i}
            total={steps.length}
            step={step}
            readOnly={readOnly}
            onChange={(patch) => onChange(step.id, patch)}
            onMove={(delta) => onMove(step.id, delta)}
            onRemove={() => onRemove(step.id)}
          />
        ))}
      </div>
    </div>
  );
}
