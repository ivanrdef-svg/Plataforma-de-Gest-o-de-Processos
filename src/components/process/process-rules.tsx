import { AlertTriangle, Plus, Scale, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AutoTextarea } from "./process-section-block";
import { cn } from "@/lib/utils";
import {
  RULE_CRITICALITY,
  RULE_CRITICALITY_TONE,
  type RuleCriticality,
} from "@/config/process-model";
import type { ProcessRule } from "@/lib/process-store";

/**
 * Build 007 — bloco de Regras de Negócio.
 * Cada regra é um objeto estruturado (nome, descrição, aplicação, impacto,
 * criticidade) e alimentará a futura geração automática do BPM.
 */

function RuleCard({
  rule,
  onChange,
  onRemove,
}: {
  rule: ProcessRule;
  onChange: (patch: Partial<ProcessRule>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="group rounded-xl border bg-card transition-colors hover:border-border-strong">
      <div className="flex items-start gap-2 px-4 py-3">
        <Scale className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <input
            value={rule.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Nome da regra"
            className="w-full bg-transparent text-sm font-medium tracking-tight outline-none"
          />
          <AutoTextarea
            minRows={1}
            value={rule.description}
            onChange={(description) => onChange({ description })}
            placeholder="O que esta regra determina…"
            className="mt-0.5 text-xs"
          />
        </div>
        <Button
          variant="ghost"
          size="sm"
          aria-label="Remover regra"
          onClick={onRemove}
          className="h-7 w-7 shrink-0 p-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="grid gap-3 border-t px-4 py-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Aplicação
          </Label>
          <Input
            value={rule.application}
            onChange={(e) => onChange({ application: e.target.value })}
            placeholder="Onde a regra é aplicada"
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Impacto
          </Label>
          <Input
            value={rule.impact}
            onChange={(e) => onChange({ impact: e.target.value })}
            placeholder="Consequência do descumprimento"
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Criticidade
          </Label>
          <div className="flex flex-wrap gap-1.5">
            {RULE_CRITICALITY.map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => onChange({ criticality: level as RuleCriticality })}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[10px] capitalize transition-colors",
                  rule.criticality === level
                    ? RULE_CRITICALITY_TONE[level]
                    : "text-muted-foreground hover:border-border-strong hover:text-foreground",
                )}
              >
                {level}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProcessRules({
  rules,
  onChange,
  onRemove,
  onAdd,
}: {
  rules: ProcessRule[];
  onChange: (id: string, patch: Partial<ProcessRule>) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
}) {
  const critical = rules.filter((r) => r.criticality === "crítica").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium">Regras de negócio</h2>
          <p className="text-xs text-muted-foreground">
            {rules.length} regra{rules.length === 1 ? "" : "s"} mapeada
            {rules.length === 1 ? "" : "s"}
            {critical > 0 && ` · ${critical} crítica${critical === 1 ? "" : "s"}`}
          </p>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={onAdd}>
          <Plus className="h-3.5 w-3.5" />
          Nova regra
        </Button>
      </div>

      {rules.length === 0 ? (
        <div className="flex items-start gap-2 rounded-xl border border-dashed px-4 py-6 text-xs text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5" />
          Nenhuma regra registrada. As regras determinam o comportamento do fluxo e
          orientarão os gateways do futuro modelo BPM.
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              onChange={(patch) => onChange(rule.id, patch)}
              onRemove={() => onRemove(rule.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
