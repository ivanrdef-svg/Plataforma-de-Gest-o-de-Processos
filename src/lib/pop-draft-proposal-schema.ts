/**
 * Build 025 — Etapa 1: schema estrito do output cru da IA + parsing puro.
 *
 * A validação server-side é obrigatória independentemente de o gateway
 * garantir ou não o formato: o schema é a única fonte de verdade do contrato.
 * Sem I/O, sem React, sem chamada de IA.
 */

import { z } from "zod";

export const AiProposedSectionSchema = z.object({
  title: z.string().min(1),
  content: z.string(),
  origin: z.enum(["documento", "ia"]),
  confidence: z.enum(["alta", "média", "baixa"]),
  sourceElementIds: z.array(z.string()),
});

export const AiFindingSchema = z.object({
  type: z.enum(["lacuna", "ambiguidade"]),
  description: z.string().min(1),
  relatedSectionTitle: z.string().optional(),
  sourceElementIds: z.array(z.string()).optional(),
});

export const AiProposalOutputSchema = z.object({
  proposedSections: z.array(AiProposedSectionSchema).min(0),
  findings: z.array(AiFindingSchema).min(0),
});

export type AiProposedSection = z.infer<typeof AiProposedSectionSchema>;
export type AiFinding = z.infer<typeof AiFindingSchema>;
export type AiProposalOutput = z.infer<typeof AiProposalOutputSchema>;

export type ParseAiProposalOutputResult =
  { ok: true; data: AiProposalOutput } | { ok: false; error: string };

/** Remove cercas de bloco de código, caso o modelo desobedeça a instrução. */
function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const match = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  return match ? match[1]!.trim() : trimmed;
}

function describeIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "(raiz)";
      return `${path}: ${issue.message}`;
    })
    .join("; ");
}

/**
 * Converte a resposta crua da IA em um output validado.
 * Nunca lança exceção — sempre retorna o discriminador `ok`.
 */
export function parseAiProposalOutput(raw: unknown): ParseAiProposalOutputResult {
  let candidate: unknown = raw;

  if (typeof candidate === "string") {
    const text = stripCodeFence(candidate);
    if (text.length === 0) {
      return { ok: false, error: "A resposta da IA veio vazia." };
    }
    try {
      candidate = JSON.parse(text);
    } catch {
      return {
        ok: false,
        error: "A resposta da IA não é um JSON válido.",
      };
    }
  }

  if (candidate === null || typeof candidate !== "object" || Array.isArray(candidate)) {
    return {
      ok: false,
      error: "A resposta da IA não é um objeto JSON no formato esperado.",
    };
  }

  const result = AiProposalOutputSchema.safeParse(candidate);
  if (!result.success) {
    return {
      ok: false,
      error: `A resposta da IA não respeita o formato exigido — ${describeIssues(result.error)}.`,
    };
  }

  return { ok: true, data: result.data };
}
