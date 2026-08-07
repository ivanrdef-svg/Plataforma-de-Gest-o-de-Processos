import { ArrowRight, Sparkles } from "lucide-react";
import { ObjectTypeIcon } from "@/components/relationships/relationship-badges";
import { PROCESS_DEMO_ORIGIN } from "@/config/process-structure";

/**
 * Build 006 — Origem do Processo.
 *
 * Torna visível o princípio do produto: o processo nasce do conhecimento.
 * Dados simulados nesta build; consome os mesmos ícones e tons do
 * Enterprise Relationship Engine (Build 005).
 */
export function ProcessOrigin({ processName }: { processName: string }) {
  return (
    <section className="space-y-4">
      <div className="flex items-start gap-2.5 rounded-xl border border-dashed bg-muted/30 px-4 py-3">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">{processName}</span> nasce do
          conhecimento já registrado na plataforma. Cada item abaixo alimentou a
          estrutura, o escopo e as etapas deste processo.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {PROCESS_DEMO_ORIGIN.map((group) => (
          <div key={group.group} className="rounded-xl border bg-card p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {group.group}
            </p>
            <div className="mt-3 space-y-2">
              {group.items.map((item) => (
                <div
                  key={item.name}
                  className="group flex items-center gap-2.5 rounded-lg border bg-background px-2.5 py-2 transition-colors hover:border-border-strong"
                >
                  <ObjectTypeIcon type={group.type} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium">
                      {item.name}
                    </span>
                    <span className="block truncate text-[10px] text-muted-foreground">
                      {item.detail}
                    </span>
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
