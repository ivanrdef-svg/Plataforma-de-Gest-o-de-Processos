import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  CalendarClock,
  Gavel,
  Search,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { WorkspaceLayout } from "@/components/workspace/workspace-layout";
import { WorkspaceAiPanel } from "@/components/workspace/workspace-ai-panel";
import { WorkspaceStatusBar } from "@/components/workspace/workspace-status-bar";
import { WorkspaceContextBar } from "@/components/workspace/workspace-context-bar";
import { EmptyState } from "@/components/layout/page";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { LifecycleBadge } from "@/components/lifecycle/lifecycle-badge";
import { GovernanceTimeline } from "@/components/governance/governance-timeline";
import {
  ApprovalBadge,
  ComplianceBadge,
  CriticalityBadge,
  ReviewSituationBadge,
} from "@/components/governance/governance-badges";
import { reviewSituationFor } from "@/config/governance-model";
import { useGovernedAssets, type GovernedAsset } from "@/lib/governance-assets";
import { DEMO_ENVIRONMENT } from "@/config/workspace-demo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/governanca/")({
  component: GovernanceCenter,
  head: () => ({
    meta: [
      { title: "Governança — Process Platform" },
      {
        name: "description",
        content:
          "Governance Center: responsabilidades, criticidade, revisões, aprovações, conformidade, riscos e controles dos ativos corporativos.",
      },
      { property: "og:title", content: "Governança — Process Platform" },
      {
        property: "og:description",
        content:
          "Visão consolidada dos ativos que exigem atenção de governança na plataforma.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function assetLink(asset: GovernedAsset, children: React.ReactNode) {
  const { kind, objectId } = asset.seed;
  if (kind === "knowledge") {
    return (
      <Link to="/knowledge/$packageId" params={{ packageId: objectId }}>
        {children}
      </Link>
    );
  }
  if (kind === "pop") {
    return (
      <Link to="/pop/$popId" params={{ popId: objectId }}>
        {children}
      </Link>
    );
  }
  return (
    <Link to="/processos/$processId" params={{ processId: objectId }}>
      {children}
    </Link>
  );
}

function AssetRow({ asset, extra }: { asset: GovernedAsset; extra?: React.ReactNode }) {
  return (
    <li>
      {assetLink(
        asset,
        <div className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{asset.record.name}</p>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {asset.typeLabel} ·{" "}
              {asset.record.responsibilities.find((r) => r.role === "Owner")?.name}
            </p>
          </div>
          {extra}
          <CriticalityBadge level={asset.record.criticality} size="sm" />
        </div>,
      )}
    </li>
  );
}

function Panel({
  icon: Icon,
  title,
  description,
  count,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-card">
      <header className="flex items-start justify-between gap-3 border-b px-4 py-3">
        <div className="flex items-start gap-2">
          <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <div>
            <h2 className="text-sm font-medium">{title}</h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{description}</p>
          </div>
        </div>
        <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          {count}
        </span>
      </header>
      {children}
    </section>
  );
}

function GovernanceCenter() {
  const assets = useGovernedAssets();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return assets;
    return assets.filter(
      (a) =>
        a.record.name.toLowerCase().includes(q) ||
        a.typeLabel.toLowerCase().includes(q) ||
        a.record.criticality.includes(q),
    );
  }, [assets, query]);

  const awaitingReview = filtered.filter(
    (a) =>
      a.state === "em revisão" ||
      reviewSituationFor(a.record.review.nextAt) !== "em dia",
  );
  const awaitingApproval = filtered.filter(
    (a) =>
      a.state === "aguardando aprovação" ||
      a.record.approval.status === "aguardando aprovação",
  );
  const critical = filtered.filter(
    (a) => a.record.criticality === "alta" || a.record.criticality === "crítica",
  );
  const nonCompliant = filtered.filter((a) => a.health.pendingCompliance > 0);

  const recentEvents = useMemo(
    () =>
      filtered
        .flatMap((a) => a.record.events.map((event) => ({ event, asset: a })))
        .sort((a, b) => a.event.at.localeCompare(b.event.at))
        .slice(-8)
        .map(({ event, asset }) => ({
          ...event,
          title: `${asset.record.name} · ${event.title}`,
        })),
    [filtered],
  );

  const stats = [
    { id: "governados", label: "Ativos governados", value: assets.length },
    { id: "revisao", label: "Aguardando revisão", value: awaitingReview.length },
    { id: "aprovacao", label: "Aguardando aprovação", value: awaitingApproval.length },
    { id: "criticos", label: "Alta criticidade", value: critical.length },
  ];

  return (
    <WorkspaceLayout
      title="Governança"
      subtitle="Responsabilidades, autoridade, revisão, conformidade, riscos e controles dos ativos corporativos."
      contextBar={
        <WorkspaceContextBar
          groups={[
            {
              label: "Atenção",
              items: [
                `${awaitingReview.length} revisões`,
                `${awaitingApproval.length} aprovações`,
              ],
            },
            {
              label: "Risco",
              items: [
                `${critical.length} ativos críticos`,
                `${nonCompliant.length} pendências de conformidade`,
              ],
            },
          ]}
        />
      }
      tabs={[
        {
          id: "visao",
          label: "Visão geral",
          content: (
            <div className="space-y-8">
              <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
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

              <div className="relative max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Pesquisar ativos governados"
                  aria-label="Pesquisar ativos governados"
                  className="h-9 pl-9 text-sm"
                />
              </div>

              {assets.length === 0 ? (
                <EmptyState
                  icon={<ShieldCheck className="h-5 w-5" />}
                  title="Nenhum ativo governado ainda"
                  description="Crie um Knowledge Package, POP ou Processo para que ele entre no modelo de governança."
                />
              ) : (
                <div className="grid gap-6 xl:grid-cols-2">
                  <Panel
                    icon={CalendarClock}
                    title="Aguardando revisão"
                    description="Revisões vencidas, próximas do vencimento ou em andamento."
                    count={awaitingReview.length}
                  >
                    <ul className="divide-y">
                      {awaitingReview.slice(0, 6).map((asset) => (
                        <AssetRow
                          key={asset.seed.objectId}
                          asset={asset}
                          extra={
                            <ReviewSituationBadge
                              situation={reviewSituationFor(asset.record.review.nextAt)}
                            />
                          }
                        />
                      ))}
                      {awaitingReview.length === 0 && (
                        <li className="px-4 py-6 text-xs text-muted-foreground">
                          Todas as revisões estão em dia.
                        </li>
                      )}
                    </ul>
                  </Panel>

                  <Panel
                    icon={Gavel}
                    title="Aguardando aprovação"
                    description="Ativos com decisão pendente da autoridade competente."
                    count={awaitingApproval.length}
                  >
                    <ul className="divide-y">
                      {awaitingApproval.slice(0, 6).map((asset) => (
                        <AssetRow
                          key={asset.seed.objectId}
                          asset={asset}
                          extra={<LifecycleBadge state={asset.state} size="sm" />}
                        />
                      ))}
                      {awaitingApproval.length === 0 && (
                        <li className="px-4 py-6 text-xs text-muted-foreground">
                          Nenhuma aprovação pendente.
                        </li>
                      )}
                    </ul>
                  </Panel>

                  <Panel
                    icon={ShieldAlert}
                    title="Alta criticidade"
                    description="Ativos com maior impacto operacional ou regulatório."
                    count={critical.length}
                  >
                    <ul className="divide-y">
                      {critical.slice(0, 6).map((asset) => (
                        <AssetRow
                          key={asset.seed.objectId}
                          asset={asset}
                          extra={
                            <span className="shrink-0 text-[11px] text-muted-foreground">
                              {asset.health.criticalRisks} riscos
                            </span>
                          }
                        />
                      ))}
                      {critical.length === 0 && (
                        <li className="px-4 py-6 text-xs text-muted-foreground">
                          Nenhum ativo de alta criticidade.
                        </li>
                      )}
                    </ul>
                  </Panel>

                  <Panel
                    icon={AlertTriangle}
                    title="Pendências de conformidade"
                    description="Requisitos pendentes ou em análise."
                    count={nonCompliant.length}
                  >
                    <ul className="divide-y">
                      {nonCompliant.slice(0, 6).map((asset) => {
                        const pending = asset.record.compliance.find(
                          (item) =>
                            item.status === "pendente" || item.status === "em análise",
                        );
                        return (
                          <AssetRow
                            key={asset.seed.objectId}
                            asset={asset}
                            extra={
                              pending ? <ComplianceBadge status={pending.status} /> : null
                            }
                          />
                        );
                      })}
                      {nonCompliant.length === 0 && (
                        <li className="px-4 py-6 text-xs text-muted-foreground">
                          Nenhuma pendência de conformidade.
                        </li>
                      )}
                    </ul>
                  </Panel>
                </div>
              )}
            </div>
          ),
        },
        {
          id: "ativos",
          label: "Ativos governados",
          content: (
            <div className="space-y-3">
              {filtered.map((asset) => (
                <div
                  key={asset.seed.objectId}
                  className="rounded-xl border bg-card transition-shadow hover:shadow-soft"
                >
                  {assetLink(
                    asset,
                    <div className="p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-medium">
                          {asset.record.name}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {asset.typeLabel}
                        </span>
                        <div className="ml-auto flex flex-wrap items-center gap-1.5">
                          <LifecycleBadge state={asset.state} size="sm" />
                          <CriticalityBadge level={asset.record.criticality} size="sm" />
                          <ApprovalBadge status={asset.record.approval.status} />
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                        <span>
                          Owner:{" "}
                          {
                            asset.record.responsibilities.find((r) => r.role === "Owner")
                              ?.name
                          }
                        </span>
                        <span>Revisor: {asset.record.review.reviewer}</span>
                        <span>Periodicidade: {asset.record.review.periodicity}</span>
                        <ReviewSituationBadge
                          situation={reviewSituationFor(asset.record.review.nextAt)}
                        />
                      </div>
                      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            asset.health.score >= 75
                              ? "bg-emerald-500"
                              : asset.health.score >= 45
                                ? "bg-amber-500"
                                : "bg-red-500",
                          )}
                          style={{ width: `${asset.health.score}%` }}
                        />
                      </div>
                    </div>,
                  )}
                </div>
              ))}
              {filtered.length === 0 && (
                <EmptyState
                  icon={<ShieldCheck className="h-5 w-5" />}
                  title="Nenhum ativo encontrado"
                  description="Ajuste a pesquisa para localizar ativos governados."
                />
              )}
            </div>
          ),
        },
        {
          id: "atividades",
          label: "Atividades recentes",
          content: (
            <div className="max-w-3xl">
              <h3 className="mb-1 text-sm font-semibold">Atividades de governança</h3>
              <p className="mb-5 text-xs text-muted-foreground">
                Últimos eventos registrados nos ativos governados.
              </p>
              <GovernanceTimeline events={recentEvents} />
            </div>
          ),
        },
      ]}
      defaultTab="visao"
      sidePanel={
        <div className="space-y-6">
          <section className="space-y-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Como ler esta visão
            </h3>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Governança define responsabilidades, autoridade e conformidade. A execução
              dessas definições ficará a cargo do Workflow em Build futura.
            </p>
          </section>
          <Separator />
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
