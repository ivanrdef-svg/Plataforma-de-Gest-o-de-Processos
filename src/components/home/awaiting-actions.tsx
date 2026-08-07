import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Inbox } from "lucide-react";
import { LifecycleBadge } from "@/components/lifecycle/lifecycle-badge";
import { AWAITING_STATES } from "@/config/lifecycle-model";
import {
  getLifecycle,
  useLifecycleEntries,
  type LifecycleObjectKind,
  type LifecycleSeed,
} from "@/lib/lifecycle-store";
import { useKnowledgeDocs } from "@/lib/knowledge-store";
import { usePopDocs } from "@/lib/pop-store";
import { useProcessDocs } from "@/lib/process-store";

/**
 * Build 009 — widget "Objetos aguardando ação".
 *
 * Lê o mesmo Lifecycle Engine usado pelos Workspaces: qualquer objeto em
 * revisão, aguardando aprovação ou aprovado (pronto para publicar) aparece
 * aqui automaticamente.
 */

interface AwaitingItem extends LifecycleSeed {
  kind: LifecycleObjectKind;
}

export function AwaitingActions() {
  // Assina o store para atualizar sempre que um estado mudar.
  useLifecycleEntries();
  const knowledge = useKnowledgeDocs();
  const pops = usePopDocs();
  const processes = useProcessDocs();

  const items = useMemo(() => {
    const seeds: AwaitingItem[] = [
      ...knowledge.map((doc) => ({
        objectId: doc.id,
        kind: "knowledge" as const,
        name: doc.name,
        owner: doc.owner,
        status: doc.status,
        updatedAt: doc.updatedAt,
      })),
      ...pops.map((doc) => ({
        objectId: doc.id,
        kind: "pop" as const,
        name: doc.name,
        owner: doc.owner,
        status: doc.status,
        updatedAt: doc.savedAt || doc.revisedAt,
      })),
      ...processes.map((doc) => ({
        objectId: doc.id,
        kind: "processo" as const,
        name: doc.name,
        owner: doc.owner,
        status: doc.status,
        updatedAt: doc.savedAt || doc.revisedAt,
      })),
    ];

    return seeds
      .map((seed) => ({ seed, entry: getLifecycle(seed) }))
      .filter(({ entry }) => AWAITING_STATES.includes(entry.state))
      .sort((a, b) => b.entry.updatedAt.localeCompare(a.entry.updatedAt))
      .slice(0, 5);
  }, [knowledge, pops, processes]);

  return (
    <section className="rounded-xl border bg-card">
      <header className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Inbox className="h-3.5 w-3.5 text-muted-foreground" />
          <h2 className="text-sm font-medium">Objetos aguardando ação</h2>
        </div>
        <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          {items.length}
        </span>
      </header>

      {items.length === 0 ? (
        <p className="px-4 py-6 text-xs text-muted-foreground">
          Nada pendente. Todos os ativos estão em elaboração ou publicados.
        </p>
      ) : (
        <ul className="divide-y">
          {items.map(({ seed, entry }) => {
            const label =
              seed.kind === "knowledge"
                ? "Knowledge Package"
                : seed.kind === "pop"
                  ? "POP"
                  : "Processo";
            const content = (
              <div className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{entry.name}</p>
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                    {label} · {entry.owner}
                  </p>
                </div>
                <LifecycleBadge state={entry.state} size="sm" />
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
            );

            if (seed.kind === "knowledge") {
              return (
                <li key={seed.objectId}>
                  <Link to="/knowledge/$packageId" params={{ packageId: seed.objectId }}>
                    {content}
                  </Link>
                </li>
              );
            }
            if (seed.kind === "pop") {
              return (
                <li key={seed.objectId}>
                  <Link to="/pop/$popId" params={{ popId: seed.objectId }}>
                    {content}
                  </Link>
                </li>
              );
            }
            return (
              <li key={seed.objectId}>
                <Link to="/processos/$processId" params={{ processId: seed.objectId }}>
                  {content}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
