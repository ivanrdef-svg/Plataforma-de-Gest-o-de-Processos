import { ArrowUpRight } from "lucide-react";
import { POP_DEMO_RELATIONS, POP_DEMO_HISTORY } from "@/config/pop-structure";

/**
 * Build 004 — abas Relacionamentos e Histórico do POP (dados simulados).
 */

export function PopRelations() {
  return (
    <div className="grid max-w-4xl gap-4 sm:grid-cols-2">
      {POP_DEMO_RELATIONS.map((group) => (
        <div key={group.group} className="rounded-xl border bg-card p-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {group.group}
          </p>
          <ul className="mt-3 space-y-2">
            {group.items.map((item) => (
              <li
                key={item.name}
                className="group flex items-start justify-between gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/60"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-foreground/90">{item.name}</p>
                  <p className="text-[11px] text-muted-foreground">{item.detail}</p>
                </div>
                <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function PopHistory() {
  return (
    <ol className="relative max-w-2xl space-y-6 border-l pl-6">
      {POP_DEMO_HISTORY.map((entry) => (
        <li key={entry.title} className="relative">
          <span className="absolute -left-[1.9rem] top-1.5 h-2 w-2 rounded-full bg-primary" />
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {entry.date}
          </p>
          <p className="mt-0.5 text-sm font-medium">{entry.title}</p>
          <p className="text-xs text-muted-foreground">
            {entry.detail} · {entry.author}
          </p>
        </li>
      ))}
    </ol>
  );
}
