/**
 * Build 025 — Etapa 2: leitura + parsing do documento original, compartilhados
 * entre `pop-docx-parser.functions.ts` e `pop-draft-proposal.functions.ts`.
 *
 * Módulo server-only (sufixo `.server`): nunca entra no bundle do cliente.
 */

import { POP_SOURCE_DOCUMENTS_BUCKET } from "@/lib/pop-documents.functions";
import { DocxSourceError, type DocxDocumentStructure } from "@/config/docx-structure-model";
import { parseDocxStructure } from "@/lib/docx-parser";

export type LoadDocxStructureResult =
  | { ok: true; structure: DocxDocumentStructure }
  | { ok: false; reason: "documento-invalido" | "storage" | "desconhecido"; message: string };

/** Baixa o .docx do bucket privado e devolve a estrutura determinística. */
export async function loadDocxStructureFromStorage(
  sourceDocumentId: string,
  storageObjectPath: string,
): Promise<LoadDocxStructureResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  let bytes: Uint8Array;
  try {
    const { data: file, error } = await supabaseAdmin.storage
      .from(POP_SOURCE_DOCUMENTS_BUCKET)
      .download(storageObjectPath);

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

  try {
    const structure = await parseDocxStructure(bytes, sourceDocumentId);
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
}
