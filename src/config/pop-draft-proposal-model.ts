/**
 * Build 025 — contrato (apenas tipos) da proposta de rascunho gerada a partir
 * de um documento importado. Evolução do contrato do Build 023: seções agora
 * carregam origem, confiança e referência aos elementos do documento, e
 * findings (lacuna/ambiguidade) são registrados separadamente.
 *
 * Sem store, sem persistência e sem consumo na UI neste build.
 */

/** Procedência do conteúdo proposto. */
export type PopContentOrigin = "documento" | "ia" | "manual";

/**
 * Build 026 — procedência unificada, compartilhada entre proposta e POP final.
 * `sourceElementIds` pode ser vazio quando não há fundamento direto.
 */
export interface PopProvenance {
  sourceDocumentId: string;
  sourceElementIds: string[];
}

export type PopConfidenceLevel = "alta" | "média" | "baixa";

export interface PopProposedSection {
  id: string;
  title: string;
  content: string;
  origin: PopContentOrigin;
  confidence: PopConfidenceLevel;
  /** Ausente quando a seção não tem fundamento no documento original. */
  provenance?: PopProvenance;
  /**
   * Build 026 — só é escrito no lado da revisão humana (`reviewedSections`).
   * O lado da IA nunca preenche este campo.
   */
  humanEdited?: boolean;
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

/** Build 026 — ciclo completo da proposta (mutadores chegam na Etapa 2). */
export type PopDraftProposalStatus =
  | "proposto"
  | "em revisão"
  | "confirmado"
  | "rejeitado"
  | "erro";

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
  /** Imutável após a criação — nunca reescrito pela revisão. */
  proposedSections: PopProposedSection[];
  /** Build 026 — ausente até a revisão começar (Etapa 2). */
  reviewedSections?: PopProposedSection[];
  findings: PopDraftFinding[];
  aiMeta?: PopDraftProposalAiMeta;
  createdAt: string;
  errorMessage?: string;
  /** Preenchido apenas na confirmação (Etapa 2+). */
  confirmedPopId?: string;
}
