import { cn } from "@/lib/utils";
import { Pill } from "@/components/ui/pill";
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

  return (
    <Pill tone={style.tone} icon={style.icon} className={className}>
      {showLabel && style.label}
    </Pill>
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
