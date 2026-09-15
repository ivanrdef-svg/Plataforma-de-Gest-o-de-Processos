import type { KnowledgeDoc } from "@/lib/knowledge-store";

/**
 * Indicadores calculados exclusivamente a partir dos documentos persistidos.
 */
export function KnowledgeStats({ docs }: { docs: KnowledgeDoc[] }) {
  const stats = [
    { id: "packages", label: "Knowledge Packages", value: docs.length },
    {
      id: "rascunhos",
      label: "Rascunhos",
      value: docs.filter((doc) => doc.status === "rascunho").length,
    },
    {
      id: "revisao",
      label: "Em revisão",
      value: docs.filter((doc) => doc.status === "em revisão").length,
    },
    {
      id: "publicados",
      label: "Publicados",
      value: docs.filter((doc) => doc.status === "publicado").length,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.id}
          className="rounded-xl border bg-card px-4 py-3 transition-shadow duration-200 hover:shadow-soft"
        >
          <p className="text-[11px] text-muted-foreground">{stat.label}</p>
          <p className="mt-1 text-xl font-semibold tracking-tight">
            {stat.value}
          </p>
        </div>
      ))}
    </div>
  );
}
