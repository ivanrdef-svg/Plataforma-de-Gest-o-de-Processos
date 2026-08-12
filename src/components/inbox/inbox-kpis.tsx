import { AlertTriangle, CheckCircle2, Clock, ListChecks, ShieldCheck } from "lucide-react";
import type { InboxStats } from "@/lib/inbox";

/** Build 015 — indicadores rápidos da Inbox. */
export function InboxKpis({ stats }: { stats: InboxStats }) {
  const cards = [
    { label: "Tarefas abertas", value: stats.abertas, icon: ListChecks, tone: "text-foreground" },
    {
      label: "Aprovações pendentes",
      value: stats.aprovacoes,
      icon: ShieldCheck,
      tone: "text-primary",
    },
    {
      label: "Próximas do vencimento",
      value: stats.risco,
      icon: Clock,
      tone: "text-amber-700 dark:text-amber-400",
    },
    {
      label: "Atrasadas",
      value: stats.atrasadas,
      icon: AlertTriangle,
      tone: "text-destructive",
    },
    {
      label: "Concluídas",
      value: stats.concluidas,
      icon: CheckCircle2,
      tone: "text-emerald-700 dark:text-emerald-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.label} className="rounded-xl border bg-card px-4 py-3">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Icon className="h-3.5 w-3.5" />
              <span className="truncate">{card.label}</span>
            </div>
            <p className={`mt-1.5 text-2xl font-semibold tabular-nums ${card.tone}`}>
              {card.value}
            </p>
          </div>
        );
      })}
    </div>
  );
}
