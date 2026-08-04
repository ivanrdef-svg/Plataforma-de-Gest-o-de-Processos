import { cn } from "@/lib/utils";

/**
 * Context Bar reutilizável: relacionamentos, dependências, impactos e
 * objetos relacionados do objeto aberto.
 */

export interface ContextGroup {
  label: string;
  items: string[];
}

export function WorkspaceContextBar({
  groups,
  className,
}: {
  groups: ContextGroup[];
  className?: string;
}) {
  return (
    <div className={cn("flex w-full flex-wrap items-start gap-x-8 gap-y-3", className)}>
      {groups.map((group) => (
        <div key={group.label} className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground/80">
            {group.label}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {group.items.length === 0 ? (
              <span className="text-xs text-muted-foreground">—</span>
            ) : (
              group.items.map((item) => (
                <span
                  key={item}
                  className="rounded-md border bg-card px-2 py-0.5 text-[11px] text-foreground/80 transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  {item}
                </span>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
