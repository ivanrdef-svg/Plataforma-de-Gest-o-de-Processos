/**
 * Build 026 — Etapa 4.1: workspace de revisão humana da proposta de POP.
 * A tela só orquestra mutadores existentes; nenhuma regra de domínio aqui.
 */

import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { FileSearch, Plus } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { WorkspaceLayout } from "@/components/workspace/workspace-layout";
import { PopProposalSectionBlock } from "@/components/pop/pop-proposal-section-block";
import { ConfirmPopProposalDialog } from "@/components/pop/confirm-pop-proposal-dialog";
import { popDraftFailureMessage } from "@/components/pop/pop-proposal-messages";
import {
  addReviewedSection,
  rejectPopDraftProposal,
  removeReviewedSection,
  updateReviewedSection,
  usePopDraftProposal,
} from "@/lib/pop-draft-proposal-store";
import { usePopSourceDocuments } from "@/lib/pop-source-document-store";
import type { PopDraftProposalStatus } from "@/config/pop-draft-proposal-model";

export const Route = createFileRoute("/pop/propostas/$proposalId")({
  component: ProposalReview,
  head: () => ({
    meta: [
      { title: "Revisão de proposta de POP — Process Platform" },
      {
        name: "description",
        content:
          "Revise seções interpretadas por IA a partir de um documento Word antes de criar o POP.",
      },
      { property: "og:title", content: "Revisão de proposta de POP" },
      {
        property: "og:description",
        content: "Revisão humana da proposta antes da criação do POP.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const STATUS_LABEL: Record<PopDraftProposalStatus, string> = {
  proposto: "Proposta gerada",
  "em revisão": "Em revisão",
  confirmado: "Confirmada",
  rejeitado: "Rejeitada",
  erro: "Falha na interpretação",
};

function ProposalReview() {
  const { proposalId } = Route.useParams();
  const navigate = useNavigate();
  const proposal = usePopDraftProposal(proposalId);
  const documents = usePopSourceDocuments();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);

  if (!proposal) {
    return (
      <div className="px-6 py-10 md:px-10">
        <EmptyState
          icon={<FileSearch className="h-5 w-5" />}
          title="Proposta não encontrada"
          description="Esta proposta não existe mais neste navegador. Volte ao centro de POPs."
        />
        <div className="mt-4">
          <Button variant="outline" onClick={() => void navigate({ to: "/pop" })}>
            Voltar para POPs
          </Button>
        </div>
      </div>
    );
  }

  const document = documents.find((d) => d.id === proposal.sourceDocumentId);
  const sourceFileName = document?.originalFileName ?? "Documento de origem indisponível";
  const importedAt = document?.importedAt
    ? new Date(document.importedAt).toLocaleDateString("pt-BR")
    : null;
  const sections = proposal.reviewedSections ?? [];
  const editable = proposal.status === "em revisão";
  const sectionCount = editable ? sections.length : proposal.proposedSections.length;
  const suggestedName = document?.originalFileName
    ? document.originalFileName.replace(/\.docx$/i, "")
    : "POP importado";

  const apply = (result: { ok: boolean; reason?: string }) => {
    if (!result.ok && result.reason) {
      toast.error(popDraftFailureMessage(result.reason as never));
    }
  };

  const onReject = () => {
    const result = rejectPopDraftProposal(proposal.id);
    setRejectOpen(false);
    if (!result.ok) {
      toast.error("Não foi possível rejeitar", {
        description: popDraftFailureMessage(result.reason),
      });
      return;
    }
    toast.success("Proposta rejeitada. O documento original foi preservado.");
    void navigate({ to: "/pop" });
  };

  return (
    <WorkspaceLayout
      title="Revisão de proposta de POP"
      subtitle={sourceFileName}
      meta={
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Pill tone="bg-muted text-muted-foreground">{STATUS_LABEL[proposal.status]}</Pill>
          {importedAt ? <span>Importado em {importedAt}</span> : null}
          <span>· {sectionCount} seção(ões)</span>
          {proposal.aiMeta?.provider ? <span>· {proposal.aiMeta.provider}</span> : null}
          {proposal.aiMeta?.model ? <span>· {proposal.aiMeta.model}</span> : null}
        </div>
      }
      actions={
        editable ? (
          <>
            <Button variant="outline" onClick={() => setRejectOpen(true)}>
              Rejeitar
            </Button>
            <Button onClick={() => setConfirmOpen(true)}>Confirmar POP</Button>
          </>
        ) : (
          <Button variant="outline" onClick={() => void navigate({ to: "/pop" })}>
            Voltar para POPs
          </Button>
        )
      }
    >
      <div className="mx-auto max-w-3xl">
        <div className="rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          Esta proposta foi interpretada por IA a partir de um documento Word. Revise o conteúdo
          antes de confirmar a criação do POP.
        </div>

        {!editable ? (
          <div className="mt-6 rounded-xl border bg-card p-4 text-sm">
            <p className="font-medium">{STATUS_LABEL[proposal.status]}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Esta proposta não está em revisão, portanto é exibida apenas para consulta.
            </p>
            {proposal.status === "confirmado" && proposal.confirmedPopId ? (
              <Link
                to="/pop/$popId"
                params={{ popId: proposal.confirmedPopId }}
                className="mt-3 inline-block text-xs underline underline-offset-2"
              >
                Ver o POP criado
              </Link>
            ) : null}
            {proposal.status === "erro" && proposal.errorMessage ? (
              <p className="mt-3 text-xs text-destructive">{proposal.errorMessage}</p>
            ) : null}
          </div>
        ) : (
          <>
            <div className="mt-6 space-y-3">
              {sections.map((section, index) => (
                <PopProposalSectionBlock
                  key={section.id}
                  index={index}
                  section={section}
                  open={openSections[section.id] ?? true}
                  onToggle={() =>
                    setOpenSections((prev) => ({
                      ...prev,
                      [section.id]: !(prev[section.id] ?? true),
                    }))
                  }
                  onChange={(patch) => apply(updateReviewedSection(proposal.id, section.id, patch))}
                  onRemove={() => apply(removeReviewedSection(proposal.id, section.id))}
                />
              ))}
            </div>

            <Button
              variant="outline"
              className="mt-4 gap-1.5"
              onClick={() =>
                apply(addReviewedSection(proposal.id, { title: "Nova seção", content: "" }))
              }
            >
              <Plus className="h-4 w-4" />
              Adicionar seção
            </Button>
          </>
        )}
      </div>

      {editable ? (
        <>
          <ConfirmPopProposalDialog
            proposalId={proposal.id}
            suggestedName={suggestedName}
            sourceFileName={sourceFileName}
            sectionCount={sections.length}
            statusLabel={STATUS_LABEL[proposal.status]}
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
          />

          <AlertDialog open={rejectOpen} onOpenChange={setRejectOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Rejeitar esta proposta?</AlertDialogTitle>
                <AlertDialogDescription>
                  A proposta será marcada como rejeitada e não se tornará um POP. O documento
                  original é preservado.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={onReject}>Rejeitar proposta</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      ) : null}
    </WorkspaceLayout>
  );
}
