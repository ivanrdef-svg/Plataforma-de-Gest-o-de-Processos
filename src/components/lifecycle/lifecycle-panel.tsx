import { useState } from "react";
import { History, User2, Clock, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { LifecycleBadge, LifecycleTrack } from "@/components/lifecycle/lifecycle-badge";
import { LifecycleTimeline } from "@/components/lifecycle/lifecycle-timeline";
import { stateStyle } from "@/config/lifecycle-model";
import {
  applyLifecycleAction,
  availableActions,
  nextState,
  useLifecycle,
  type LifecycleSeed,
} from "@/lib/lifecycle-store";
import { cn } from "@/lib/utils";

/**
 * Build 009 — Painel de Lifecycle do Workspace.
 *
 * Estado atual, próximo estado, responsável, última alteração, ações
 * contextuais e histórico. Comportamento simulado nesta Build; a mesma
 * infraestrutura servirá Workflow, Analytics, Governança e IA.
 */

function relativeTime(iso: string) {
  const date = new Date(iso).getTime();
  if (Number.isNaN(date)) return iso;
  const diff = Date.now() - date;
  const day = 86_400_000;
  if (diff < 3_600_000) return "há poucos minutos";
  if (diff < day) return `há ${Math.round(diff / 3_600_000)} h`;
  const days = Math.round(diff / day);
  if (days < 30) return `há ${days} dia${days === 1 ? "" : "s"}`;
  const months = Math.round(days / 30);
  return `há ${months} ${months === 1 ? "mês" : "meses"}`;
}

export function LifecyclePanel({
  seed,
  className,
  showTimeline = true,
}: {
  seed: LifecycleSeed;
  className?: string;
  showTimeline?: boolean;
}) {
  const entry = useLifecycle(seed);
  const [note, setNote] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);
  const actions = availableActions(entry.state);
  const next = nextState(entry.state);
  const style = stateStyle(entry.state);

  const run = (actionId: (typeof actions)[number]) => {
    const updated = applyLifecycleAction(seed, actionId, note);
    setNote("");
    setNoteOpen(false);
    toast.success(`${seed.name} · ${stateStyle(updated.state).label}`, {
      description: actionId.label,
    });
  };

  return (
    <section className={cn("space-y-4", className)}>
      <header className="flex items-center gap-2">
        <History className="h-3.5 w-3.5 text-muted-foreground" />
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Ciclo de vida
        </h3>
      </header>

      <div className="rounded-lg border bg-background p-3">
        <div className="flex items-center justify-between gap-2">
          <LifecycleBadge state={entry.state} />
          {next && (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <ArrowRight className="h-3 w-3" />
              {stateStyle(next).label}
            </span>
          )}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{style.description}</p>
        <LifecycleTrack state={entry.state} className="mt-3" showLabels />

        <Separator className="my-3" />

        <dl className="space-y-1.5 text-[11px]">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <User2 className="h-3 w-3" />
            <dt className="sr-only">Responsável</dt>
            <dd className="text-foreground">{entry.owner}</dd>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="h-3 w-3" />
            <dt className="sr-only">Última alteração</dt>
            <dd>Última alteração {relativeTime(entry.updatedAt)}</dd>
          </div>
        </dl>
      </div>

      <div className="space-y-2">
        {noteOpen && (
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Observação para o histórico (opcional)"
            className="min-h-[64px] text-xs"
          />
        )}
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.id}
                size="sm"
                variant={action.primary ? "default" : "outline"}
                className="h-8 text-xs"
                onClick={() => run(action)}
              >
                <Icon className="mr-1.5 h-3.5 w-3.5" />
                {action.label}
              </Button>
            );
          })}
        </div>
        <button
          type="button"
          className="text-[11px] text-muted-foreground transition-colors hover:text-foreground"
          onClick={() => setNoteOpen((open) => !open)}
        >
          {noteOpen ? "Ocultar observação" : "Adicionar observação"}
        </button>
      </div>

      {showTimeline && (
        <>
          <Separator />
          <div>
            <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Histórico
            </h4>
            <LifecycleTimeline events={entry.events.slice(-4)} compact />
          </div>
        </>
      )}
    </section>
  );
}

/** Aba completa de ciclo de vida (timeline integral + ações). */
export function LifecycleTab({ seed }: { seed: LifecycleSeed }) {
  const entry = useLifecycle(seed);
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0">
        <h3 className="mb-1 text-sm font-semibold">Timeline de evolução</h3>
        <p className="mb-5 text-xs text-muted-foreground">
          Cada movimentação do objeto: data, usuário, mudança de estado e observação.
        </p>
        <LifecycleTimeline events={entry.events} />
      </div>
      <LifecyclePanel seed={seed} showTimeline={false} />
    </div>
  );
}
