import { GOVERNANCE_EVENT } from "@/config/governance-model";
import type { GovernanceEvent } from "@/lib/governance-store";
import { cn } from "@/lib/utils";

/**
 * Build 010 — Timeline de auditoria de governança.
 *
 * Mesmo mecanismo visual da timeline de ciclo de vida (Build 009): ponto com
 * ícone, linha vertical e metadados discretos.
 */

function formatDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function GovernanceTimeline({
  events,
  compact = false,
  className,
}: {
  events: GovernanceEvent[];
  compact?: boolean;
  className?: string;
}) {
  const ordered = [...events].reverse();

  if (ordered.length === 0) {
    return (
      <p className={cn("text-xs text-muted-foreground", className)}>
        Nenhum evento de governança registrado ainda.
      </p>
    );
  }

  return (
    <ol className={cn("relative space-y-0", className)}>
      {ordered.map((event, index) => {
        const style = GOVERNANCE_EVENT[event.kind];
        const Icon = style.icon;
        const last = index === ordered.length - 1;
        return (
          <li key={event.id} className="relative flex gap-3 pb-4 last:pb-0">
            {!last && (
              <span
                aria-hidden
                className="absolute left-[13px] top-7 bottom-0 w-px bg-border"
              />
            )}
            <span
              className={cn(
                "relative z-10 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                style.tone,
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-xs font-medium text-foreground">{event.title}</span>
                <span className="text-[11px] text-muted-foreground">{event.user}</span>
              </div>
              {!compact && event.note && (
                <p className="mt-0.5 text-xs text-muted-foreground">{event.note}</p>
              )}
              <p className="mt-0.5 text-[11px] text-muted-foreground/80">
                {formatDate(event.at)} · {style.label}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
