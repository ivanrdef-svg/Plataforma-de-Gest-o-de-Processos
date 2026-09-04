/**
 * Build 025 — Etapa 2: interpretação por IA do documento estruturado.
 *
 * Mesmo padrão dos builds anteriores: createServerFn + zod, credenciais lidas
 * apenas dentro do handler, resultado discriminado devolvido ao cliente —
 * a persistência é responsabilidade do cliente (localStorage).
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type {
  PopDraftFinding,
  PopDraftProposal,
  PopProposedSection,
} from "@/config/pop-draft-proposal-model";
import { AiProposalOutputSchema, type AiProposalOutput } from "@/lib/pop-draft-proposal-schema";
import type { AiProviderFailureReason, StructuredAiResult } from "@/lib/ai-provider.server";

const GenerateInput = z.object({
  sourceDocumentId: z.string().min(1),
  storageObjectPath: z.string().min(1).max(512),
});

export type GeneratePopDraftProposalFailureReason =
  | "documento-invalido"
  | "storage"
  | "contexto-excedido"
  // Causas neutras vindas do provider de IA (Etapa 2.1).
  | AiProviderFailureReason
  // Nomes históricos preservados por retrocompatibilidade.
  | "gateway-nao-configurado"
  | "gateway-indisponivel"
  | "gateway-nao-autorizado";

export type GeneratePopDraftProposalResult =
  | { ok: true; proposal: PopDraftProposal }
  | { ok: false; reason: GeneratePopDraftProposalFailureReason; message: string };

function rid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Erros já vêm classificados pelo adapter (`AiProviderError`); esta função só
 * os repassa e cobre o caso residual de um erro inesperado da orquestração.
 */
function classifyAiError(error: unknown): {
  reason: GeneratePopDraftProposalFailureReason;
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
    message: "Falha inesperada ao interpretar o documento com IA.",
  };
}

/** Converte o output validado da IA em uma proposta com ids próprios do servidor. */
function assembleProposal(
  sourceDocumentId: string,
  result: StructuredAiResult<AiProposalOutput>,
): PopDraftProposal {
  const output = result.object;
  const proposedSections: PopProposedSection[] = output.proposedSections.map((section) => ({
    id: rid("psec"),
    title: section.title,
    content: section.content,
    origin: section.origin,
    confidence: section.confidence,
    sourceElementIds: section.sourceElementIds,
  }));

  const idByTitle = new Map<string, string>();
  output.proposedSections.forEach((section, index) => {
    // Apenas correspondência exata de título; duplicatas mantêm a primeira.
    if (!idByTitle.has(section.title)) idByTitle.set(section.title, proposedSections[index]!.id);
  });

  const findings: PopDraftFinding[] = output.findings.map((finding) => {
    const relatedSectionId = finding.relatedSectionTitle
      ? idByTitle.get(finding.relatedSectionTitle)
      : undefined;
    return {
      id: rid("pfind"),
      type: finding.type,
      description: finding.description,
      ...(relatedSectionId ? { relatedSectionId } : {}),
      ...(finding.sourceElementIds ? { sourceElementIds: finding.sourceElementIds } : {}),
    };
  });

  return {
    id: rid("pdp"),
    sourceDocumentId,
    status: "proposto",
    proposedSections,
    findings,
    aiMeta: {
      model: result.model,
      provider: result.provider,
      processedAt: new Date().toISOString(),
      ...(result.requestId ? { gatewayRequestId: result.requestId } : {}),
    },
    createdAt: new Date().toISOString(),
  };
}

export const generatePopDraftProposal = createServerFn({ method: "POST" })
  .validator((input: unknown) => GenerateInput.parse(input))
  .handler(async ({ data }): Promise<GeneratePopDraftProposalResult> => {
    const { loadDocxStructureFromStorage } = await import("@/lib/pop-docx-source.server");
    const loaded = await loadDocxStructureFromStorage(
      data.sourceDocumentId,
      data.storageObjectPath,
    );
    if (!loaded.ok) return loaded;

    const { checkContextLimits, buildPopInterpretationPrompt } =
      await import("@/lib/pop-draft-proposal-prompt");

    // Limites verificados ANTES de gastar uma chamada de IA.
    const limits = checkContextLimits(loaded.structure.elements);
    if (!limits.ok) {
      return { ok: false, reason: "contexto-excedido", message: limits.reason };
    }

    const prompt = buildPopInterpretationPrompt(loaded.structure.elements);

    try {
      const { resolveAiProvider } = await import("@/lib/ai-provider.server");
      const { provider, model } = resolveAiProvider();

      const result = await provider.interpretStructured<AiProposalOutput>({
        model,
        schema: AiProposalOutputSchema,
        temperature: 0.2,
        messages: [
          { role: "system", content: prompt.system },
          { role: "user", content: prompt.user },
        ],
      });

      return {
        ok: true,
        proposal: assembleProposal(data.sourceDocumentId, result),
      };
    } catch (error) {
      // Nenhuma proposta parcial é montada ou devolvida em caso de falha.
      return { ok: false, ...classifyAiError(error) };
    }
  });
