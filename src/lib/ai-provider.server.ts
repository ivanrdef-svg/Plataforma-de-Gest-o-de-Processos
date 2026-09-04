/**
 * Build 025 — Etapa 2.1: abstração mínima de provider de IA estruturada.
 *
 * A camada de negócio (interpretação de POP) fala apenas com esta interface —
 * nunca com um SDK/gateway concreto. Módulo server-only (`.server`).
 */

import type { ZodType } from "zod";

export interface StructuredAiRequest {
  model: string;
  schema: ZodType;
  temperature?: number;
  messages: { role: "system" | "user"; content: string }[];
}

export interface StructuredAiResult<T> {
  object: T;
  provider: string;
  model: string;
  /** Só quando o provider concreto expuser algo equivalente — nunca inventado. */
  requestId?: string;
}

export interface AiProvider {
  name: string;
  interpretStructured<T>(request: StructuredAiRequest): Promise<StructuredAiResult<T>>;
}

/** Causas neutras — independentes de qual provider está configurado. */
export type AiProviderFailureReason =
  | "provider-nao-configurado"
  | "credencial-ausente"
  | "provider-nao-autorizado"
  | "provider-indisponivel"
  | "resposta-invalida"
  | "desconhecido";

/** Erro já classificado pelo adapter concreto. */
export class AiProviderError extends Error {
  readonly reason: AiProviderFailureReason;

  constructor(reason: AiProviderFailureReason, message: string) {
    super(message);
    this.name = "AiProviderError";
    this.reason = reason;
  }
}

/**
 * Tradução de erros crus de SDK/HTTP em causas neutras. Usada pelos adapters
 * (nunca pela camada de negócio), sem vazar detalhes crus do provider.
 */
export function classifyProviderError(error: unknown): AiProviderError {
  if (error instanceof AiProviderError) return error;

  const raw = error instanceof Error ? error.message : String(error);
  const name = error instanceof Error ? error.name : "";
  const status =
    typeof error === "object" && error !== null && "statusCode" in error
      ? Number((error as { statusCode?: unknown }).statusCode)
      : undefined;

  if (name === "AbortError" || /timeout|timed out|aborted/i.test(raw)) {
    return new AiProviderError(
      "provider-indisponivel",
      "A interpretação demorou mais do que o esperado e foi interrompida. Tente novamente.",
    );
  }
  if (status === 401 || status === 403) {
    return new AiProviderError(
      "provider-nao-autorizado",
      "O serviço de IA recusou a solicitação (credencial ou permissão inválida).",
    );
  }
  if (status === 402) {
    return new AiProviderError(
      "provider-indisponivel",
      "O serviço de IA está sem créditos disponíveis para processar esta solicitação.",
    );
  }
  if (status === 429 || (typeof status === "number" && status >= 500)) {
    return new AiProviderError(
      "provider-indisponivel",
      "O serviço de IA está temporariamente indisponível. Tente novamente em instantes.",
    );
  }
  if (
    name === "AI_NoObjectGeneratedError" ||
    name === "AI_TypeValidationError" ||
    /no object generated|schema|validation/i.test(raw)
  ) {
    return new AiProviderError(
      "resposta-invalida",
      "A resposta da IA não respeitou o formato exigido e foi descartada. Nenhuma proposta foi criada.",
    );
  }
  return new AiProviderError("desconhecido", "Falha inesperada ao interpretar o documento com IA.");
}

/** Modelo padrão por provider, quando `AI_MODEL` não está definido. */
export const DEFAULT_MODEL_BY_PROVIDER: Record<string, string> = {
  // Mantém exatamente o modelo usado até aqui via Lovable AI Gateway.
  lovable: "google/gemini-3.7-flash",
  // Identificador da API direta do Google (sem prefixo de vendor).
  google: "gemini-2.5-flash",
};

export type ResolvedAiProvider = { provider: AiProvider; model: string };

/**
 * Lê `AI_PROVIDER` (default "lovable") e `AI_MODEL`. Um valor desconhecido não
 * derruba a resolução: devolve um provider que falha de forma controlada no uso.
 * Sem fallback automático entre providers.
 */
export function resolveAiProvider(): ResolvedAiProvider {
  const configured = (process.env["AI_PROVIDER"] ?? "").trim().toLowerCase() || "lovable";
  const model = (process.env["AI_MODEL"] ?? "").trim() || DEFAULT_MODEL_BY_PROVIDER[configured];

  if (configured === "lovable" || configured === "google") {
    return {
      provider: createLazyProvider(configured),
      model: model ?? DEFAULT_MODEL_BY_PROVIDER[configured]!,
    };
  }

  return {
    provider: {
      name: configured,
      interpretStructured: () => {
        throw new AiProviderError(
          "provider-nao-configurado",
          `O provider de IA configurado ("${configured}") não é suportado.`,
        );
      },
    },
    model: model ?? "",
  };
}

/** Carrega o adapter concreto apenas no momento do uso. */
function createLazyProvider(name: "lovable" | "google"): AiProvider {
  return {
    name,
    interpretStructured: async (request) => {
      try {
        if (name === "lovable") {
          const { createLovableAiProvider } = await import("@/lib/ai-provider-lovable.server");
          return await createLovableAiProvider().interpretStructured(request);
        }
        const { createGoogleAiProvider } = await import("@/lib/ai-provider-google.server");
        return await createGoogleAiProvider().interpretStructured(request);
      } catch (error) {
        throw classifyProviderError(error);
      }
    },
  };
}
