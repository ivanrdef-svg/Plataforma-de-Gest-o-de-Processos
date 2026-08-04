import { createFileRoute } from "@tanstack/react-router";
import { Building2, KeyRound, Settings2, Users } from "lucide-react";
import { PageContainer, SectionHeader } from "@/components/layout/page";

export const Route = createFileRoute("/administracao")({
  component: AdminPage,
  head: () => ({
    meta: [
      { title: "Administração — Process Platform" },
      {
        name: "description",
        content:
          "Configurações da organização, pessoas, permissões e preferências da plataforma.",
      },
      { property: "og:title", content: "Administração — Process Platform" },
      {
        property: "og:description",
        content:
          "Configurações da organização, pessoas, permissões e preferências da plataforma.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const AREAS = [
  { icon: Building2, title: "Organização", description: "Estrutura, áreas e unidades." },
  { icon: Users, title: "Pessoas", description: "Usuários, times e responsabilidades." },
  { icon: KeyRound, title: "Permissões", description: "Papéis e níveis de acesso." },
  { icon: Settings2, title: "Preferências", description: "Padrões e configurações gerais." },
];

function AdminPage() {
  return (
    <PageContainer>
      <SectionHeader
        title="Administração"
        description="Áreas de configuração preparadas para as próximas sprints."
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {AREAS.map((area) => (
          <div
            key={area.title}
            className="rounded-xl border bg-card p-4 transition-shadow hover:shadow-soft"
          >
            <div className="flex items-center gap-2.5">
              <area.icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{area.title}</span>
              <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                em breve
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {area.description}
            </p>
          </div>
        ))}
      </div>
    </PageContainer>
  );
}
