/**
 * Build 029 — Etapa 2: sugestão por IA de mapeamentos Seção de POP → Etapa de Processo.
 *
 * Mesmo padrão de `pop-draft-proposal.functions.ts`: createServerFn + zod,
 * credenciais lidas apenas dentro do handler, resultado discriminado devolvido
 * ao cliente. Nada é persistido aqui — `recordAiSuggestion` é chamado pela UI.
 *
 * DIFERENÇA DELIBERADA em relação ao Build 025: lá o conteúdo é carregado do
 * Storage no servidor. Aqui as fontes (PopDoc/ProcessDoc) vivem em stores
 * client-side (localStorage), sem equivalente server-side — por isso o conteúdo
 * já serializado chega do cliente, que o tem em memória via os stores reativos.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  AiMappingSuggestionsOutputSchema,
  type AiMappingSuggestion,
  type AiMappingSuggestionsOutput,
} from "@/lib/pop-process-step-mapping-schema";
import type { AiProviderFailureReason } from "@/lib/ai-provider.server";

const SuggestInput = z.object({
  popId: z.string().min(1),
  processId: z.string().min(1),
  popName: z.string().default(""),
  popSections: z
    .array(z.object({ id: z.string().min(1), title: z.string(), content: z.string() }))
    .min(0),
  processName: z.string().default(""),
  processSteps: z
    .array(z.object({ id: z.string().min(1), name: z.string(), description: z.string() }))
    .min(0),
});

/** Mesma taxonomia neutra do Build 025, mais as causas próprias desta chamada. */
export type SuggestPopProcessStepMappingsFailureReason =
  "pop-sem-secoes" | "processo-sem-etapas" | AiProviderFailureReason;

export type SuggestPopProcessStepMappingsResult =
  | {
      ok: true;
      popId: string;
      processId: string;
      suggestions: AiMappingSuggestion[];
      /** Sugestões descartadas por citarem um id não fornecido (defesa server-side). */
      discardedCount: number;
      provider: string;
      model: string;
    }
  | { ok: false; reason: SuggestPopProcessStepMappingsFailureReason; message: string };

function classifyAiError(error: unknown): {
  reason: SuggestPopProcessStepMappingsFailureReason;
  message: string;
} {
  if (
    typeof error === "object" &&
    error !== null &&
    (error as { name?: unknown }).name === "AiProviderError"
  ) {
    const typed = error as { reason: AiProviderFailureReason; message: string };
    return { reason: typed.reason, message: typed.message };
  }
  return {
    reason: "desconhecido",
    message: "Falha inesperada ao sugerir correspondências com IA.",
  };
}

export const suggestPopProcessStepMappings = createServerFn({ method: "POST" })
  .validator((input: unknown) => SuggestInput.parse(input))
  .handler(async ({ data }): Promise<SuggestPopProcessStepMappingsResult> => {
    if (data.popSections.length === 0) {
      return {
        ok: false,
        reason: "pop-sem-secoes",
        message: "Este POP não possui seções para correlacionar.",
      };
    }
    // Sem etapas não há alvo possível — nenhuma chamada de IA é gasta.
    if (data.processSteps.length === 0) {
      return {
        ok: false,
        reason: "processo-sem-etapas",
        message: "O Processo vinculado ainda não possui etapas para correlacionar.",
      };
    }

    const { buildMappingSuggestionPrompt } = await import("@/lib/pop-process-step-mapping-prompt");
    const prompt = buildMappingSuggestionPrompt(
      { name: data.popName, sections: data.popSections },
      { name: data.processName, steps: data.processSteps },
    );

    try {
      const { resolveAiProvider } = await import("@/lib/ai-provider.server");
      const { provider, model } = resolveAiProvider();

      const result = await provider.interpretStructured<AiMappingSuggestionsOutput>({
        model,
        schema: AiMappingSuggestionsOutputSchema,
        temperature: 0.2,
        messages: [
          { role: "system", content: prompt.system },
          { role: "user", content: prompt.user },
        ],
      });

      // Defesa server-side: a IA não pode introduzir ids que não foram enviados.
      const sectionIds = new Set(data.popSections.map((s) => s.id));
      const stepIds = new Set(data.processSteps.map((s) => s.id));
      const suggestions: AiMappingSuggestion[] = [];
      let discardedCount = 0;
      for (const suggestion of result.object.suggestions) {
        if (sectionIds.has(suggestion.popSectionId) && stepIds.has(suggestion.processStepId)) {
          suggestions.push(suggestion);
        } else {
          discardedCount += 1;
        }
      }

      return {
        ok: true,
        popId: data.popId,
        processId: data.processId,
        suggestions,
        discardedCount,
        provider: result.provider,
        model: result.model,
      };
    } catch (error) {
      return { ok: false, ...classifyAiError(error) };
    }
  });
