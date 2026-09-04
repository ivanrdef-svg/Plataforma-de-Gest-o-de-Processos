import { useState } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KNOWLEDGE_CATEGORIES, type KnowledgeCategory } from "@/config/knowledge-demo";
import type { PopDoc, PopStatus } from "@/lib/pop-store";

/**
 * Build 004 — painel de metadados do POP.
 * Edição direta com salvamento automático local.
 */

const STATUS_OPTIONS: PopStatus[] = ["rascunho", "em revisão", "publicado"];

function TagField({
  label,
  values,
  placeholder,
  onChange,
}: {
  label: string;
  values: string[];
  placeholder: string;
  onChange: (values: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const value = draft.trim();
    if (!value || values.includes(value)) return setDraft("");
    onChange([...values, value]);
    setDraft("");
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</Label>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {values.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground"
            >
              {v}
              <button
                type="button"
                aria-label={`Remover ${v}`}
                onClick={() => onChange(values.filter((x) => x !== v))}
                className="transition-colors hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={add}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add();
          }
        }}
        placeholder={placeholder}
        className="h-8 text-xs"
      />
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</Label>
      <p className="text-xs text-foreground/90">{value}</p>
    </div>
  );
}

export function PopMetadataPanel({
  doc,
  onChange,
}: {
  doc: PopDoc;
  onChange: (patch: Partial<PopDoc>) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-medium">Metadados</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Alterações são salvas automaticamente.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Código do POP
        </Label>
        <Input
          value={doc.code}
          onChange={(e) => onChange({ code: e.target.value })}
          className="h-8 font-mono text-xs"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Categoria
        </Label>
        <Select
          value={doc.category}
          onValueChange={(v) => onChange({ category: v as KnowledgeCategory })}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {KNOWLEDGE_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c} className="text-xs">
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Status</Label>
        <Select value={doc.status} onValueChange={(v) => onChange({ status: v as PopStatus })}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s} className="text-xs">
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Versão</Label>
        <Input
          value={doc.version}
          onChange={(e) => onChange({ version: e.target.value })}
          className="h-8 text-xs"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Responsável
        </Label>
        <Input
          value={doc.owner}
          onChange={(e) => onChange({ owner: e.target.value })}
          className="h-8 text-xs"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <ReadOnlyField label="Criado em" value={doc.createdAt} />
        <ReadOnlyField label="Última revisão" value={doc.revisedAt} />
      </div>

      <TagField
        label="Tags"
        values={doc.tags}
        placeholder="Adicionar tag e pressionar Enter"
        onChange={(tags) => onChange({ tags })}
      />

      <TagField
        label="Palavras-chave"
        values={doc.keywords}
        placeholder="Adicionar palavra-chave"
        onChange={(keywords) => onChange({ keywords })}
      />
    </div>
  );
}
