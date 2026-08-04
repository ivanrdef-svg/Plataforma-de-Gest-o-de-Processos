import { createFileRoute } from "@tanstack/react-router";
import { Star } from "lucide-react";
import { PageContainer, SectionHeader } from "@/components/layout/page";
import { DEMO_FAVORITES } from "@/config/workspace-demo";

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
  return (
    <PageContainer>
      <SectionHeader
        title="Favoritos"
        description="Acesso rápido aos objetos que você acompanha."
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {DEMO_FAVORITES.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 rounded-xl border bg-card p-4 transition-shadow hover:shadow-soft"
          >
            <Star className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{item.title}</p>
              <p className="text-[11px] text-muted-foreground">{item.type}</p>
            </div>
          </div>
        ))}
      </div>
    </PageContainer>
  );
}
