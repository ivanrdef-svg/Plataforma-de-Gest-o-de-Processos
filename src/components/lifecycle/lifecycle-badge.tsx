import { cn } from "@/lib/utils";
import {
  LIFECYCLE_TRACK,
  stateStyle,
  type LifecycleStateId,
} from "@/config/lifecycle-model";

/**
 * Build 009 — identidade visual do ciclo de vida.
 *
 * Usada por cards, headers e painéis. Não substitui o `WorkspaceStatusPill`
 * existente: é a camada de maturidade, exibida ao lado dos metadados atuais.
 */

export function LifecycleBadge({
  state,
  size = "default",
  showIcon = true,
  className,
}: {
  state: LifecycleStateId;
  size?: "sm" | "default";
  showIcon?: boolean;
  className?: string;
}) {
  const style = stateStyle(state);
  return (
    <Pill
      tone={style.tone}
      shape="full"
      size={size === "sm" ? "default" : "md"}
      gap="gap-1.5"
      {...(showIcon
        ? {
            icon: style.icon,
            iconClassName: size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5",
          }
        : {})}
      title={style.description}
      className={className}
    >
      {style.label}
    </Pill>
  );
}


/** Ponto discreto de estado — para listas densas. */
export function LifecycleDot({
  state,
  className,
}: {
  state: LifecycleStateId;
  className?: string;
}) {
  const style = stateStyle(state);
  return (
    <span
      className={cn("inline-block h-1.5 w-1.5 rounded-full", style.dot, className)}
      title={style.label}
    />
  );
}

/** Régua de maturidade: mostra o estágio dentro da trilha padrão. */
export function LifecycleTrack({
  state,
  className,
  showLabels = false,
}: {
  state: LifecycleStateId;
  className?: string;
  showLabels?: boolean;
}) {
  const style = stateStyle(state);
  const index = LIFECYCLE_TRACK.indexOf(state);
  const terminal = index < 0;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center gap-1">
        {LIFECYCLE_TRACK.map((id, i) => {
          const reached = !terminal && i <= index;
          return (
            <span
              key={id}
              title={stateStyle(id).label}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                reached ? style.dot : "bg-border",
                terminal && "bg-border",
              )}
            />
          );
        })}
      </div>
      {showLabels && (
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{terminal ? style.label : stateStyle(LIFECYCLE_TRACK[0]!).label}</span>
          <span>{terminal ? "fora da trilha" : `${style.maturity}% de maturidade`}</span>
        </div>
      )}
    </div>
  );
}
