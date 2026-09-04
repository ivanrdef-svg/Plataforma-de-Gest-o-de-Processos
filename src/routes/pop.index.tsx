import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { FileText, Loader2, Plus, Sparkles, Upload } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import { createPopDoc, usePopDocs, type PopDoc } from "@/lib/pop-store";
import { LifecycleBadge, LifecycleTrack } from "@/components/lifecycle/lifecycle-badge";
import { useLifecycleState } from "@/lib/lifecycle-store";
import {
  MAX_POP_SOURCE_DOCUMENT_SIZE_BYTES,
  uploadPopSourceDocument,
} from "@/lib/pop-documents.functions";
import {
  createPopSourceDocument,
  markPopSourceDocumentError,
  markPopSourceDocumentProcessing,
  markPopSourceDocumentReady,
  usePopSourceDocuments,
  type PopSourceDocumentStatus,
} from "@/lib/pop-source-document-store";
import { processPopSourceDocument } from "@/lib/pop-docx-parser.functions";

/** Build 009 — o card do POP mostra claramente o estágio do ciclo de vida. */
function PopCard({ doc }: { doc: PopDoc }) {
  const state = useLifecycleState({
    objectId: doc.id,
    kind: "pop",
    name: doc.name,
    owner: doc.owner,
    status: doc.status,
    updatedAt: doc.savedAt || doc.revisedAt,
  });

  return (
    <Link
      to="/pop/$popId"
      params={{ popId: doc.id }}
      className="rounded-xl border bg-card p-4 transition-colors hover:border-border-strong"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-mono text-[11px] text-muted-foreground">{doc.code}</p>
        <LifecycleBadge state={state} size="sm" />
      </div>
      <p className="mt-1 truncate text-sm font-medium">{doc.name}</p>
      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{doc.description}</p>
      <LifecycleTrack state={state} className="mt-3" />
      <p className="mt-3 text-[11px] text-muted-foreground">
        {doc.category} · {doc.version} · {doc.owner}
      </p>
    </Link>
  );
}

