import {
  BookMarked,
  CheckSquare,
  FileQuestion,
  GitBranch,
  ScrollText,
  Workflow,
  type LucideIcon,
} from "lucide-react";

/**
 * Build 2.5 — identidade visual dos tipos de conhecimento.
 *
 * Somente aparência (ícone + tom discreto de cor). Nenhuma regra de negócio.
 * Novos tipos podem ser adicionados aqui sem alterar componentes.
 */

export type KnowledgeType =
  | "POP"
  | "Manual"
  | "Norma"
  | "FAQ"
  | "Checklist"
  | "Fluxograma";

export interface KnowledgeTypeStyle {
  id: KnowledgeType;
  label: string;
  icon: LucideIcon;
  /** Classes discretas (fundo + texto) para o selo do tipo. */
  tone: string;
}

export const KNOWLEDGE_TYPES: Record<KnowledgeType, KnowledgeTypeStyle> = {
  POP: {
    id: "POP",
    label: "POP",
    icon: Workflow,
    tone: "bg-primary/10 text-primary",
  },
  Manual: {
    id: "Manual",
    label: "Manual",
    icon: BookMarked,
    tone: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  },
  Norma: {
    id: "Norma",
    label: "Norma",
    icon: ScrollText,
    tone: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  FAQ: {
    id: "FAQ",
    label: "FAQ",
    icon: FileQuestion,
    tone: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  },
  Checklist: {
    id: "Checklist",
    label: "Checklist",
    icon: CheckSquare,
    tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  Fluxograma: {
    id: "Fluxograma",
    label: "Fluxograma",
    icon: GitBranch,
    tone: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  },
};

export const KNOWLEDGE_TYPE_LIST: KnowledgeTypeStyle[] =
  Object.values(KNOWLEDGE_TYPES);
