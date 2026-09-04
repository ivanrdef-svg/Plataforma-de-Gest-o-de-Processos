/**
 * Build 026 — Etapa 4.1: bloco de seção da REVISÃO da proposta.
 *
 * Reaproveita a estrutura visual de `PopSectionBlock` (expandir/recolher,
 * título inline, textarea autosize) sem alterá-lo. Nenhuma regra de domínio
 * aqui: cada edição chama diretamente o mutador do store.
 */

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Pill } from "@/components/ui/pill";
import { Button } from "@/components/ui/button";
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
import type { PopProposedSection } from "@/config/pop-draft-proposal-model";

const ORIGIN_LABEL: Record<string, string> = {
  ia: "IA",
  documento: "Documento",
  manual: "Manual",
};

function AutoTextarea({
  value,
  onChange,
  placeholder,
  minRows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
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
      className="w-full resize-none bg-transparent text-sm leading-relaxed text-foreground/90 outline-none placeholder:text-muted-foreground/70"
    />
  );
}

function ProvenanceText({ section }: { section: PopProposedSection }) {
  if (!section.provenance) return null;
  const ids = section.provenance.sourceElementIds;
  if (ids.length === 0) {
    return (
      <p className="mt-1 text-[11px] text-muted-foreground">
        Fonte: Documento Word (sem elementos específicos)
      </p>
    );
  }
  return (
    <p className="mt-1 text-[11px] text-muted-foreground">
      Fonte: Documento Word · baseado em {ids.length} elemento(s) do documento
    </p>
  );
}

export function PopProposalSectionBlock({
  index,
  section,
  open,
  onToggle,
  onChange,
  onRemove,
}: {
  index: number;
  section: PopProposedSection;
  open: boolean;
  onToggle: () => void;
  onChange: (patch: { title?: string; content?: string }) => void;
  onRemove: () => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <section className="scroll-mt-24 rounded-xl border bg-card transition-colors hover:border-border-strong">
      <div className="flex items-start gap-3 px-4 py-3">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-label={open ? "Recolher seção" : "Expandir seção"}
          className="mt-0.5 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronDown className={cn("h-4 w-4 transition-transform", !open && "-rotate-90")} />
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
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Pill tone="bg-muted text-muted-foreground">
              {ORIGIN_LABEL[section.origin] ?? section.origin}
            </Pill>
            {section.confidence ? (
              <Pill tone="bg-muted text-muted-foreground">Confiança: {section.confidence}</Pill>
            ) : null}
            {section.humanEdited ? (
              <span className="text-[11px] text-muted-foreground">Editado por você</span>
            ) : null}
          </div>
          <ProvenanceText section={section} />
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Remover seção"
          onClick={() => setConfirmOpen(true)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {open && (
        <div className="space-y-4 border-t px-4 py-4 pl-14">
          <AutoTextarea
            value={section.content}
            onChange={(content) => onChange({ content })}
            placeholder="Escreva o conteúdo desta seção…"
          />
        </div>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover esta seção da revisão?</AlertDialogTitle>
            <AlertDialogDescription>
              A seção sai apenas da revisão. A proposta original gerada pela IA e o documento
              importado permanecem preservados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmOpen(false);
                onRemove();
              }}
            >
              Remover seção
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
