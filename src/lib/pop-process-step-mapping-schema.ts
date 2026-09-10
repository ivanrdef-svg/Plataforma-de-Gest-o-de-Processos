/**
 * Build 029 — Etapa 2: contrato de saída da IA para sugestões de mapeamento
 * Seção de POP → Etapa de Processo. Somente schema (sem I/O, client-safe).
 */

import { z } from "zod";

export const AiMappingSuggestionSchema = z.object({
  popSectionId: z.string().min(1),
  processStepId: z.string().min(1),
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
});

export const AiMappingSuggestionsOutputSchema = z.object({
  suggestions: z.array(AiMappingSuggestionSchema).min(0),
});

export type AiMappingSuggestion = z.infer<typeof AiMappingSuggestionSchema>;
export type AiMappingSuggestionsOutput = z.infer<typeof AiMappingSuggestionsOutputSchema>;
