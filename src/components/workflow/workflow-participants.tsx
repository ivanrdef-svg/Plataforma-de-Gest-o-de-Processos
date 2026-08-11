import { Plus, Trash2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RESPONSIBILITY_ORDER } from "@/config/governance-model";
import type { ResponsibilityRole } from "@/config/governance-model";
import type { WorkflowDoc, WorkflowParticipant } from "@/lib/workflow-store";
import { cn } from "@/lib/utils";

/**
 * Build 011 — participantes do Workflow.
 *
 * Os papéis são exatamente os papéis do Governance Engine (Build 010),
 * garantindo coerência entre responsabilidade e execução.
 */
export function WorkflowParticipants({
  doc,
  onChange,
  onToggleStep,
  onAdd,
  onRemove,
}: {
  doc: WorkflowDoc;
  onChange: (id: string, patch: Partial<WorkflowParticipant>) => void;
  onToggleStep: (participantId: string, stepId: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {doc.participants.length} participantes ·{" "}
          {doc.participants.filter((p) => p.stepIds.length > 0).length} com etapas
          atribuídas
        </p>
        <Button variant="outline" size="sm" onClick={onAdd} className="h-8">
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Participante
        </Button>
      </div>

      <div className="space-y-3">
        {doc.participants.map((p) => (
          <article key={p.id} className="rounded-xl border bg-card p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <UserRound className="h-4 w-4" />
              </span>
              <Input
                value={p.name}
                onChange={(e) => onChange(p.id, { name: e.target.value })}
                className="h-8 max-w-[220px] flex-1 text-xs"
              />
              <Select
                value={p.role}
                onValueChange={(v) =>
                  onChange(p.id, { role: v as ResponsibilityRole })
                }
              >
                <SelectTrigger className="h-8 w-[150px] text-xs">
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
              <Input
                value={p.area}
                onChange={(e) => onChange(p.id, { area: e.target.value })}
                placeholder="Área"
                className="h-8 w-[160px] text-xs"
              />
              <Button
                variant="ghost"
                size="icon"
                className="ml-auto h-8 w-8 text-muted-foreground"
                onClick={() => onRemove(p.id)}
                aria-label="Remover participante"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {doc.steps.map((step) => {
                const active = p.stepIds.includes(step.id);
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => onToggleStep(p.id, step.id)}
                    className={cn(
                      "rounded-md border px-2 py-1 text-[11px] transition-colors",
                      active
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {step.name || "Etapa"}
                  </button>
                );
              })}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
