import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { FileText, Loader2, Plus, Upload } from "lucide-react";
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
  usePopSourceDocuments,
} from "@/lib/pop-source-document-store";


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
      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
        {doc.description}
      </p>
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

function PopIndex() {
  const docs = usePopDocs();
  const navigate = useNavigate();

  const create = () => {
    const doc = createPopDoc();
    toast.success("Novo POP criado");
    void navigate({ to: "/pop/$popId", params: { popId: doc.id } });
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
        <Button className="gap-1.5" onClick={create}>
          <Plus className="h-4 w-4" />
          Novo POP
        </Button>
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
    </div>
  );
}
