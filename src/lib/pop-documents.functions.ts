import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** Tamanho máximo aceito para o documento original de um POP (10 MB). */
export const MAX_POP_SOURCE_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024;

/** Bucket privado onde os documentos originais de POP são armazenados. */
export const POP_SOURCE_DOCUMENTS_BUCKET = "pop-source-documents";

/** Extensões aceitas para o documento original. */
export const ALLOWED_POP_SOURCE_DOCUMENT_EXTENSIONS = [".docx"] as const;

/** Duração da URL assinada (5 minutos). */
export const POP_SOURCE_DOCUMENT_SIGNED_URL_TTL_SECONDS = 300;

const DOCX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const UploadInput = z.object({
  originalFileName: z.string().min(1).max(255),
  /** Conteúdo do arquivo codificado em base64 (sem prefixo data:). */
  fileBase64: z.string().min(1),
});

const SignedUrlInput = z.object({
  storageObjectPath: z.string().min(1).max(512),
});

function sanitizeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? name;
  return base.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 200);
}

function decodeBase64(value: string): Uint8Array {
  const normalized = value.includes(",") && value.startsWith("data:")
    ? (value.split(",")[1] ?? "")
    : value;
  const binary = atob(normalized.replace(/\s+/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export const uploadPopSourceDocument = createServerFn({ method: "POST" })
  .validator((input: unknown) => UploadInput.parse(input))
  .handler(async ({ data }) => {
    const fileName = sanitizeFileName(data.originalFileName);
    const isAllowedExtension = ALLOWED_POP_SOURCE_DOCUMENT_EXTENSIONS.some((ext) =>
      fileName.toLowerCase().endsWith(ext),
    );
    if (!isAllowedExtension) {
      throw new Error("Formato inválido: apenas arquivos .docx são aceitos.");
    }

    let bytes: Uint8Array;
    try {
      bytes = decodeBase64(data.fileBase64);
    } catch {
      throw new Error("Conteúdo do arquivo inválido: falha ao decodificar base64.");
    }

    if (bytes.byteLength === 0) {
      throw new Error("Arquivo vazio.");
    }
    if (bytes.byteLength > MAX_POP_SOURCE_DOCUMENT_SIZE_BYTES) {
      throw new Error("Arquivo excede o limite de 10 MB.");
    }

    const sourceDocumentId = crypto.randomUUID();
    const storageObjectPath = `${sourceDocumentId}/${fileName}`;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.storage
      .from(POP_SOURCE_DOCUMENTS_BUCKET)
      .upload(storageObjectPath, bytes, {
        contentType: DOCX_MIME_TYPE,
        upsert: false,
      });

    if (error) {
      throw new Error(`Falha ao enviar o documento: ${error.message}`);
    }

    return { storageObjectPath, sourceDocumentId, originalFileName: fileName };
  });

export const getPopSourceDocumentUrl = createServerFn({ method: "POST" })
  .validator((input: unknown) => SignedUrlInput.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error } = await supabaseAdmin.storage
      .from(POP_SOURCE_DOCUMENTS_BUCKET)
      .createSignedUrl(data.storageObjectPath, POP_SOURCE_DOCUMENT_SIGNED_URL_TTL_SECONDS);

    if (error || !signed?.signedUrl) {
      throw new Error(
        `Falha ao gerar URL assinada: ${error?.message ?? "resposta inválida"}`,
      );
    }

    return {
      signedUrl: signed.signedUrl,
      expiresInSeconds: POP_SOURCE_DOCUMENT_SIGNED_URL_TTL_SECONDS,
    };
  });
