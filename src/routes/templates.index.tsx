import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, LayoutTemplate, Search } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/shell/app-shell";
import { EmptyState } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pill } from "@/components/ui/pill";
import {
  TEMPLATE_STATUS_LABEL,
  TEMPLATE_STATUS_TONE,
  TEMPLATE_USE_LABEL,
} from "@/config/template-model";
import { useWorkflowTemplates, type WorkflowTemplate } from "@/lib/template-store";
import { useWorkflowDocs } from "@/lib/workflow-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/templates/")({
  component: TemplateCenter,
  head: () => ({
    meta: [
      { title: "Template Center — Process Platform" },
      {
        name: "description",
        content:
          "Modelos reutilizáveis de workflow: ative, duplique e crie novas definições a partir de templates aprovados.",
      },
      { property: "og:title", content: "Template Center — Process Platform" },
      {
        property: "og:description",
        content:
          "Biblioteca de templates de workflow derivados de versões publicadas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const FILTERS = [
  { id: "todos", label: "Todos" },
  { id: "ativo", label: "Ativos" },
  { id: "rascunho", label: "Rascunhos" },
  { id: "arquivado", label: "Arquivados" },
] as const;

export function formatTemplateDate(iso: string | undefined) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function TemplateCenter() {
  const templates = useWorkflowTemplates();
  const workflows = useWorkflowDocs();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("todos");
  const [category, setCategory] = useState<string>("todas");

  const categories = useMemo(
    () =>
      Array.from(new Set(templates.map((t) => t.category).filter(Boolean))).sort(),
    [templates],
  );

  const stats = useMemo(
    () => ({
      total: templates.length,
      ativos: templates.filter((t) => t.status === "ativo").length,
      rascunhos: templates.filter((t) => t.status === "rascunho").length,
      arquivados: templates.filter((t) => t.status === "arquivado").length,
    }),
    [templates],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return templates.filter((t) => {
      if (filter !== "todos" && t.status !== filter) return false;
      if (category !== "todas" && t.category !== category) return false;
      if (!q) return true;
      return [t.name, t.description, t.category, ...t.tags]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [templates, query, filter, category]);

  /** Derivado dos próprios Workflows — nenhum contador paralelo em store. */
  const usageCount = (templateId: string) =>
    workflows.filter((w) => w.templateOrigin?.templateId === templateId).length;

  return (
    <AppShell>
      <div className="px-6 py-8 md:px-10">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Template Center</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Modelos reutilizáveis derivados de versões publicadas. Um template
              nunca executa: ele origina novos workflows independentes.
            </p>
          </div>
          <Button asChild variant="ghost" size="sm" className="h-9 gap-1.5">
            <Link to="/workflow">
              <ChevronLeft className="h-4 w-4" />
              Workflow Center
            </Link>
          </Button>
        </header>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Templates", value: stats.total },
            { label: "Ativos", value: stats.ativos },
            { label: "Rascunhos", value: stats.rascunhos },
            { label: "Arquivados", value: stats.arquivados },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border bg-card px-4 py-3">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {s.label}
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{s.value}</p>
            </div>
          ))}
        </section>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pesquisar templates, categorias, tags…"
              className="h-9 pl-9 text-sm"
              aria-label="Pesquisar templates"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                aria-pressed={filter === f.id}
                className={cn(
                  "rounded-md px-2.5 py-1.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  filter === f.id
                    ? "bg-muted font-medium text-foreground"
                    : "text-muted-foreground hover:bg-muted/60",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {categories.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {["todas", ...categories].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                aria-pressed={category === c}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  category === c
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-muted-foreground hover:bg-muted/60",
                )}
              >
                {c === "todas" ? "Todas as categorias" : c}
              </button>
            ))}
          </div>
        )}

        <section className="mt-6">
          {visible.length === 0 ? (
            <EmptyState
              icon={<LayoutTemplate className="h-5 w-5" />}
              title="Nenhum template por aqui"
              description="Publique um workflow e use a ação “Criar Template” no workspace dele para gerar o primeiro modelo reutilizável."
            />
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {visible.map((t) => (
                <TemplateCard key={t.id} template={t} usage={usageCount(t.id)} />
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function TemplateCard({
  template,
  usage,
}: {
  template: WorkflowTemplate;
  usage: number;
}) {
  const active = template.status === "ativo";

  return (
    <article className="group rounded-xl border bg-card p-4 transition-colors hover:border-primary/30">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            to="/templates/$templateId"
            params={{ templateId: template.id }}
            className="block truncate text-sm font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {template.name}
          </Link>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {template.category} · atualizado em {formatTemplateDate(template.updatedAt)}
          </p>
        </div>
        <Pill tone={TEMPLATE_STATUS_TONE[template.status]} size="sm" shape="full">
          {TEMPLATE_STATUS_LABEL[template.status]}
        </Pill>
      </div>

      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
        {template.description}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Pill tone="bg-muted text-muted-foreground" size="sm">
          {template.content.steps.length} etapas
        </Pill>
        <Pill tone="bg-muted text-muted-foreground" size="sm">
          {template.content.participants.length} participantes
        </Pill>
        {template.tags.map((tag) => (
          <Pill key={tag} tone="bg-primary/10 text-primary" size="sm" shape="full">
            {tag}
          </Pill>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-muted-foreground">
          {template.sourceWorkflowId
            ? `Origem: workflow ${template.sourceWorkflowId.slice(0, 8)} · versão V${template.sourceWorkflowVersion ?? "—"}`
            : "Origem não registrada"}
          {" · "}
          Usado para criar {usage} workflow{usage === 1 ? "" : "s"}
        </p>
        <Button
          asChild={active}
          size="sm"
          variant={active ? "default" : "outline"}
          className="h-8"
          disabled={!active}
        >
          {active ? (
            <Link to="/templates/$templateId" params={{ templateId: template.id }}>
              {TEMPLATE_USE_LABEL[template.status]}
            </Link>
          ) : (
            <span>{TEMPLATE_USE_LABEL[template.status]}</span>
          )}
        </Button>
      </div>
    </article>
  );
}

/** Mantido para uso futuro do fluxo de criação (Etapa 3). */
export function templateUnavailableToast() {
  toast("Uso de template", {
    description: "O fluxo de criação a partir do template chega na próxima etapa.",
  });
}
