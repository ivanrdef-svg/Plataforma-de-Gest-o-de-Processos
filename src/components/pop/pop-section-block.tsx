import { useEffect, useRef } from "react";
import { ChevronDown, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import type { PopSection } from "@/lib/pop-store";

/**
 * Build 004 — bloco de seção do POP.
 * Cada seção é independente: expande/recolhe e edita título, conteúdo
 * e observações. Autoria estilo Notion/Confluence, sem cara de Word.
 */

function AutoTextarea({
  value,
  onChange,
  placeholder,
  className,
  minRows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  minRows?: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      rows={minRows}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "w-full resize-none bg-transparent text-sm leading-relaxed text-foreground/90 outline-none placeholder:text-muted-foreground/70",
        className,
      )}
    />
  );
}

export function PopSectionBlock({
  index,
  section,
  open,
  onToggle,
  onChange,
}: {
  index: number;
  section: PopSection;
  open: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<PopSection>) => void;
}) {
  return (
    <section
      id={`pop-section-${section.id}`}
      className="scroll-mt-24 rounded-xl border bg-card transition-colors hover:border-border-strong"
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-label={open ? "Recolher seção" : "Expandir seção"}
          className="mt-0.5 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronDown
            className={cn("h-4 w-4 transition-transform", !open && "-rotate-90")}
          />
        </button>
        <span className="mt-1 text-[11px] tabular-nums text-muted-foreground/70">
          {String(index + 1).padStart(2, "0")}
        </span>
        <div className="min-w-0 flex-1">
          <input
            value={section.title}
            onChange={(e) => onChange({ title: e.target.value })}
            className="w-full bg-transparent text-sm font-medium tracking-tight outline-none"
            aria-label="Título da seção"
          />
          {section.hint && (
            <p className="mt-0.5 text-[11px] text-muted-foreground">{section.hint}</p>
          )}
        </div>
      </div>

      {open && (
        <div className="space-y-4 border-t px-4 py-4 pl-14">
          <AutoTextarea
            value={section.content}
            onChange={(content) => onChange({ content })}
            placeholder="Escreva o conteúdo desta seção…"
          />

          <div className="rounded-lg bg-surface/70 px-3 py-2">
            <Label className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
              <MessageSquare className="h-3 w-3" />
              Observações
            </Label>
            <AutoTextarea
              minRows={1}
              value={section.notes}
              onChange={(notes) => onChange({ notes })}
              placeholder="Notas internas, exceções, lembretes…"
              className="mt-1 text-xs"
            />
          </div>
        </div>
      )}
    </section>
  );
}
