/**
 * Build 024 — Etapa 2: processamento server-side do documento original.
 *
 * Mesmo padrão de pop-documents.functions.ts: createServerFn + zod +
 * import dinâmico do client privilegiado dentro do handler.
 * Sem IA: apenas extração estrutural determinística.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { POP_SOURCE_DOCUMENTS_BUCKET } from "@/lib/pop-documents.functions";
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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let bytes: Uint8Array;
    try {
      const { data: file, error } = await supabaseAdmin.storage
        .from(POP_SOURCE_DOCUMENTS_BUCKET)
        .download(data.storageObjectPath);

      if (error || !file) {
        return {
          ok: false,
          reason: "storage",
          message: `Não foi possível recuperar o documento do armazenamento: ${
            error?.message ?? "arquivo não encontrado"
          }`,
        };
      }
      bytes = new Uint8Array(await file.arrayBuffer());
    } catch (error) {
      return {
        ok: false,
        reason: "storage",
        message: `Falha de comunicação com o armazenamento: ${
          error instanceof Error ? error.message : "erro desconhecido"
        }`,
      };
    }

    const { parseDocxStructure } = await import("@/lib/docx-parser");
    const { DocxSourceError } = await import("@/config/docx-structure-model");

    try {
      const structure = await parseDocxStructure(bytes, data.sourceDocumentId);
      return { ok: true, structure };
    } catch (error) {
      if (error instanceof DocxSourceError) {
        return { ok: false, reason: "documento-invalido", message: error.message };
      }
      return {
        ok: false,
        reason: "desconhecido",
        message: `Falha inesperada ao processar o documento: ${
          error instanceof Error ? error.message : "erro desconhecido"
        }`,
      };
    }
  });
