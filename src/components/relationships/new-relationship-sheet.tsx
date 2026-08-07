import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  IMPACT_LEVELS,
  OBJECT_CATALOG,
  OBJECT_TYPE_LIST,
  RELATIONSHIP_KINDS,
  type ImpactLevel,
  type RelatedObjectType,
  type RelationshipKind,
} from "@/config/relationship-model";
import { addRelationship } from "@/lib/relationship-store";
import { ObjectTypeIcon } from "./relationship-badges";

/**
 * Build 005 — painel lateral para criar um novo relacionamento.
 * Segue o princípio "preferir painel lateral a criar nova página".
 */

export function NewRelationshipSheet({
  sourceId,
  sourceName,
  open,
  onOpenChange,
}: {
  sourceId: string;
  sourceName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [type, setType] = useState<RelatedObjectType>("Norma");
  const [targetId, setTargetId] = useState("");
  const [kind, setKind] = useState<RelationshipKind>("Está relacionado");
  const [impact, setImpact] = useState<ImpactLevel>("médio");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");

  const options = useMemo(
    () => OBJECT_CATALOG.filter((o) => o.type === type),
    [type],
  );

  const reset = () => {
    setTargetId("");
    setDescription("");
    setNotes("");
  };

  const submit = () => {
    const target = OBJECT_CATALOG.find((o) => o.id === targetId);
    if (!target) {
      toast("Selecione o objeto relacionado");
      return;
    }
    addRelationship(sourceId, {
      targetId: target.id,
      targetName: target.name,
      targetType: target.type,
      kind,
      description: description.trim(),
      notes: notes.trim(),
      impact,
    });
    toast.success("Relacionamento criado", {
      description: `${sourceName} → ${kind} → ${target.name}`,
    });
    reset();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Novo relacionamento</SheetTitle>
          <SheetDescription>
            Conecte <span className="text-foreground">{sourceName}</span> a outro
            ativo da plataforma.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 px-4 pb-6">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Tipo de objeto</Label>
            <Select
              value={type}
              onValueChange={(v) => {
                setType(v as RelatedObjectType);
                setTargetId("");
              }}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OBJECT_TYPE_LIST.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Objeto</Label>
            {options.length === 0 ? (
              <p className="rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">
                Nenhum objeto simulado deste tipo nesta build.
              </p>
            ) : (
              <div className="space-y-1.5">
                {options.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setTargetId(o.id)}
                    className={
                      "flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors " +
                      (targetId === o.id
                        ? "border-primary/50 bg-primary/5"
                        : "hover:border-border-strong hover:bg-muted/50")
                    }
                  >
                    <ObjectTypeIcon type={o.type} />
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-medium">
                        {o.name}
                      </span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {o.detail}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Tipo de relacionamento
              </Label>
              <Select value={kind} onValueChange={(v) => setKind(v as RelationshipKind)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RELATIONSHIP_KINDS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {k}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Grau de impacto</Label>
              <Select value={impact} onValueChange={(v) => setImpact(v as ImpactLevel)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {IMPACT_LEVELS.map((i) => (
                    <SelectItem key={i} value={i} className="capitalize">
                      {i}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Descrição</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Como estes objetos se relacionam"
              className="h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Observações</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas internas sobre este vínculo"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={submit}>
              Criar relacionamento
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
