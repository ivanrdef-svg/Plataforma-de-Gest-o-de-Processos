import { useMemo } from "react";
import { useRelationships, summarize } from "@/lib/relationship-store";
import type { RelatedObjectType } from "@/config/relationship-model";
import { ObjectTypeIcon, ImpactBadge, RelationshipIndicators } from "./relationship-badges";

/**
 * Build 005 — resumo compacto de relacionamentos, agrupado por tipo de objeto.
 * Usado no Workspace do POP e reutilizável por qualquer outro workspace.
 */

const DEFAULT_GROUPS: RelatedObjectType[] = [
  "Norma",
  "Knowledge Package",
  "Processo",
  "Checklist",
  "Risco",
  "Controle",
];

export function RelationshipSummary({
  objectId,
  groups = DEFAULT_GROUPS,
}: {
  objectId: string;
  groups?: RelatedObjectType[];
}) {
  const items = useRelationships(objectId);
  const stats = useMemo(() => summarize(items), [items]);

  const grouped = groups.map((type) => ({
    type,
    items: items.filter((r) => r.targetType === type),
  }));

  return (
    <div className="space-y-4">
      <RelationshipIndicators stats={stats} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {grouped.map((group) => (
          <div key={group.type} className="rounded-xl border bg-card p-3.5">
            <div className="flex items-center gap-2">
              <ObjectTypeIcon type={group.type} />
              <div className="min-w-0">
                <p className="truncate text-xs font-medium">{group.type}</p>
                <p className="text-[11px] text-muted-foreground">
                  {group.items.length} vínculo{group.items.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>
            <ul className="mt-2.5 space-y-1.5">
              {group.items.length === 0 ? (
                <li className="text-[11px] text-muted-foreground/70">
                  Nenhum vínculo registrado.
                </li>
              ) : (
                group.items.slice(0, 3).map((rel) => (
                  <li
                    key={rel.id}
                    className="flex items-center justify-between gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-muted/60"
                  >
                    <span className="min-w-0 truncate text-[11px] text-foreground/90">
                      {rel.targetName}
                    </span>
                    <ImpactBadge impact={rel.impact} />
                  </li>
                ))
              )}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
