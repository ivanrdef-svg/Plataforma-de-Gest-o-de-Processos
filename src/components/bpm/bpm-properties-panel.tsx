import { MousePointerSquareDashed } from "lucide-react";
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
}: {
  node: BpmNode | null;
  processId: string;
  processName: string;
  onNotesChange: (notes: string) => void;
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
    node.kind === "start" ? "Evento de início" : node.kind === "end" ? "Evento de fim" : "Etapa";

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

      <ReadField label="Nome" value={node.name} />

      <div className="space-y-1">
        <Label className="text-[11px] text-muted-foreground">Descrição</Label>
        <Textarea
          value={node.description || "—"}
          readOnly
          className="min-h-[64px] resize-none bg-muted/40 text-xs"
        />
      </div>

      <ReadField label="Responsável" value={node.owner} />
      <ReadField label="Tempo estimado" value={node.duration} />

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
