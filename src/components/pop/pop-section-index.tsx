import { cn } from "@/lib/utils";
import type { PopSection } from "@/lib/pop-store";

/**
 * Build 004 — índice lateral das seções do POP.
 * Clicar navega até a seção correspondente.
 */
export function PopSectionIndex({
  sections,
  activeId,
  onSelect,
}: {
  sections: PopSection[];
  activeId?: string;
  onSelect: (id: string) => void;
}) {
  return (
    <nav aria-label="Seções do POP" className="space-y-0.5">
      <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground/80">
        Índice
      </p>
      {sections.map((s, i) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onSelect(s.id)}
          className={cn(
            "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
            activeId === s.id
              ? "bg-muted font-medium text-foreground"
              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
          )}
        >
          <span className="tabular-nums text-[10px] text-muted-foreground/70">
            {String(i + 1).padStart(2, "0")}
          </span>
          <span className="truncate">{s.title}</span>
        </button>
      ))}
    </nav>
  );
}
