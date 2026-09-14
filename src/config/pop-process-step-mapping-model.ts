/**
 * Build 029 — Etapa 1: contrato de domínio do mapeamento Seção de POP → Etapa de Processo.
 *
 * Somente tipos/contratos. Nenhuma IA, server function ou UI nesta etapa.
 * Não introduz `humanEdited` — esse conceito pertence exclusivamente a PopDraftProposal.
 */

export type PopProcessStepMappingStatus = "sugerido" | "confirmado" | "rejeitado";

export type PopProcessStepMappingSource = "ia" | "manual";

export interface PopProcessStepMapping {
  id: string;
  popId: string;
  popSectionId: string;
  processId: string;
  processStepId: string;
  confirmedAgainstProcessVersionId?: string;
  status: PopProcessStepMappingStatus;
  source: PopProcessStepMappingSource;
  /** Presente apenas quando `source === "ia"`. */
  confidence?: number;
  /** Presente apenas quando `source === "ia"`. */
  rationale?: string;
  createdAt: string;
  updatedAt: string;
}

/** Motivos de recusa dos mutadores (retorno discriminado). */
export type PopProcessStepMappingFailure =
  | "pop-inexistente"
  | "processo-inexistente"
  | "processo-nao-vinculado"
  | "versao-inexistente"
  | "step-inexistente"
  | "step-de-outro-processo"
  | "duplicado"
  | "mapping-inexistente"
  | "status-invalido";

export type PopProcessStepMappingResult =
  | { ok: true; mapping: PopProcessStepMapping }
  | { ok: false; reason: PopProcessStepMappingFailure };

export interface RecordAiSuggestionInput {
  processVersionId: string;
  popId: string;
  popSectionId: string;
  processId: string;
  processStepId: string;
  confidence: number;
  rationale: string;
}

export interface CreateManualMappingInput {
  processVersionId: string;
  popId: string;
  popSectionId: string;
  processId: string;
  processStepId: string;
}
