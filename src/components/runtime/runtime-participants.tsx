import { Pill } from "@/components/ui/pill";
import { type WorkflowInstance } from "@/lib/runtime-store";
import { useWorkflowDoc } from "@/lib/workflow-store";

/** Build 012 — participantes da execução, herdados da definição de workflow. */
export function RuntimeParticipants({ instance }: { instance: WorkflowInstance }) {
  const workflow = useWorkflowDoc(instance.workflowId);
  const participants = workflow?.participants ?? [];

  const load = (name: string) =>
    instance.tasks.filter((t) => t.owner.trim() === name.trim());

  return (
    <div className="space-y-3">
      {participants.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Nenhum participante definido no workflow de origem.
        </p>
      )}
      {participants.map((p) => {
        const tasks = load(p.name);
        const done = tasks.filter((t) => t.state === "concluída").length;
        return (
          <article key={p.id} className="rounded-xl border bg-card p-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium">{p.name}</p>
              <Pill tone="bg-muted text-muted-foreground" size="sm">
                {p.role}
              </Pill>
              <Pill tone="bg-muted text-muted-foreground" size="sm">
                {p.area}
              </Pill>
              <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">
                {done}/{tasks.length} tarefas concluídas
              </span>
            </div>
            {tasks.length > 0 && (
              <ul className="mt-2 space-y-1">
                {tasks.map((t) => (
                  <li key={t.id} className="text-[11px] text-muted-foreground">
                    {t.name} — {t.state}
                  </li>
                ))}
              </ul>
            )}
          </article>
        );
      })}
    </div>
  );
}
