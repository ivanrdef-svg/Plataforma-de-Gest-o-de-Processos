import { Plus, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { PARTICIPANT_ROLES, type ParticipantRole } from "@/config/process-model";
import type { ProcessParticipant, ProcessStep } from "@/lib/process-store";

/**
 * Build 007 — bloco de Participantes.
 * Relaciona pessoas, papéis e áreas às etapas já modeladas do processo.
 */

function ParticipantCard({
  participant,
  steps,
  onChange,
  onToggleStep,
  onRemove,
}: {
  participant: ProcessParticipant;
  steps: ProcessStep[];
  onChange: (patch: Partial<ProcessParticipant>) => void;
  onToggleStep: (stepId: string) => void;
  onRemove: () => void;
}) {
  return (
    <div className="group rounded-xl border bg-card transition-colors hover:border-border-strong">
      <div className="flex items-start gap-2 px-4 py-3">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-medium uppercase text-muted-foreground">
          {participant.name.trim().charAt(0) || "?"}
        </span>
        <div className="min-w-0 flex-1">
          <input
            value={participant.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Nome, cargo ou time"
            className="w-full bg-transparent text-sm font-medium tracking-tight outline-none"
          />
          <input
            value={participant.area}
            onChange={(e) => onChange({ area: e.target.value })}
            placeholder="Área organizacional"
            className="mt-0.5 w-full bg-transparent text-[11px] text-muted-foreground outline-none"
          />
        </div>
        <Button
          variant="ghost"
          size="sm"
          aria-label="Remover participante"
          onClick={onRemove}
          className="h-7 w-7 shrink-0 p-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="space-y-3 border-t px-4 py-3">
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Papel
          </Label>
          <div className="flex flex-wrap gap-1.5">
            {PARTICIPANT_ROLES.map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => onChange({ role: role as ParticipantRole })}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[10px] transition-colors",
                  participant.role === role
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "text-muted-foreground hover:border-border-strong hover:text-foreground",
                )}
              >
                {role}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Etapas em que atua
          </Label>
          {steps.length === 0 ? (
            <p className="text-[11px] text-muted-foreground/80">
              Nenhuma etapa modelada ainda.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {steps.map((step, i) => (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => onToggleStep(step.id)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[10px] transition-colors",
                    participant.stepIds.includes(step.id)
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "text-muted-foreground hover:border-border-strong hover:text-foreground",
                  )}
                >
                  <span className="tabular-nums opacity-60">
                    {String(i + 1).padStart(2, "0")}
                  </span>{" "}
                  {step.name || "Etapa sem nome"}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ProcessParticipants({
  participants,
  steps,
  onChange,
  onToggleStep,
  onRemove,
  onAdd,
  onImportFromSteps,
}: {
  participants: ProcessParticipant[];
  steps: ProcessStep[];
  onChange: (id: string, patch: Partial<ProcessParticipant>) => void;
  onToggleStep: (id: string, stepId: string) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
  onImportFromSteps: () => void;
}) {
  const owners = new Set(
    steps.map((s) => s.owner.trim()).filter(Boolean),
  );
  const mapped = new Set(participants.map((p) => p.name.trim()));
  const pending = [...owners].filter((o) => !mapped.has(o));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium">Participantes</h2>
          <p className="text-xs text-muted-foreground">
            {participants.length} participante
            {participants.length === 1 ? "" : "s"} · papéis ligados às etapas do
            processo.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {pending.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="gap-1.5"
              onClick={onImportFromSteps}
            >
              <Users className="h-3.5 w-3.5" />
              Importar das etapas ({pending.length})
            </Button>
          )}
          <Button size="sm" variant="outline" className="gap-1.5" onClick={onAdd}>
            <Plus className="h-3.5 w-3.5" />
            Novo participante
          </Button>
        </div>
      </div>

      {participants.length === 0 ? (
        <div className="rounded-xl border border-dashed px-4 py-6 text-xs text-muted-foreground">
          Nenhum participante registrado. Importe os responsáveis já indicados nas
          etapas para montar rapidamente o mapa de papéis.
        </div>
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {participants.map((p) => (
            <ParticipantCard
              key={p.id}
              participant={p}
              steps={steps}
              onChange={(patch) => onChange(p.id, patch)}
              onToggleStep={(stepId) => onToggleStep(p.id, stepId)}
              onRemove={() => onRemove(p.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
