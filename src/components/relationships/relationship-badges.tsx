import { Link2, ShieldAlert, GitBranch, Zap } from "lucide-react";
import {
  IMPACT_TONE,
  OBJECT_TYPES,
  type ImpactLevel,
  type RelatedObjectType,
} from "@/config/relationship-model";
import { cn } from "@/lib/utils";
import { Pill } from "@/components/ui/pill";
import type { RelationshipStats } from "@/lib/relationship-store";

/**
 * Build 005 — selos e indicadores discretos de relacionamento.
 * Reutilizados por cards, workspaces e widgets. Nunca poluir a interface:
 * apenas números pequenos e ícones.
 */

export function ObjectTypeBadge({
  type,
  className,
}: {
  type: RelatedObjectType;
  className?: string;
}) {
  const style = OBJECT_TYPES[type];
  return (
    <Pill tone={style.tone} icon={style.icon} className={className}>
      {type}
    </Pill>
  );
}

export function ObjectTypeIcon({
  type,
  className,
}: {
  type: RelatedObjectType;
  className?: string;
}) {
  const style = OBJECT_TYPES[type];
  const Icon = style.icon;
  return (
    <span
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
        style.tone,
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
    </span>
  );
}

export function ImpactBadge({
  impact,
  className,
}: {
  impact: ImpactLevel;
  className?: string;
}) {
  return (
    <Pill
      tone={IMPACT_TONE[impact]}
      shape="full"
      size="default"
      className={cn("capitalize", className)}
    >
      {impact}
    </Pill>
  );
}


export function RelationshipKindChip({ kind }: { kind: string }) {
  return (
    <span className="inline-flex items-center rounded-md border border-dashed px-1.5 py-0.5 text-[10px] text-muted-foreground">
      {kind}
    </span>
  );
}

/** Indicadores discretos: conexões, críticos, dependências, impactos. */
export function RelationshipIndicators({
  stats,
  compact,
  className,
}: {
  stats: RelationshipStats;
  compact?: boolean;
  className?: string;
}) {
  const items = [
    { id: "total", icon: Link2, value: stats.total, label: "conexões" },
    { id: "criticos", icon: ShieldAlert, value: stats.criticos, label: "críticos" },
    { id: "dep", icon: GitBranch, value: stats.dependencias, label: "dependências" },
    { id: "imp", icon: Zap, value: stats.impactos, label: "impactos" },
  ].filter((i) => i.value > 0);

  if (items.length === 0) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground/80",
        className,
      )}
    >
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <span key={item.id} className="inline-flex items-center gap-1">
            <Icon className="h-3 w-3" />
            {item.value}
            {!compact && <span className="text-muted-foreground/70">{item.label}</span>}
          </span>
        );
      })}
    </div>
  );
}