export const Route = createFileRoute("/pop/")({
  component: PopIndex,
  head: () => ({
    meta: [
      { title: "POPs — Process Platform" },
      {
        name: "description",
        content:
          "Procedimentos Operacionais Padrão estruturados: seções, metadados e relacionamentos.",
      },
      { property: "og:title", content: "POPs — Process Platform" },
      {
        property: "og:description",
        content: "Lista de Procedimentos Operacionais Padrão da plataforma.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Falha ao ler o arquivo."));
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.readAsDataURL(file);
  });
}

const STATUS_LABEL: Record<PopSourceDocumentStatus, string> = {
  enviado: "Enviado",
  processando: "Processando…",
  pronto: "Pronto",
  erro: "Erro",
};

/** Build 023/024/025 — documento original importado, estado e propostas de IA. */
function ImportedDocumentsSection() {
  const documents = usePopSourceDocuments();
  const interpret = useServerFn(generatePopDraftProposal);
  const [interpreting, setInterpreting] = useState<Set<string>>(new Set());

  const runInterpretation = async (sourceDocumentId: string, storageObjectPath: string) => {
    setInterpreting((prev) => new Set(prev).add(sourceDocumentId));
    try {
      const result = await interpret({ data: { sourceDocumentId, storageObjectPath } });
      if (result.ok) {
        createPopDraftProposal({ kind: "proposto", proposal: result.proposal });
        toast.success("Proposta gerada — aguardando revisão.");
      } else {
        createPopDraftProposal({
          kind: "erro",
          sourceDocumentId,
          errorMessage: result.message,
        });
        toast.error("Falha na interpretação", { description: result.message });
      }
    } catch {
      const message = "Não foi possível concluir a interpretação. Tente novamente.";
      createPopDraftProposal({ kind: "erro", sourceDocumentId, errorMessage: message });
      toast.error("Falha na interpretação", { description: message });
    } finally {
      setInterpreting((prev) => {
        const next = new Set(prev);
        next.delete(sourceDocumentId);
        return next;
      });
    }
  };

  if (documents.length === 0) return null;

  return (
    <div className="mt-10 rounded-xl border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground">Documentos importados</p>
      <ul className="mt-3 space-y-4">
        {documents.map((doc) => {
          const busy = interpreting.has(doc.id);
          return (
            <li key={doc.id} className="text-xs">
              <div className="flex items-center justify-between gap-3">
                <span className="truncate">{doc.originalFileName}</span>
                <span className="shrink-0 text-muted-foreground">
                  {new Date(doc.importedAt).toLocaleDateString("pt-BR")} ·{" "}
                  {STATUS_LABEL[doc.status]}
                </span>
              </div>
              {doc.status === "erro" && doc.errorMessage ? (
                <p className="mt-1 text-[11px] text-destructive">{doc.errorMessage}</p>
              ) : null}
              {doc.status === "pronto" && doc.parseSummary ? (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {doc.parseSummary.elementCount} elemento(s) estruturais identificados
                  {doc.parseSummary.warnings.length > 0
                    ? ` · ${doc.parseSummary.warnings.length} aviso(s)`
                    : ""}
                </p>
              ) : null}
              {doc.status === "pronto" ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 gap-1.5"
                  disabled={busy}
                  onClick={() => void runInterpretation(doc.id, doc.storageObjectPath)}
                >
                  {busy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  Interpretar com IA
                </Button>
              ) : null}
              <PopDraftProposalList sourceDocumentId={doc.id} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function PopIndex() {
  const docs = usePopDocs();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const upload = useServerFn(uploadPopSourceDocument);
  const process = useServerFn(processPopSourceDocument);

  const create = () => {
    const doc = createPopDoc();
    toast.success("Novo POP criado");
    void navigate({ to: "/pop/$popId", params: { popId: doc.id } });
  };

  /** Extração estrutural determinística — sem IA, sem criar POP. */
  const runProcessing = async (sourceDocumentId: string, storageObjectPath: string) => {
    markPopSourceDocumentProcessing(sourceDocumentId);
    try {
      const result = await process({ data: { sourceDocumentId, storageObjectPath } });
      if (result.ok) {
        markPopSourceDocumentReady(sourceDocumentId, {
          elementCount: result.structure.elements.length,
          warnings: result.structure.warnings,
          parsedAt: result.structure.parsedAt,
        });
      } else {
        markPopSourceDocumentError(sourceDocumentId, result.message);
      }
    } catch (error) {
      markPopSourceDocumentError(
        sourceDocumentId,
        error instanceof Error ? error.message : "Falha ao processar o documento.",
      );
    }
  };

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".docx")) {
      toast.error("Formato não suportado", {
        description: "Selecione um arquivo .docx.",
      });
      return;
    }
    if (file.size === 0) {
      toast.error("Arquivo vazio", {
        description: "O arquivo selecionado não possui conteúdo.",
      });
      return;
    }
    if (file.size > MAX_POP_SOURCE_DOCUMENT_SIZE_BYTES) {
      toast.error("Arquivo muito grande", {
        description: "O limite é de 10 MB por documento.",
      });
      return;
    }

    setUploading(true);
    try {
      const fileBase64 = await fileToBase64(file);
      const result = await upload({
        data: { originalFileName: file.name, fileBase64 },
      });
      createPopSourceDocument({
        id: result.sourceDocumentId,
        originalFileName: result.originalFileName,
        storageObjectPath: result.storageObjectPath,
        sizeBytes: file.size,
      });
      toast.success("Documento importado", {
        description: "Extraindo a estrutura do documento — o arquivo original fica preservado.",
      });
      void runProcessing(result.sourceDocumentId, result.storageObjectPath);
    } catch (error) {
      toast.error("Falha ao importar o documento", {
        description: error instanceof Error ? error.message : "Tente novamente.",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="px-6 py-10 md:px-10">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Procedimentos Operacionais Padrão
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cada POP é um objeto estruturado da plataforma.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept=".docx"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void handleFile(file);
            }}
          />
          <Button
            variant="outline"
            className="gap-1.5"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Importar de Word
          </Button>
          <Button className="gap-1.5" onClick={create}>
            <Plus className="h-4 w-4" />
            Novo POP
          </Button>
        </div>
      </div>

      {docs.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-5 w-5" />}
          title="Nenhum POP criado ainda"
          description="Crie o primeiro procedimento estruturado para começar."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {docs.map((doc) => (
            <PopCard key={doc.id} doc={doc} />
          ))}
        </div>
      )}

      <ImportedDocumentsSection />
    </div>
  );
}
