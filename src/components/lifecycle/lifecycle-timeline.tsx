import { stateStyle } from "@/config/lifecycle-model";
import type { LifecycleEvent } from "@/lib/lifecycle-store";
import { cn } from "@/lib/utils";

/**
 * Build 009 — Timeline de evolução do objeto.
 *
 * Data, usuário, mudança de estado e observação. Estilo próximo de
 * GitHub Pull Requests / Linear, porém mais limpo.
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

function formatTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function LifecycleTimeline({
  events,
  compact = false,
  className,
}: {
  events: LifecycleEvent[];
  compact?: boolean;
  className?: string;
}) {
  const ordered = [...events].reverse();

  if (ordered.length === 0) {
    return (
      <p className={cn("text-xs text-muted-foreground", className)}>
        Nenhuma movimentação registrada ainda.
      </p>
    );
  }

  return (
    <ol className={cn("relative space-y-0", className)}>
      {ordered.map((event, index) => {
        const style = stateStyle(event.to);
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
                <span className="text-xs font-medium text-foreground">
                  {event.from
                    ? `${stateStyle(event.from).label} → ${style.label}`
                    : style.label}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {event.user}
                </span>
              </div>
              {!compact && event.note && (
                <p className="mt-0.5 text-xs text-muted-foreground">{event.note}</p>
              )}
              <p className="mt-0.5 text-[11px] text-muted-foreground/80">
                {formatDate(event.at)} · {formatTime(event.at)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
