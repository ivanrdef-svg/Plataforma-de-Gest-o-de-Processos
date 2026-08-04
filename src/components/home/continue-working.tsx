import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEMO_RECENT_OBJECTS, type DemoRecentObject } from "@/config/workspace-demo";

/**
 * Build 2.5 — "Continue trabalhando".
 * Cartões dos últimos objetos abertos. Somente visual, dados simulados.
 */

function ContinueCard({ item }: { item: DemoRecentObject }) {
  const cta = (
    <Button size="sm" variant="secondary" className="h-7 gap-1 px-2.5 text-xs">
      Continuar
      <ArrowRight className="h-3 w-3" />
    </Button>
  );

  return (
    <div className="group flex flex-col rounded-xl border bg-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-float">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{item.name}</p>
          <span className="mt-1 inline-block rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {item.type}
          </span>
        </div>
      </div>

      {typeof item.progress === "number" && (
        <div className="mt-4">
          <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary/70 transition-all duration-500"
              style={{ width: `${item.progress}%` }}
            />
          </div>
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            {item.progress}% concluído
          </p>
        </div>
      )}

      <div className="mt-4 flex items-end justify-between gap-2 border-t pt-3">
        <p className="min-w-0 truncate text-[11px] text-muted-foreground/80">
          {item.owner} · {item.editedAt}
        </p>
        {item.to === "knowledge" ? (
          <Link to="/knowledge/$packageId" params={{ packageId: item.targetId }}>
            {cta}
          </Link>
        ) : (
          <Link to="/workspaces/$workspaceId" params={{ workspaceId: item.targetId }}>
            {cta}
          </Link>
        )}
      </div>
    </div>
  );
}

export function ContinueWorking() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {DEMO_RECENT_OBJECTS.map((item) => (
        <ContinueCard key={item.id} item={item} />
      ))}
    </div>
  );
}
