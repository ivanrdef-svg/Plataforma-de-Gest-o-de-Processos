import { Link } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck } from "lucide-react";
import {
  CriticalityBadge,
  ReviewSituationBadge,
} from "@/components/governance/governance-badges";
import { reviewSituationFor } from "@/config/governance-model";
import { useGovernedAssets } from "@/lib/governance-assets";

/**
 * Build 010 — widget "Governança requer atenção" no Launchpad.
 * Lê os mesmos ativos governados do Governance Center.
 */
export function GovernanceAttention() {
  const assets = useGovernedAssets();

  const items = assets
    .map((asset) => {
      const situation = reviewSituationFor(asset.record.review.nextAt);
      const reason =
        situation === "vencida"
          ? "Revisão vencida"
          : asset.record.approval.status === "aguardando aprovação" ||
              asset.state === "aguardando aprovação"
            ? "Aprovação pendente"
            : asset.health.pendingCompliance > 0
              ? "Pendência de conformidade"
              : asset.record.criticality === "crítica" || asset.record.criticality === "alta"
                ? "Ativo crítico"
                : "";
      return { asset, situation, reason };
    })
    .filter((item) => item.reason)
    .sort((a, b) => a.asset.health.score - b.asset.health.score)
    .slice(0, 5);

  return (
    <section className="rounded-xl border bg-card">
      <header className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
          <h2 className="text-sm font-medium">Governança requer atenção</h2>
        </div>
        <Link
          to="/governanca"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          Governance Center <ArrowRight className="h-3 w-3" />
        </Link>
      </header>

      {items.length === 0 ? (
        <p className="px-4 py-6 text-xs text-muted-foreground">
          Nenhum ativo exige atenção de governança no momento.
        </p>
      ) : (
        <ul className="divide-y">
          {items.map(({ asset, situation, reason }) => {
            const content = (
              <div className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{asset.record.name}</p>
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                    {asset.typeLabel} · {reason}
                  </p>
                </div>
                {situation !== "em dia" ? (
                  <ReviewSituationBadge situation={situation} />
                ) : (
                  <CriticalityBadge level={asset.record.criticality} size="sm" />
                )}
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
            );
            const id = asset.seed.objectId;
            if (asset.seed.kind === "knowledge") {
              return (
                <li key={id}>
                  <Link to="/knowledge/$packageId" params={{ packageId: id }}>
                    {content}
                  </Link>
                </li>
              );
            }
            if (asset.seed.kind === "pop") {
              return (
                <li key={id}>
                  <Link to="/pop/$popId" params={{ popId: id }}>
                    {content}
                  </Link>
                </li>
              );
            }
            return (
              <li key={id}>
                <Link to="/processos/$processId" params={{ processId: id }}>
                  {content}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
