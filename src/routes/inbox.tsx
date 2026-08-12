import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Inbox as InboxIcon } from "lucide-react";
import { PageContainer, SectionHeader } from "@/components/layout/page";
import { Input } from "@/components/ui/input";
import { InboxKpis } from "@/components/inbox/inbox-kpis";
import { InboxList } from "@/components/inbox/inbox-list";
import { INBOX_FILTERS, type InboxFilterId } from "@/config/inbox-model";
import { matchesInboxFilter, matchesInboxQuery, useInbox } from "@/lib/inbox";
import { useNotificationSync } from "@/lib/notification-store";
import { useSlaMonitor } from "@/lib/runtime-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/inbox")({
  component: InboxCenter,
  head: () => ({
    meta: [
      { title: "Inbox — Tarefas, aprovações e prazos" },
      {
        name: "description",
        content:
          "Caixa de entrada operacional: tarefas, aprovações, decisões e prazos de todas as execuções em um só lugar.",
      },
      { property: "og:title", content: "Inbox — Tarefas, aprovações e prazos" },
      {
        property: "og:description",
        content:
          "Visão consolidada e priorizada por SLA das tarefas de todas as execuções.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function InboxCenter() {
  useSlaMonitor();
  useNotificationSync();
  const { items, stats } = useInbox();
  const [filter, setFilter] = useState<InboxFilterId>("todas");
  const [query, setQuery] = useState("");

  const visible = items.filter(
    (item) => matchesInboxFilter(item, filter) && matchesInboxQuery(item, query),
  );

  return (
    <PageContainer>
      <header className="mb-8">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
          <InboxIcon className="h-3.5 w-3.5" />
          Execução
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Inbox</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
          Tudo que aguarda você: tarefas, aprovações, decisões e prazos das execuções
          em andamento, priorizados pelo SLA.
        </p>
      </header>

      <InboxKpis stats={stats} />

      <div className="mt-8">
        <SectionHeader
          title="Fila operacional"
          description="Itens ordenados por prioridade e proximidade do prazo."
        />

        <div className="mb-4 flex flex-wrap items-center gap-2">
          {INBOX_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs transition-colors",
                filter === f.id
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {f.label}
            </button>
          ))}
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por tarefa, processo ou responsável…"
            className="ml-auto h-8 w-full max-w-xs text-xs"
          />
        </div>

        <InboxList items={visible} />
      </div>
    </PageContainer>
  );
}
