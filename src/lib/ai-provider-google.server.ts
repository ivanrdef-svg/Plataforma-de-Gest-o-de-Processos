/**
 * Build 025 — Etapa 2.1: adapter direto da API do Google (Gemini).
 *
 * Mesmo ecossistema do Vercel AI SDK já usado (`@ai-sdk/*` + `ai`). Lê
 * `GOOGLE_GENERATIVE_AI_API_KEY` somente aqui dentro. Não há identificador de
 * requisição equivalente ao run-id do gateway — `requestId` fica indefinido.
 */

import {
  AiProviderError,
  classifyProviderError,
  type AiProvider,
  type StructuredAiRequest,
  type StructuredAiResult,
} from "@/lib/ai-provider.server";

export function createGoogleAiProvider(): AiProvider {
  return {
    name: "google",
    async interpretStructured<T>(
      request: StructuredAiRequest,
    ): Promise<StructuredAiResult<T>> {
      const apiKey = process.env["GOOGLE_GENERATIVE_AI_API_KEY"];
      if (!apiKey) {
        throw new AiProviderError(
          "credencial-ausente",
          "A credencial do provider Google não está configurada neste ambiente.",
        );
      }

      try {
        const { streamObject } = await import("ai");
        const { createGoogleGenerativeAI } = await import("@ai-sdk/google");
        const google = createGoogleGenerativeAI({ apiKey });

        const result = streamObject({
          model: google(request.model),
          schema: request.schema,
          ...(request.temperature === undefined ? {} : { temperature: request.temperature }),
          messages: request.messages,
        });

        const object = (await result.object) as T;

        return {
          object,
          provider: "google",
          model: request.model,
        };
      } catch (error) {
        throw classifyProviderError(error);
      }
    },
  };
}
