import { useState } from "react";
import { PlayCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import type { WorkflowDoc } from "@/lib/workflow-store";
import { useGovernance, governanceHealth } from "@/lib/governance-store";
import { lifecycleStatusOf, publishedWorkflowVersion } from "@/lib/workflow-store";

/**
 * Build 012 — confirmação de início de execução.
 * Usa o Governance Engine existente apenas para leitura dos requisitos.
 */
export function StartWorkflowDialog({
  doc,
  open,
  onOpenChange,
  onConfirm,
}: {
  doc: WorkflowDoc;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  const governance = useGovernance({
    objectId: doc.id,
    kind: "workflow",
    name: doc.name,
    owner: doc.owner,
    status: lifecycleStatusOf(doc),
    updatedAt: doc.savedAt,
  });
  const health = governanceHealth(governance);
  const version = publishedWorkflowVersion(doc);
  const content = version?.content;

  const rows: Array<[string, string]> = [
    ["Workflow", doc.name],
    ["Processo", content?.processName ?? "Informação indisponível"],
    ["Versão", content && version ? `V${version.number}` : "Informação indisponível"],
    ["Responsável", doc.owner || "—"],
    ["Etapas executáveis", content ? String(content.steps.length) : "—"],
    ["Participantes", content ? String(content.participants.length) : "—"],
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Iniciar execução</DialogTitle>
          <DialogDescription>
            Uma nova instância será criada a partir da versão publicada. A definição
            permanece inalterada.
          </DialogDescription>
        </DialogHeader>

        <dl className="space-y-2 rounded-xl border bg-surface/40 p-4">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-start justify-between gap-4">
              <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {label}
              </dt>
              <dd className="text-right text-xs font-medium">{value}</dd>
            </div>
          ))}
          <div className="flex items-start justify-between gap-4 pt-1">
            <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Governança
            </dt>
            <dd className="text-right">
              <Pill
                tone={
                  health.score >= 70
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                }
                size="sm"
                shape="full"
              >
                {health.score}% de conformidade
              </Pill>
            </dd>
          </div>
        </dl>

        <p className="text-sm">Confirma o início desta execução?</p>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button size="sm" onClick={onConfirm} disabled={!content}>
            <PlayCircle className="mr-1.5 h-4 w-4" />
            Iniciar Workflow
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function useDialogState(initial = false) {
  return useState(initial);
}
