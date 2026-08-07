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
import {
  PROCESS_CATEGORIES,
  PROCESS_STATUS_OPTIONS,
  type ProcessCategory,
  type ProcessDoc,
  type ProcessStatus,
} from "@/lib/process-store";

/**
 * Build 006 — painel de propriedades do Processo.
 * Edição direta com salvamento automático local (mesmo padrão do POP).
 */

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
      <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
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

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 text-xs"
      />
    </div>
  );
}

export function ProcessMetadataPanel({
  doc,
  onChange,
}: {
  doc: ProcessDoc;
  onChange: (patch: Partial<ProcessDoc>) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
        Propriedades
      </p>

      <div className="space-y-1.5">
        <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Código
        </Label>
        <p className="rounded-md bg-muted px-2 py-1.5 font-mono text-xs text-muted-foreground">
          {doc.code}
        </p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Categoria
        </Label>
        <Select
          value={doc.category}
          onValueChange={(v) => onChange({ category: v as ProcessCategory })}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PROCESS_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c} className="text-xs">
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Status
        </Label>
        <Select
          value={doc.status}
          onValueChange={(v) => onChange({ status: v as ProcessStatus })}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PROCESS_STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s} className="text-xs">
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <TextField
        label="Versão"
        value={doc.version}
        onChange={(version) => onChange({ version })}
      />
      <TextField
        label="Responsável"
        value={doc.owner}
        onChange={(owner) => onChange({ owner })}
      />
      <TextField label="Área" value={doc.area} onChange={(area) => onChange({ area })} />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Criado em
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{doc.createdAt}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Última revisão
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{doc.revisedAt}</p>
        </div>
      </div>

      <TagField
        label="Tags"
        values={doc.tags}
        placeholder="Adicionar tag…"
        onChange={(tags) => onChange({ tags })}
      />
      <TagField
        label="Palavras-chave"
        values={doc.keywords}
        placeholder="Adicionar palavra-chave…"
        onChange={(keywords) => onChange({ keywords })}
      />

      <div className="space-y-1.5">
        <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Descrição
        </Label>
        <textarea
          value={doc.description}
          onChange={(e) => onChange({ description: e.target.value })}
          rows={3}
          className="w-full resize-none rounded-md border bg-background px-2 py-1.5 text-xs leading-relaxed outline-none focus:border-border-strong"
        />
      </div>
    </div>
  );
}
