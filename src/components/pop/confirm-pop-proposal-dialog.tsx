/**
 * Build 026 — Etapa 4.1: diálogo de confirmação da proposta.
 * Só orquestra `confirmPopDraftProposal` — nenhuma regra de domínio aqui.
 */

import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { confirmPopDraftProposal } from "@/lib/pop-draft-proposal-store";
import { popDraftFailureMessage } from "@/components/pop/pop-proposal-messages";

export function ConfirmPopProposalDialog({
  proposalId,
  suggestedName,
  sourceFileName,
  sectionCount,
  statusLabel,
  open,
  onOpenChange,
}: {
  proposalId: string;
  suggestedName: string;
  sourceFileName: string;
  sectionCount: number;
  statusLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const [name, setName] = useState(suggestedName);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setName(suggestedName);
      setBusy(false);
    }
  }, [open, suggestedName]);

  const onConfirm = () => {
    setBusy(true);
    const result = confirmPopDraftProposal(proposalId, { name });
    if (!result.ok) {
      setBusy(false);
      toast.error("Não foi possível confirmar", {
        description: popDraftFailureMessage(result.reason),
      });
      return;
    }
    onOpenChange(false);
    toast.success("POP criado com sucesso.");
    void navigate({
      to: "/pop/$popId",
      params: { popId: result.proposal.confirmedPopId! },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar criação do POP</DialogTitle>
          <DialogDescription>
            Um novo POP será criado em rascunho a partir desta revisão. Nada é publicado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
            <p>Documento de origem: {sourceFileName}</p>
            <p className="mt-1">{sectionCount} seção(ões) na revisão</p>
            <p className="mt-1">Status atual: {statusLabel}</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pop-name">Nome do POP</Label>
            <Input
              id="pop-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="POP importado"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={busy} onClick={onConfirm}>
            Confirmar criação do POP
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
