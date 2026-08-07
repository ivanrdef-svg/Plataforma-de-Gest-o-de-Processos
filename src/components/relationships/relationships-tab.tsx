import { useMemo, useState } from "react";
import { LayoutList, Network, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/layout/page";
import {
  summarize,
  useRelationships,
  type Relationship,
} from "@/lib/relationship-store";
import { RelationshipList } from "./relationship-list";
import { RelationshipMap } from "./relationship-map";
import { NewRelationshipSheet } from "./new-relationship-sheet";
import { RelationshipIndicators } from "./relationship-badges";

/**
 * Build 005 — aba "Relacionamentos" única, usada por TODOS os workspaces.
 * Nenhum objeto existe isolado: lista estruturada + mapa visual + criação.
 */

export function RelationshipsTab({
  objectId,
  objectName,
  objectType,
}: {
  objectId: string;
  objectName: string;
  objectType: string;
}) {
  const [view, setView] = useState<"lista" | "mapa">("lista");
  const [open, setOpen] = useState(false);
  const items: Relationship[] = useRelationships(objectId);
  const stats = useMemo(() => summarize(items), [items]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">
            {stats.total} objetos conectados
          </p>
          <RelationshipIndicators stats={stats} className="mt-1" />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border p-0.5">
            {(
              [
                { id: "lista", label: "Lista", icon: LayoutList },
                { id: "mapa", label: "Mapa", icon: Network },
              ] as const
            ).map((v) => {
              const Icon = v.icon;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setView(v.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-colors",
                    view === v.id
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {v.label}
                </button>
              );
            })}
          </div>

          <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Novo relacionamento
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<Network className="h-5 w-5" />}
          title="Nenhum relacionamento ainda"
          description="Conecte este objeto a normas, processos, POPs, riscos e controles."
        />
      ) : view === "lista" ? (
        <RelationshipList items={items} />
      ) : (
        <RelationshipMap
          centerName={objectName}
          centerType={objectType}
          items={items}
        />
      )}

      <NewRelationshipSheet
        sourceId={objectId}
        sourceName={objectName}
        open={open}
        onOpenChange={setOpen}
      />
    </div>
  );
}
