import { Link } from "@tanstack/react-router";
import { ArrowUpRight, ListChecks } from "lucide-react";
import { EmptyState } from "@/components/layout/page";
import { Pill } from "@/components/ui/pill";
import { TaskStateBadge } from "@/components/runtime/runtime-badges";
import { ExecutionKindBadge } from "@/components/runtime/execution-badges";
import { OverdueFlag, SlaCountdown } from "@/components/runtime/sla-badges";
import { INBOX_EMPTY_HINT, INBOX_PRIORITY_TONE } from "@/config/inbox-model";
import type { InboxItem } from "@/lib/inbox";

/** Build 015 — lista operacional priorizada. Abre a tarefa no Runtime Workspace. */
export function InboxList({ items }: { items: InboxItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<ListChecks className="h-5 w-5" />}
        title="Nenhum item nesta visão"
        description={INBOX_EMPTY_HINT}
      />
    );
  }

  return (
    <div className="divide-y rounded-xl border bg-card">
      {items.map((item) => (
        <Link
          key={item.id}
          to="/execucao/$instanceId"
          params={{ instanceId: item.instance.id }}
          search={{ task: item.task.id }}
          className="group flex flex-col gap-2 px-4 py-3.5 transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:gap-4"
        >
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2">
              <Pill tone={INBOX_PRIORITY_TONE[item.priority]} shape="full">
                {item.priority}
              </Pill>
              <span className="truncate text-sm font-medium">{item.task.name}</span>
              <ExecutionKindBadge kind={item.kind} />
              {item.overdue && <OverdueFlag />}
            </span>
            <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
              <span className="truncate">{item.instance.processName}</span>
              <span aria-hidden>·</span>
              <span className="truncate">{item.instance.name}</span>
              <span aria-hidden>·</span>
              <span className="truncate">{item.task.owner || "Sem responsável"}</span>
              <span aria-hidden>·</span>
              <span>{item.reason}</span>
            </span>
          </span>

          <span className="flex shrink-0 items-center gap-3">
            <SlaCountdown sla={item.sla} dueAt={item.task.dueAt} />
            <TaskStateBadge state={item.task.state} />
            <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </span>
        </Link>
      ))}
    </div>
  );
}
