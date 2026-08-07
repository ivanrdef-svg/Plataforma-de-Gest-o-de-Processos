import { useState } from "react";
import type { Relationship } from "@/lib/relationship-store";
import { OBJECT_TYPES } from "@/config/relationship-model";
import { ImpactBadge, RelationshipKindChip } from "./relationship-badges";
import { cn } from "@/lib/utils";

/**
 * Build 005 — mapa visual simplificado de conexões.
 * Não é um Knowledge Graph: apenas uma leitura visual de como o objeto
 * aberto se conecta ao ecossistema corporativo.
 */

export function RelationshipMap({
  centerName,
  centerType,
  items,
}: {
  centerName: string;
  centerType: string;
  items: Relationship[];
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const nodes = items.slice(0, 12);

  /** Posições em porcentagem — o mapa acompanha a largura disponível. */
  const positions = nodes.map((rel, i) => {
    const angle = (i / Math.max(nodes.length, 1)) * Math.PI * 2 - Math.PI / 2;
    return {
      rel,
      x: 50 + Math.cos(angle) * 36,
      y: 50 + Math.sin(angle) * 34,
    };
  });

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="relative h-[440px] w-full">
        <svg
          width="100%"
          height="100%"
          className="absolute inset-0"
          aria-hidden="true"
        >
          {positions.map(({ rel, x, y }) => {
            const active = hovered === rel.id;
            return (
              <line
                key={rel.id}
                x1="50%"
                y1="50%"
                x2={`${x}%`}
                y2={`${y}%`}
                className={cn(
                  "transition-all duration-200",
                  active ? "stroke-primary" : "stroke-border",
                )}
                strokeWidth={active ? 2 : 1}
                strokeDasharray={
                  rel.impact === "crítico" || rel.impact === "alto" ? undefined : "4 4"
                }
              />
            );
          })}
        </svg>

        <div className="absolute left-1/2 top-1/2 w-[200px] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5 text-center shadow-soft">
          <p className="text-[10px] uppercase tracking-wider text-primary">
            {centerType}
          </p>
          <p className="truncate text-sm font-medium">{centerName}</p>
        </div>

        {positions.map(({ rel, x, y }) => {
          const Icon = OBJECT_TYPES[rel.targetType].icon;
          const active = hovered === rel.id;
          return (
            <button
              key={rel.id}
              type="button"
              onMouseEnter={() => setHovered(rel.id)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(rel.id)}
              onBlur={() => setHovered(null)}
              className={cn(
                "absolute flex w-[150px] -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-lg border bg-background px-2 py-1.5 text-left transition-all duration-200",
                active ? "border-primary/50 shadow-float" : "hover:border-border-strong",
              )}
              style={{ left: `${x}%`, top: `${y}%` }}
            >
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded",
                  OBJECT_TYPES[rel.targetType].tone,
                )}
              >
                <Icon className="h-3 w-3" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[11px] font-medium">
                  {rel.targetName}
                </span>
                <span className="block truncate text-[10px] text-muted-foreground">
                  {rel.kind}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 border-t pt-3 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-px w-5 bg-foreground/40" /> vínculo de alto impacto
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-px w-5 border-t border-dashed border-foreground/40" />{" "}
          vínculo de apoio
        </span>
        {hovered && (
          <span className="ml-auto inline-flex items-center gap-1.5">
            <RelationshipKindChip
              kind={items.find((i) => i.id === hovered)?.kind ?? ""}
            />
            <ImpactBadge
              impact={items.find((i) => i.id === hovered)!.impact}
            />
          </span>
        )}
      </div>
    </div>
  );
}
