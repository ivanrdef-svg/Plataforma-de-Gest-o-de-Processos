import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowUpRight, Plus, Search, Star, Workflow } from "lucide-react";
import { toast } from "sonner";
import { WorkspaceLayout } from "@/components/workspace/workspace-layout";
import { WorkspaceAiPanel } from "@/components/workspace/workspace-ai-panel";
import { WorkspaceStatusBar } from "@/components/workspace/workspace-status-bar";
import { LifecycleBadge, LifecycleTrack } from "@/components/lifecycle/lifecycle-badge";
import { useLifecycleState } from "@/lib/lifecycle-store";
import { CardQuickActions } from "@/components/workspace/card-quick-actions";
import { RelationshipIndicators } from "@/components/relationships/relationship-badges";
import { useRelationshipStats } from "@/lib/relationship-store";
import { EmptyState } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import { readinessScore } from "@/components/process/process-consistency-panel";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { DEMO_ENVIRONMENT } from "@/config/workspace-demo";
import { PROCESS_CENTER_STATS } from "@/config/process-structure";
import {
  createProcessDoc,
  PROCESS_CATEGORIES,
  PROCESS_STATUS_OPTIONS,
  useProcessDocs,
  type ProcessDoc,
} from "@/lib/process-store";

export const Route = createFileRoute("/processos/")({
  component: ProcessCenter,
  head: () => ({
    meta: [
      { title: "Process Center — Process Platform" },
      {
        name: "description",
        content:
          "Ambiente de engenharia de processos: pesquise, filtre e modele processos estruturados a partir do conhecimento existente.",
      },
      { property: "og:title", content: "Process Center — Process Platform" },
      {
        property: "og:description",
        content:
          "Ambiente de engenharia de processos: pesquise, filtre e modele processos estruturados.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function ProcessCard({ doc }: { doc: ProcessDoc }) {
  const stats = useRelationshipStats(doc.id);
  const state = useLifecycleState({
    objectId: doc.id,
    kind: "processo",
    name: doc.name,
    owner: doc.owner,
    status: doc.status,
    updatedAt: doc.savedAt || doc.revisedAt,
  });
  return (
    <Link
      to="/processos/$processId"
      params={{ processId: doc.id }}
      className="group rounded-xl border bg-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-float"
    >
      <div className="flex items-center gap-2">
        <span className="font-mono text-[11px] text-muted-foreground">{doc.code}</span>
        <LifecycleBadge state={state} size="sm" className="ml-auto" />
        <CardQuickActions name={doc.name} className="-mr-1" />
      </div>
      <div className="mt-1.5 flex items-center gap-1.5">
        <Workflow className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="truncate text-sm font-medium">{doc.name}</span>
        {doc.favorite && (
          <Star className="h-3.5 w-3.5 shrink-0 fill-current text-primary" />
        )}
      </div>
      <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
        {doc.description}
      </p>
      <LifecycleTrack state={state} className="mt-3" />
      <RelationshipIndicators stats={stats} compact className="mt-3" />
      <p className="mt-2 text-[11px] text-muted-foreground/80">
        {doc.category} · {doc.steps.length} etapas · {doc.version} · {doc.owner}
      </p>
    </Link>
  );
}

function ProcessGrid({ docs }: { docs: ProcessDoc[] }) {
  if (docs.length === 0) {
    return (
      <EmptyState
        icon={<Workflow className="h-5 w-5" />}
        title="Nenhum processo aqui ainda"
        description="Crie um novo processo ou ajuste a pesquisa e os filtros."
      />
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {docs.map((doc) => (
        <ProcessCard key={doc.id} doc={doc} />
      ))}
    </div>
  );
}

function ProcessCenter() {
  const docs = useProcessDocs();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);

  const create = () => {
    const doc = createProcessDoc();
    toast.success("Novo processo criado", {
      description: "Estrutura base gerada a partir do conhecimento existente.",
    });
    void navigate({ to: "/processos/$processId", params: { processId: doc.id } });
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return docs.filter((d) => {
      if (status && d.status !== status) return false;
      if (category && d.category !== category) return false;
      if (!q) return true;
      return [d.name, d.code, d.description, d.category, d.owner, ...d.tags]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [docs, query, status, category]);

  const kpis: Record<string, number> = {
    total: docs.length,
    desenvolvimento: docs.filter((d) => d.status === "em desenvolvimento").length,
    publicados: docs.filter((d) => d.status === "publicado").length,
    etapas: docs.reduce((sum, d) => sum + d.steps.length, 0),
    revisao: docs.filter((d) => d.status === "em revisão").length,
    modelagem: docs.filter(
      (d) => d.steps.length > 0 && readinessScore(d).blocking > 0,
    ).length,
    prontos: docs.filter(
      (d) => d.steps.length >= 3 && readinessScore(d).blocking === 0,
    ).length,
  };

  const recent = docs.slice(0, 6);
  const favorites = docs.filter((d) => d.favorite);
  const developing = docs.filter(
    (d) => d.status === "em desenvolvimento" || d.status === "rascunho",
  );

  const toolbar = (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7">
        {PROCESS_CENTER_STATS.map((stat) => (
          <div
            key={stat.id}
            className="rounded-xl border bg-card px-4 py-3 transition-shadow duration-200 hover:shadow-soft"
          >
            <p className="text-[11px] text-muted-foreground">{stat.label}</p>
            <p className="mt-1 text-xl font-semibold tracking-tight">
              {kpis[stat.id] ?? 0}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar processos, códigos, áreas e responsáveis"
            className="h-9 pl-9 text-sm"
          />
        </div>
        <Button className="gap-1.5" onClick={create}>
          <Plus className="h-4 w-4" />
          Novo Processo
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {[
          { label: "Todos", active: !status && !category, clear: true },
          ...PROCESS_STATUS_OPTIONS.map((s) => ({
            label: s,
            active: status === s,
            onClick: () => setStatus(status === s ? null : s),
          })),
        ].map((chip, i) => (
          <button
            key={`${chip.label}-${i}`}
            type="button"
            onClick={() =>
              "clear" in chip && chip.clear
                ? (setStatus(null), setCategory(null))
                : (chip as { onClick: () => void }).onClick()
            }
            className={cn(
              "rounded-full border px-2.5 py-1 text-[11px] capitalize transition-colors",
              chip.active
                ? "border-primary/40 bg-primary/10 text-primary"
                : "text-muted-foreground hover:border-border-strong hover:text-foreground",
            )}
          >
            {chip.label}
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-border" />
        {PROCESS_CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(category === c ? null : c)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-[11px] transition-colors",
              category === c
                ? "border-primary/40 bg-primary/10 text-primary"
                : "text-muted-foreground hover:border-border-strong hover:text-foreground",
            )}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <WorkspaceLayout
      title="Process Center"
      subtitle="O processo nasce do conhecimento. Aqui ele é modelado, estruturado e preparado para o BPM."
      contextBar={
        <span className="inline-flex items-center gap-1.5">
          <Workflow className="h-3.5 w-3.5" />
          Engenharia de processos · {docs.length} processos · {kpis['etapas']} etapas
          mapeadas
        </span>
      }
      actions={
        <Button size="sm" className="gap-1.5" onClick={create}>
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Novo Processo</span>
        </Button>
      }
      tabs={[
        {
          id: "todos",
          label: "Todos os processos",
          content: (
            <div className="space-y-6">
              {toolbar}
              <ProcessGrid docs={filtered} />
            </div>
          ),
        },
        {
          id: "recentes",
          label: "Recentes",
          content: <ProcessGrid docs={recent} />,
        },
        {
          id: "favoritos",
          label: "Favoritos",
          content: <ProcessGrid docs={favorites} />,
        },
        {
          id: "desenvolvimento",
          label: "Em desenvolvimento",
          content: <ProcessGrid docs={developing} />,
        },
      ]}
      defaultTab="todos"
      sidePanel={
        <div className="space-y-6">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Como o processo nasce
            </p>
            <ol className="mt-3 space-y-2.5">
              {[
                "Conhecimento registrado (Manuais, Normas, FAQs)",
                "POPs estruturados descrevem a execução",
                "O processo organiza escopo, entradas, saídas e etapas",
                "A modelagem BPM representa graficamente",
              ].map((step, i) => (
                <li key={step} className="flex gap-2.5 text-xs text-muted-foreground">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] tabular-nums">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
            <Link
              to="/knowledge"
              className="mt-4 inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Explorar conhecimento <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <WorkspaceAiPanel />
        </div>
      }
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
