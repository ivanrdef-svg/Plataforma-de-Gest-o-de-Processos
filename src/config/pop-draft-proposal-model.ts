/**
 * Build 023 — contrato (apenas tipos) da proposta de rascunho gerada a partir
 * de um documento importado. Sem store, sem persistência e sem consumo na UI:
 * existe só para que os Builds 024/025 não precisem redesenhar os dados.
 */

import type { PopSection } from "@/lib/pop-store";

export type PopDraftProposalStatus =
  | "proposto"
  | "em revisão"
  | "confirmado"
  | "rejeitado";

export interface PopDraftProposalAiMeta {
  model: string;
  processedAt: string;
}

export interface PopDraftProposal {
  id: string;
  sourceDocumentId: string;
  status: PopDraftProposalStatus;
  /** Seções propostas, já com `origin`/`sourceReference` preenchidos. */
  proposedSections: PopSection[];
  aiMeta?: PopDraftProposalAiMeta;
  createdAt: string;
  confirmedPopId?: string;
}
