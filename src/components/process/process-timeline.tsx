import { Clock, Flag, PlayCircle, User } from "lucide-react";
import { StepTypeBadge } from "./process-step-type";
import { getStepType } from "@/config/process-model";
import { cn } from "@/lib/utils";
import type { ProcessStep } from "@/lib/process-store";

/**
 * Build 007 — Timeline do Processo.
 * Leitura sequencial das etapas (ainda sem diagrama): mostra ordem,
 * paralelismo, responsáveis e tempo acumulado.
 */

function parseDays(duration: string): number | null {
  const match = duration.match(/([\d.,]+)\s*(min|h|hora|horas|d|dia|dias|sem|semana|semanas)/i);
  if (!match) return null;
  const value = Number(match[1]!.replace(",", "."));
  if (Number.isNaN(value)) return null;
  const unit = match[2]!.toLowerCase();
  if (unit.startsWith("min")) return value / (60 * 8);
  if (unit.startsWith("h")) return value / 8;
  if (unit.startsWith("sem")) return value * 5;
  return value;
}

function formatDays(total: number) {
  const rounded = Math.round(total * 10) / 10;
  return `${rounded} dia${rounded === 1 ? "" : "s"}`;
}

export function ProcessTimeline({ steps }: { steps: ProcessStep[] }) {
  const durations = steps.map((s) => parseDays(s.duration ?? ""));
  const known = durations.filter((d): d is number => d !== null);
  const total = known.reduce((sum, d) => sum + d, 0);
  const max = Math.max(...known, 1);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium">Timeline do processo</h2>
          <p className="text-xs text-muted-foreground">
            Sequência das {steps.length} etapas modeladas
            {known.length > 0 && ` · duração estimada de ${formatDays(total)}`}.
          </p>
        </div>
      </div>

      <ol className="relative space-y-1">
        <li className="flex items-center gap-3 pl-1 text-xs text-muted-foreground">
          <PlayCircle className="h-4 w-4 text-primary/70" />
          Evento inicial do processo
        </li>

        {steps.map((step, i) => {
          const meta = getStepType(step.type);
          const days = durations[i];
          const width = days === null || days === undefined ? 12 : Math.max(12, (days / max) * 100);
          const parallel = step.execution === "paralela";

          return (
            <li key={step.id} className="relative pl-1">
              <div className="ml-[7px] h-4 w-px bg-border" />
              <div
                className={cn(
                  "group rounded-xl border bg-card px-4 py-3 transition-colors hover:border-border-strong",
                  parallel && "border-dashed",
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="tabular-nums text-[10px] text-muted-foreground/70">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {step.name || "Etapa sem nome"}
                  </span>
                  <StepTypeBadge type={step.type} />
                  {parallel && (
                    <span className="rounded-full border border-dashed px-2 py-0.5 text-[10px] text-muted-foreground">
                      Paralela
                    </span>
                  )}
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {step.owner || "Sem responsável"}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {step.duration || "Tempo não estimado"}
                  </span>
                  {step.dependsOn && (
                    <span className="truncate">Depende de: {step.dependsOn}</span>
                  )}
                </div>

                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full", meta.dot)}
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            </li>
          );
        })}

        <li className="pl-1">
          <div className="ml-[7px] h-4 w-px bg-border" />
          <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <Flag className="h-4 w-4 text-primary/70" />
            Encerramento do processo
          </span>
        </li>
      </ol>
    </div>
  );
}
