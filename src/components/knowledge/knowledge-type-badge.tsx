import { cn } from "@/lib/utils";
import { KNOWLEDGE_TYPES, type KnowledgeType } from "@/config/knowledge-types";

/**
 * Selo visual do tipo de conhecimento (POP, Manual, Norma, FAQ...).
 * Apenas identidade visual — sem lógica de negócio.
 */
export function KnowledgeTypeBadge({
  type,
  className,
  showLabel = true,
}: {
  type: KnowledgeType;
  className?: string;
  showLabel?: boolean;
}) {
  const style = KNOWLEDGE_TYPES[type];
  const Icon = style.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium",
        style.tone,
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      {showLabel && style.label}
    </span>
  );
}

export function KnowledgeTypeIcon({
  type,
  className,
}: {
  type: KnowledgeType;
  className?: string;
}) {
  const style = KNOWLEDGE_TYPES[type];
  const Icon = style.icon;
  return (
    <span
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
        style.tone,
        className,
      )}
    >
      <Icon className="h-4 w-4" />
    </span>
  );
}
