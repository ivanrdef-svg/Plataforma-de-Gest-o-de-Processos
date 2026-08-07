import { ArrowUpRight } from "lucide-react";
import type { Relationship } from "@/lib/relationship-store";
import {
  ImpactBadge,
  ObjectTypeIcon,
  RelationshipKindChip,
} from "./relationship-badges";

/**
 * Build 005 — lista estruturada de relacionamentos em formato de cartões.
 * Evita aparência de tabela tradicional (Notion / Linear / GitHub).
 */

export function RelationshipList({ items }: { items: Relationship[] }) {
  return (
    <div className="grid gap-2.5 xl:grid-cols-2">
      {items.map((rel) => (
        <div
          key={rel.id}
          className="group rounded-xl border bg-card p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-float"
        >
          <div className="flex items-start gap-2.5">
            <ObjectTypeIcon type={rel.targetType} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-sm font-medium">{rel.targetName}</span>
                <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-1">
                <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {rel.targetType}
                </span>
                <RelationshipKindChip kind={rel.kind} />
                <ImpactBadge impact={rel.impact} />
              </div>
            </div>
          </div>

          {rel.description && (
            <p className="mt-2.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {rel.description}
            </p>
          )}

          {rel.notes && (
            <p className="mt-1.5 line-clamp-1 text-[11px] italic text-muted-foreground/70">
              {rel.notes}
            </p>
          )}

          <p className="mt-3 border-t pt-2 text-[11px] text-muted-foreground/80">
            Atualizado {rel.updatedAt}
          </p>
        </div>
      ))}
    </div>
  );
}
