/**
 * Build 025 — Etapa 2.1: adapter do Lovable AI Gateway.
 *
 * Encapsula exatamente o que a função de negócio fazia antes: lê
 * `LOVABLE_API_KEY` (somente aqui dentro), usa o provider do gateway com
 * `streamObject` e captura o run-id como `requestId`.
 */

import {
  AiProviderError,
  classifyProviderError,
  type AiProvider,
  type StructuredAiRequest,
  type StructuredAiResult,
} from "@/lib/ai-provider.server";

export function createLovableAiProvider(): AiProvider {
  return {
    name: "lovable",
    async interpretStructured<T>(request: StructuredAiRequest): Promise<StructuredAiResult<T>> {
      const apiKey = process.env["LOVABLE_API_KEY"];
      if (!apiKey) {
        throw new AiProviderError(
          "credencial-ausente",
          "O serviço de IA não está configurado neste ambiente.",
        );
      }

      try {
        const { streamObject } = await import("ai");
        const { createLovableAiGatewayChatProvider } = await import("@/lib/ai-gateway.server");
        const gateway = createLovableAiGatewayChatProvider(apiKey);

        const result = streamObject({
          model: gateway(request.model),
          schema: request.schema,
          ...(request.temperature === undefined ? {} : { temperature: request.temperature }),
          messages: request.messages,
        });

        // Consumido no servidor: mantém bytes fluindo (evita corte por
        // inatividade) sem streaming na UI, com validação de schema pelo SDK.
        const object = (await result.object) as T;
        const requestId = await gateway.waitForRunId();

        return {
          object,
          provider: "lovable",
          model: request.model,
          ...(requestId ? { requestId } : {}),
        };
      } catch (error) {
        throw classifyProviderError(error);
      }
    },
  };
}
