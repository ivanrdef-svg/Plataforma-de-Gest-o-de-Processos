import { useCallback, useEffect, useRef, useState } from "react";
import {
  GripVertical,
  Heading1,
  Heading2,
  List,
  Minus,
  Plus,
  Quote,
  Table as TableIcon,
  Trash2,
  Type,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  createBlockId,
  type KnowledgeBlock,
  type KnowledgeBlockType,
} from "@/config/knowledge-templates";

/**
 * Build 003 — editor de blocos (estilo Notion).
 * Somente edição de conteúdo; sem colaboração e sem versionamento.
 */

const BLOCK_MENU: { type: KnowledgeBlockType; label: string; icon: typeof Type }[] = [
  { type: "title", label: "Título", icon: Heading1 },
  { type: "subtitle", label: "Subtítulo", icon: Heading2 },
  { type: "text", label: "Texto", icon: Type },
  { type: "list", label: "Lista", icon: List },
  { type: "table", label: "Tabela simples", icon: TableIcon },
  { type: "callout", label: "Caixa de destaque", icon: Quote },
  { type: "divider", label: "Divisor", icon: Minus },
];

function emptyBlock(type: KnowledgeBlockType): KnowledgeBlock {
  const base = { id: createBlockId(), type };
  if (type === "list") return { ...base, items: [""] };
  if (type === "table") return { ...base, rows: [["Coluna A", "Coluna B"], ["", ""]] };
  if (type === "divider") return base;
  return { ...base, text: "" };
}

function AutoTextarea({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "w-full resize-none border-0 bg-transparent p-0 outline-none placeholder:text-muted-foreground/60 focus:ring-0",
        className,
      )}
    />
  );
}

