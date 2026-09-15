import { createFileRoute, Link } from "@tanstack/react-router";
import { Star } from "lucide-react";
import { EmptyState, PageContainer, SectionHeader } from "@/components/layout/page";
import { getAuthoringProcessVersion, useProcessDocs } from "@/lib/process-store";

export const Route = createFileRoute("/favoritos")({
  component: FavoritesPage,
  head: () => ({
    meta: [
      { title: "Favoritos — Process Platform" },
      {
        name: "description",
        content: "Objetos marcados como favoritos para acesso rápido na plataforma.",
      },
      { property: "og:title", content: "Favoritos — Process Platform" },
      {
        property: "og:description",
        content: "Objetos marcados como favoritos para acesso rápido na plataforma.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function FavoritesPage() {
  const favorites = useProcessDocs().filter((process) => process.favorite);

  return (
    <PageContainer>
      <SectionHeader
        title="Favoritos"
        description="Acesso rápido aos objetos que você acompanha."
      />
      {favorites.length === 0 ? (
        <EmptyState
          icon={<Star className="h-5 w-5" />}
          title="Nenhum favorito ainda"
          description="Processos marcados como favoritos aparecerão aqui."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
        {favorites.map((process) => {
          const definition = getAuthoringProcessVersion(process)?.definition;
          if (!definition) return null;
          return (
          <Link
            key={process.id}
            to="/processos/$processId"
            params={{ processId: process.id }}
            className="flex items-center gap-3 rounded-xl border bg-card p-4 transition-shadow hover:shadow-soft"
          >
            <Star className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{definition.name}</p>
              <p className="text-[11px] text-muted-foreground">Processo</p>
            </div>
          </Link>
          );
        })}
        </div>
      )}
    </PageContainer>
  );
}
