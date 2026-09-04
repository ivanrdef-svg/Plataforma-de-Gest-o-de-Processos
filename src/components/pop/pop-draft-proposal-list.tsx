/**
 * Build 025 — Etapa 3: visualização somente-leitura das propostas geradas por IA.
 *
 * Nenhuma ação de confirmação/aprovação/edição existe aqui — a proposta é um
 * artefato em revisão, nunca um POP. Nada deste componente toca `pop-store`.
 */

import { AlertTriangle, HelpCircle, Sparkles } from "lucide-react";
import type { PopDraftProposal } from "@/config/pop-draft-proposal-model";
import { usePopDraftProposalsForSource } from "@/lib/pop-draft-proposal-store";

const ORIGIN_LABEL: Record<string, string> = {
  documento: "Documento",
  ia: "Inferência da IA",
  "documento+ia": "Documento + IA",
};

function formatDateTime(iso: string) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString("pt-BR");
}

function ProposalDetails({ proposal }: { proposal: PopDraftProposal }) {
  const gaps = proposal.findings.filter((f) => f.type === "lacuna");
  const ambiguities = proposal.findings.filter((f) => f.type === "ambiguidade");

  return (
    <details className="mt-2 group">
      <summary className="cursor-pointer list-none text-[11px] text-muted-foreground underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {proposal.proposedSections.length} seção(ões) proposta(s) · {gaps.length} lacuna(s)
        identificada(s) · {ambiguities.length} ambiguidade(s) identificada(s)
      </summary>

      {proposal.proposedSections.length > 0 ? (
        <ul className="mt-3 space-y-3">
          {proposal.proposedSections.map((section) => (
            <li key={section.id} className="rounded-lg border bg-background p-3">
              <p className="text-xs font-medium">{section.title}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Origem: {ORIGIN_LABEL[section.origin] ?? section.origin} · Confiança:{" "}
                {section.confidence}
              </p>
              {section.content ? (
                <p className="mt-2 whitespace-pre-wrap text-xs text-foreground/90">
                  {section.content}
                </p>
              ) : null}
              {section.sourceElementIds.length > 0 ? (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Baseado em elementos do documento original ({section.sourceElementIds.length}).
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {gaps.length > 0 ? (
        <div className="mt-3">
          <p className="flex items-center gap-1.5 text-[11px] font-medium">
            <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
            Lacunas
          </p>
          <ul className="mt-1 space-y-1">
            {gaps.map((finding) => (
              <li key={finding.id} className="text-[11px] text-muted-foreground">
                {finding.description}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {ambiguities.length > 0 ? (
        <div className="mt-3">
          <p className="flex items-center gap-1.5 text-[11px] font-medium">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
            Ambiguidades
          </p>
          <ul className="mt-1 space-y-1">
            {ambiguities.map((finding) => (
              <li key={finding.id} className="text-[11px] text-muted-foreground">
                {finding.description}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </details>
  );
}

export function PopDraftProposalList({ sourceDocumentId }: { sourceDocumentId: string }) {
  const proposals = usePopDraftProposalsForSource(sourceDocumentId);
  if (proposals.length === 0) return null;

  return (
    <ul className="mt-3 space-y-2">
      {proposals.map((proposal) => (
        <li key={proposal.id} className="rounded-lg border bg-muted/30 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-[11px] font-medium">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              {proposal.status === "proposto"
                ? "Proposta gerada — aguardando revisão"
                : "Falha na interpretação"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {formatDateTime(proposal.createdAt)}
              {proposal.aiMeta?.provider ? ` · ${proposal.aiMeta.provider}` : ""}
              {proposal.aiMeta?.model ? ` · ${proposal.aiMeta.model}` : ""}
            </p>
          </div>

          {proposal.status === "erro" && proposal.errorMessage ? (
            <p className="mt-1 text-[11px] text-destructive">{proposal.errorMessage}</p>
          ) : null}

          {proposal.status === "proposto" ? <ProposalDetails proposal={proposal} /> : null}
        </li>
      ))}
    </ul>
  );
}
