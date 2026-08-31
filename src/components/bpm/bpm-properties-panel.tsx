import { AlertTriangle, MousePointerSquareDashed } from "lucide-react";
import {
  ObjectTypeIcon,
  RelationshipIndicators,
} from "@/components/relationships/relationship-badges";
import { summarize, useRelationships } from "@/lib/relationship-store";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import type { BpmNode } from "@/config/bpm-model";
import { getStepType } from "@/config/process-model";

/**
 * Build 007 — Painel direito do BPM Designer.
 *
 * Mostra as propriedades do elemento selecionado. Nome, descrição,
 * responsável e tempo estimado vêm do Processo (somente leitura no diagrama);
 * as observações são refinamentos do desenho.
 */

function ReadField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      <Input value={value || "—"} readOnly className="h-8 bg-muted/40 text-xs" />
    </div>
  );
}

export function BpmPropertiesPanel({
  node,
  processId,
  processName,
  onNotesChange,
  onPropertyChange,
  onDelete,
}: {
  node: BpmNode | null;
  processId: string;
  processName: string;
  onNotesChange: (notes: string) => void;
  /** Build 020 — edição editorial das propriedades do elemento. */
  onPropertyChange?: (patch: Partial<BpmNode>) => void;
  onDelete?: () => void;
}) {
  if (!node) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-4 py-10 text-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <MousePointerSquareDashed className="h-4 w-4" />
        </span>
        <p className="mt-3 text-xs font-medium">Nenhum elemento selecionado</p>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
          Selecione um elemento do diagrama para ver suas propriedades.
        </p>
      </div>
    );
  }

  const kindLabel =
    node.kind === "start"
      ? "Evento de início"
      : node.kind === "end"
        ? "Evento de fim"
        : node.kind === "gateway"
          ? "Decisão"
          : node.kind === "approval"
            ? "Aprovação"
            : getStepType(node.stepType).label;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {kindLabel}
        </p>
        <h3 className="mt-0.5 text-sm font-medium leading-snug">{node.name}</h3>
        {node.stepId && (
          <p className="mt-1 text-[11px] text-muted-foreground">
            Origem: etapa do processo {processName}
          </p>
        )}
      </div>

      <div className="space-y-1">
        <Label className="text-[11px] text-muted-foreground">Nome</Label>
        <Input
          value={node.name}
          onChange={(e) => onPropertyChange?.({ name: e.target.value })}
          readOnly={!onPropertyChange}
          className="h-8 text-xs"
        />
      </div>

      <div className="space-y-1">
        <Label className="text-[11px] text-muted-foreground">Descrição</Label>
        <Textarea
          value={node.description ?? ""}
          onChange={(e) => onPropertyChange?.({ description: e.target.value })}
          readOnly={!onPropertyChange}
          className="min-h-[64px] resize-none text-xs"
        />
      </div>

      <div className="space-y-1">
        <Label className="text-[11px] text-muted-foreground">Responsável</Label>
        <Input
          value={node.owner ?? ""}
          onChange={(e) => onPropertyChange?.({ owner: e.target.value })}
          readOnly={!onPropertyChange}
          className="h-8 text-xs"
        />
      </div>

      <ReadField label="Entradas" value={node.inputs ?? ""} />
      <ReadField label="Saídas" value={node.outputs ?? ""} />
      <ReadField label="Tempo estimado" value={node.duration} />


      {!!node.issues?.length && (
        <div className="space-y-1.5 rounded-lg border border-dashed bg-muted/30 p-2">
          <Label className="text-[11px] text-muted-foreground">
            Consistência do elemento
          </Label>
          <ul className="space-y-1">
            {node.issues.map((issue) => (
              <li
                key={issue.id}
                className="flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground"
              >
                <AlertTriangle
                  className={
                    issue.severity === "erro"
                      ? "mt-[2px] h-3 w-3 shrink-0 text-destructive"
                      : "mt-[2px] h-3 w-3 shrink-0 text-amber-600 dark:text-amber-400"
                  }
                />
                <span>{issue.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Separator />

      <div className="space-y-2">
        <Label className="text-[11px] text-muted-foreground">Relacionamentos</Label>
        <CompactRelationships objectId={processId} />
      </div>

      <Separator />

      <div className="space-y-1">
        <Label className="text-[11px] text-muted-foreground">Observações</Label>
        <Textarea
          value={node.notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Anotações de modelagem para este elemento…"
          className="min-h-[80px] resize-none text-xs"
        />
      </div>
    </div>
  );
}

/** Lista compacta de relacionamentos — cabe na largura do painel direito. */
function CompactRelationships({ objectId }: { objectId: string }) {
  const items = useRelationships(objectId);
  const stats = summarize(items);

  if (!items.length) {
    return (
      <p className="text-[11px] text-muted-foreground/80">
        Nenhum vínculo registrado para este processo.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <RelationshipIndicators stats={stats} />
      <ul className="space-y-1">
        {items.slice(0, 5).map((rel) => (
          <li
            key={rel.id}
            className="flex items-center gap-2 rounded-md border bg-background px-2 py-1.5"
          >
            <ObjectTypeIcon type={rel.targetType} />
            <span className="min-w-0 flex-1 truncate text-[11px]">
              {rel.targetName}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