function BlockContent({
  block,
  onChange,
}: {
  block: KnowledgeBlock;
  onChange: (b: KnowledgeBlock) => void;
}) {
  switch (block.type) {
    case "title":
      return (
        <AutoTextarea
          value={block.text ?? ""}
          onChange={(text) => onChange({ ...block, text })}
          placeholder="Título"
          className="text-2xl font-semibold tracking-tight"
        />
      );
    case "subtitle":
      return (
        <AutoTextarea
          value={block.text ?? ""}
          onChange={(text) => onChange({ ...block, text })}
          placeholder="Subtítulo"
          className="text-base font-medium tracking-tight"
        />
      );
    case "text":
      return (
        <AutoTextarea
          value={block.text ?? ""}
          onChange={(text) => onChange({ ...block, text })}
          placeholder="Escreva algo…"
          className="text-sm leading-relaxed text-foreground/90"
        />
      );
    case "callout":
      return (
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5">
          <AutoTextarea
            value={block.text ?? ""}
            onChange={(text) => onChange({ ...block, text })}
            placeholder="Destaque importante…"
            className="text-sm leading-relaxed"
          />
        </div>
      );
    case "divider":
      return <div className="my-2 h-px w-full bg-border" />;
    case "list": {
      const items = block.items ?? [""];
      return (
        <div className="space-y-1">
          {items.map((item, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/60" />
              <AutoTextarea
                value={item}
                onChange={(v) => {
                  const next = [...items];
                  next[i] = v;
                  onChange({ ...block, items: next });
                }}
                placeholder="Item da lista"
                className="text-sm leading-relaxed"
              />
              {items.length > 1 && (
                <button
                  type="button"
                  aria-label="Remover item"
                  onClick={() =>
                    onChange({ ...block, items: items.filter((_, j) => j !== i) })
                  }
                  className="mt-1 text-muted-foreground/50 opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => onChange({ ...block, items: [...items, ""] })}
            className="ml-3.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            + Item
          </button>
        </div>
      );
    }
    case "table": {
      const rows = block.rows ?? [["", ""]];
      const cols = rows[0]?.length ?? 2;
      const setCell = (r: number, c: number, v: string) => {
        const next = rows.map((row) => [...row]);
        next[r]![c] = v;
        onChange({ ...block, rows: next });
      };
      return (
        <div className="space-y-1.5">
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full border-collapse text-sm">
              <tbody>
                {rows.map((row, r) => (
                  <tr key={r} className={r === 0 ? "bg-muted/50" : undefined}>
                    {row.map((cell, c) => (
                      <td key={c} className="border-b border-r p-0 last:border-r-0">
                        <input
                          value={cell}
                          onChange={(e) => setCell(r, c, e.target.value)}
                          placeholder={r === 0 ? "Cabeçalho" : "—"}
                          className={cn(
                            "w-full bg-transparent px-2.5 py-1.5 outline-none placeholder:text-muted-foreground/50",
                            r === 0 && "font-medium",
                          )}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-3 text-xs text-muted-foreground">
            <button
              type="button"
              className="transition-colors hover:text-foreground"
              onClick={() =>
                onChange({ ...block, rows: [...rows, Array(cols).fill("")] })
              }
            >
              + Linha
            </button>
            <button
              type="button"
              className="transition-colors hover:text-foreground"
              onClick={() =>
                onChange({ ...block, rows: rows.map((row) => [...row, ""]) })
              }
            >
              + Coluna
            </button>
          </div>
        </div>
      );
    }
    default:
      return null;
  }
}

export function BlockEditor({
  blocks,
  onChange,
}: {
  blocks: KnowledgeBlock[];
  onChange: (blocks: KnowledgeBlock[]) => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  const update = useCallback(
    (block: KnowledgeBlock) =>
      onChange(blocks.map((b) => (b.id === block.id ? block : b))),
    [blocks, onChange],
  );

  const insertAfter = (index: number, type: KnowledgeBlockType) => {
    const next = [...blocks];
    next.splice(index + 1, 0, emptyBlock(type));
    onChange(next);
  };

  const remove = (id: string) => onChange(blocks.filter((b) => b.id !== id));

  return (
    <div className="mx-auto max-w-3xl">
      {blocks.map((block, index) => (
        <div
          key={block.id}
          className="group relative -ml-14 flex items-start gap-1 rounded-md py-1 pl-14 pr-1 transition-colors hover:bg-muted/30"
          onMouseEnter={() => setHovered(block.id)}
          onMouseLeave={() => setHovered(null)}
        >
          <div
            className={cn(
              "absolute left-2 top-1.5 flex items-center gap-0.5 transition-opacity",
              hovered === block.id ? "opacity-100" : "opacity-0",
            )}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground"
                  aria-label="Adicionar bloco"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52">
                <DropdownMenuLabel className="text-[11px] font-normal uppercase tracking-wider text-muted-foreground">
                  Inserir bloco
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {BLOCK_MENU.map((item) => (
                  <DropdownMenuItem
                    key={item.type}
                    onSelect={() => insertAfter(index, item.type)}
                  >
                    <item.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                    {item.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground"
                  aria-label="Opções do bloco"
                >
                  <GripVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-44">
                <DropdownMenuItem
                  disabled={index === 0}
                  onSelect={() => {
                    const next = [...blocks];
                    const [b] = next.splice(index, 1);
                    next.splice(index - 1, 0, b!);
                    onChange(next);
                  }}
                >
                  Mover para cima
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={index === blocks.length - 1}
                  onSelect={() => {
                    const next = [...blocks];
                    const [b] = next.splice(index, 1);
                    next.splice(index + 1, 0, b!);
                    onChange(next);
                  }}
                >
                  Mover para baixo
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => remove(block.id)}>
                  <Trash2 className="mr-2 h-4 w-4 text-muted-foreground" />
                  Excluir bloco
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="min-w-0 flex-1">
            <BlockContent block={block} onChange={update} />
          </div>
        </div>
      ))}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="mt-3 gap-1.5 text-muted-foreground">
            <Plus className="h-4 w-4" />
            Adicionar bloco
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-52">
          {BLOCK_MENU.map((item) => (
            <DropdownMenuItem
              key={item.type}
              onSelect={() => insertAfter(blocks.length - 1, item.type)}
            >
              <item.icon className="mr-2 h-4 w-4 text-muted-foreground" />
              {item.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
