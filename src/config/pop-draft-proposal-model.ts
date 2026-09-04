/**
 * Build 025 — contrato (apenas tipos) da proposta de rascunho gerada a partir
 * de um documento importado. Evolução do contrato do Build 023: seções agora
 * carregam origem, confiança e referência aos elementos do documento, e
 * findings (lacuna/ambiguidade) são registrados separadamente.
 *
 * Sem store, sem persistência e sem consumo na UI neste build.
 */

/** Procedência do conteúdo proposto. */
export type PopContentOrigin = "documento" | "ia" | "documento+ia";

export type PopConfidenceLevel = "alta" | "média" | "baixa";

export interface PopProposedSection {
  id: string;
  title: string;
  content: string;
  origin: PopContentOrigin;
  confidence: PopConfidenceLevel;
  /**
   * Ids de `DocxElement` que embasaram esta seção. Vazio apenas quando não há
   * fundamento direto — nesse caso `confidence` deve ser "baixa".
   */
  sourceElementIds: string[];
}

export type PopDraftFindingType = "lacuna" | "ambiguidade";

export interface PopDraftFinding {
  id: string;
  type: PopDraftFindingType;
  /** Ex.: "Responsável não identificado no documento." */
  description: string;
  relatedSectionId?: string;
  sourceElementIds?: string[];
}

/**
 * Build 025 cobre apenas "proposto" e "erro".
 * "em revisão" | "confirmado" | "rejeitado" pertencem ao Build 026.
 */
export type PopDraftProposalStatus = "proposto" | "erro";

export interface PopDraftProposalAiMeta {
  model: string;
  processedAt: string;
  gatewayRequestId?: string;
  /** Build 025 — Etapa 2.1: provider concreto usado (ex.: "lovable", "google"). */
  provider?: string;
}

export interface PopDraftProposal {
  id: string;
  sourceDocumentId: string;
  status: PopDraftProposalStatus;
  proposedSections: PopProposedSection[];
  findings: PopDraftFinding[];
  aiMeta?: PopDraftProposalAiMeta;
  createdAt: string;
  errorMessage?: string;
  /** Reservado para o Build 026 — nunca preenchido neste build. */
  confirmedPopId?: string;
}
