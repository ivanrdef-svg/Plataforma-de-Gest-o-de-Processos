/**
 * Build 024 — Etapa 2: processamento server-side do documento original.
 *
 * Mesmo padrão de pop-documents.functions.ts: createServerFn + zod +
 * import dinâmico do módulo server-only dentro do handler.
 * Sem IA: apenas extração estrutural determinística.
 *
 * Build 025: a lógica de download + parse passou a viver em
 * `pop-docx-source.server.ts`, compartilhada com a interpretação por IA.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { DocxDocumentStructure } from "@/config/docx-structure-model";

const ProcessInput = z.object({
  sourceDocumentId: z.string().min(1),
  storageObjectPath: z.string().min(1).max(512),
});

export type ProcessPopSourceDocumentResult =
  | { ok: true; structure: DocxDocumentStructure }
  | { ok: false; reason: "documento-invalido" | "storage" | "desconhecido"; message: string };

export const processPopSourceDocument = createServerFn({ method: "POST" })
  .validator((input: unknown) => ProcessInput.parse(input))
  .handler(async ({ data }): Promise<ProcessPopSourceDocumentResult> => {
    const { loadDocxStructureFromStorage } = await import("@/lib/pop-docx-source.server");
    return loadDocxStructureFromStorage(data.sourceDocumentId, data.storageObjectPath);
  });
