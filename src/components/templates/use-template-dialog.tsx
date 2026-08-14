/**
 * Build 019 — Etapa 3: diálogo único de "Usar Template".
 *
 * Reaproveitado tanto no Template Center quanto no Template Detail. O
 * resultado é sempre um Workflow novo e independente, em V1 Rascunho, que
 * segue o fluxo normal (Validation → Publication → Runtime).
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
import { Textarea } from "@/components/ui/textarea";
import { Pill } from "@/components/ui/pill";
import {
  createWorkflowFromTemplate,
  type WorkflowTemplate,
} from "@/lib/template-store";

export function UseTemplateDialog({
  template,
  open,
  onOpenChange,
}: {
  template: WorkflowTemplate;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const [name, setName] = useState(template.name);
  const [description, setDescription] = useState(template.description);
  const [area, setArea] = useState("");
  const [owner, setOwner] = useState("");

  useEffect(() => {
    if (open) {
      setName(template.name);
      setDescription(template.description);
      setArea("");
      setOwner("");
    }
  }, [open, template.name, template.description]);

  const onConfirm = () => {
    const result = createWorkflowFromTemplate(template.id, {
      name,
      description,
      area,
      owner,
    });
    if (!result.ok) {
      toast.error(
        result.reason === "not-active"
          ? "Template indisponível"
          : "Template não encontrado",
        {
          description:
            result.reason === "not-active"
              ? "Somente templates ativos podem originar novos workflows."
              : "Atualize a lista de templates e tente novamente.",
        },
      );
      return;
    }
    onOpenChange(false);
    toast.success("Workflow criado", {
      description: `${result.doc.name} nasceu como V1 Rascunho, independente do template.`,
    });
    navigate({
      to: "/workflow/$workflowId",
      params: { workflowId: result.doc.id },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Usar template</DialogTitle>
          <DialogDescription>
            O novo Workflow será criado como uma cópia independente deste
            Template.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">{template.name}</p>
          <p className="mt-1">
            {template.sourceWorkflowId
              ? `Origem: workflow ${template.sourceWorkflowId.slice(0, 8)} · versão V${template.sourceWorkflowVersion ?? "—"}`
              : "Origem não registrada"}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Pill tone="bg-muted text-muted-foreground" size="sm">
              {template.content.steps.length} etapas
            </Pill>
            <Pill tone="bg-primary/10 text-primary" size="sm" shape="full">
              Resultado: V1 Rascunho
            </Pill>
          </div>
        </div>

        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="use-tpl-name">Nome do novo workflow</Label>
            <Input
              id="use-tpl-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="use-tpl-description">Descrição</Label>
            <Textarea
              id="use-tpl-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="use-tpl-area">Área</Label>
              <Input
                id="use-tpl-area"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="Ex.: Operações"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="use-tpl-owner">Responsável</Label>
              <Input
                id="use-tpl-owner"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                placeholder="Ex.: Ana Souza"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={onConfirm} disabled={!name.trim()}>
            Criar workflow
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
