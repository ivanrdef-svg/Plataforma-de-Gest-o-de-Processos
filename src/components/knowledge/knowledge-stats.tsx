import { KNOWLEDGE_STATS } from "@/config/knowledge-demo";

/**
 * Build 2.5 — faixa de indicadores rápidos do Knowledge Center.
 * Build 003 — aceita valores dinâmicos opcionais (contagens ao vivo).
 */
export function KnowledgeStats({
  overrides,
}: {
  overrides?: Partial<Record<string, number>>;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
      {KNOWLEDGE_STATS.map((stat) => (

        <div
          key={stat.id}
          className="rounded-xl border bg-card px-4 py-3 transition-shadow duration-200 hover:shadow-soft"
        >
          <p className="text-[11px] text-muted-foreground">{stat.label}</p>
          <p className="mt-1 text-xl font-semibold tracking-tight">
            {overrides?.[stat.id] ?? stat.value}
          </p>

        </div>
      ))}
    </div>
  );
}
