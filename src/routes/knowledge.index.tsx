import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, BookOpen, FileText, Link2, Plus, Search } from "lucide-react";
import { WorkspaceLayout } from "@/components/workspace/workspace-layout";
import { WorkspaceAiPanel } from "@/components/workspace/workspace-ai-panel";
import { WorkspaceStatusBar } from "@/components/workspace/workspace-status-bar";
import { WorkspaceStatusPill } from "@/components/workspace/workspace-meta";
import { EmptyState } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { DEMO_ENVIRONMENT } from "@/config/workspace-demo";
import {
  KNOWLEDGE_CATEGORIES,
  KNOWLEDGE_PACKAGES,
  KNOWLEDGE_QUICK_FILTERS,
  type KnowledgeCategory,
  type KnowledgeQuickFilter,
  type KnowledgePackage,
} from "@/config/knowledge-demo";

export const Route = createFileRoute("/knowledge/")({
  component: KnowledgeCenterPage,
  head: () => ({
    meta: [
      { title: "Knowledge Center — Process Platform" },
      {
        name: "description",
        content:
          "Ponto de entrada do conhecimento institucional: pacotes de conhecimento por categoria, responsável, status e versão.",
      },
      { property: "og:title", content: "Knowledge Center — Process Platform" },
      {
        property: "og:description",
        content:
          "Ponto de entrada do conhecimento institucional: pacotes de conhecimento por categoria, responsável, status e versão.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function KnowledgeCard({ pkg }: { pkg: KnowledgePackage }) {
  return (
    <Link
      to="/knowledge/$packageId"
      params={{ packageId: pkg.id }}
      className="group flex flex-col rounded-xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-border-strong hover:shadow-float"
    >
      <div className="flex items-start gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <BookOpen className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-medium">{pkg.name}</span>
            <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
          <span className="mt-0.5 inline-block rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {pkg.category}
          </span>
        </div>
        <WorkspaceStatusPill status={pkg.status} />
      </div>

      <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
        {pkg.description}
      </p>

      <div className="mt-4 flex items-center gap-3 text-[11px] text-muted-foreground/80">
        <span className="inline-flex items-center gap-1">
          <FileText className="h-3 w-3" />
          {pkg.articles} artigos
        </span>
        <span className="inline-flex items-center gap-1">
          <Link2 className="h-3 w-3" />
          {pkg.linkedObjects} objetos
        </span>
      </div>

      <div className="mt-3 border-t pt-3 text-[11px] text-muted-foreground/80">
        {pkg.version} · {pkg.owner} · {pkg.updatedAt}
      </div>
    </Link>
  );
}

function KnowledgeExplorer() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<KnowledgeQuickFilter>("todos");
  const [category, setCategory] = useState<KnowledgeCategory | null>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return KNOWLEDGE_PACKAGES.filter((p) => {
      if (filter !== "todos" && p.status !== filter) return false;
      if (category && p.category !== category) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.owner.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    });
  }, [query, filter, category]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar Knowledge Packages"
            className="h-10 pl-9"
            aria-label="Pesquisar Knowledge Packages"
          />
        </div>
        <Button className="h-10 gap-1.5">
          <Plus className="h-4 w-4" />
          Novo Knowledge Package
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {KNOWLEDGE_QUICK_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition-colors",
              filter === f.id
                ? "border-transparent bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {f.label}
          </button>
        ))}
        <span className="mx-1 hidden h-4 w-px bg-border sm:inline-block" />
        {KNOWLEDGE_CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(category === c ? null : c)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition-colors",
              category === c
                ? "border-transparent bg-foreground text-background"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {c}
          </button>
        ))}
      </div>

      {results.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {results.map((pkg) => (
            <KnowledgeCard key={pkg.id} pkg={pkg} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<BookOpen className="h-5 w-5" />}
          title="Nenhum Knowledge Package encontrado"
          description="Ajuste a pesquisa ou os filtros rápidos para ver outros pacotes de conhecimento."
        />
      )}
    </div>
  );
}

function KnowledgeCenterPage() {
  return (
    <WorkspaceLayout
      title="Knowledge Center"
      subtitle="Ponto de entrada de todo o conhecimento institucional da organização."
      contextBar={
        <span>
          {KNOWLEDGE_PACKAGES.length} Knowledge Packages ·{" "}
          {KNOWLEDGE_CATEGORIES.length} categorias
        </span>
      }
      tabs={[
        { id: "pacotes", label: "Knowledge Packages", content: <KnowledgeExplorer /> },
        {
          id: "categorias",
          label: "Categorias",
          content: (
            <EmptyState
              icon={<BookOpen className="h-5 w-5" />}
              title="Curadoria por categoria"
              description="A organização do conhecimento por taxonomia chega em uma próxima build."
            />
          ),
        },
      ]}
      sidePanel={<WorkspaceAiPanel />}
      statusBar={
        <WorkspaceStatusBar
          status={DEMO_ENVIRONMENT.status}
          lastSync={DEMO_ENVIRONMENT.lastSync}
          version={DEMO_ENVIRONMENT.version}
          environment={DEMO_ENVIRONMENT.environment}
        />
      }
    />
  );
}
