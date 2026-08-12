import { formatDateTime, type WorkflowInstance } from "@/lib/runtime-store";

/** Build 012 — timeline real de eventos da execução. */
export function RuntimeHistory({ instance }: { instance: WorkflowInstance }) {
  return (
    <ol className="relative space-y-6 border-l pl-6">
      {[...instance.events].reverse().map((event) => (
        <li key={event.id} className="relative">
          <span className="absolute -left-[27px] top-1.5 h-2 w-2 rounded-full bg-primary/60 ring-4 ring-background" />
          <p className="text-[11px] text-muted-foreground">{formatDateTime(event.at)}</p>
          <p className="mt-0.5 text-sm font-medium">{event.title}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {event.detail}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground/80">por {event.user}</p>
        </li>
      ))}
    </ol>
  );
}
