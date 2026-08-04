import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Metadados do objeto aberto no Workspace (tipo, versão, status,
 * responsável, última atualização). Componente reutilizável — usado no
 * header de qualquer workspace.
 */

export interface WorkspaceMetaItem {
  label: string;
  value: ReactNode;
}

export function WorkspaceStatusPill({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const tone =
    status === "publicado"
      ? "bg-primary/10 text-primary"
      : status === "em revisão"
        ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
        : "bg-muted text-muted-foreground";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize",
        tone,
        className,
      )}
    >
      {status}
    </span>
  );
}

export function WorkspaceMeta({ items }: { items: WorkspaceMetaItem[] }) {
  return (
    <dl className="flex flex-wrap items-center gap-x-6 gap-y-2">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {item.label}
          </dt>
          <dd className="text-xs font-medium text-foreground">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
