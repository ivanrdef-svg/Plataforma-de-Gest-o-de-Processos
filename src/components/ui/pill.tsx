import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Primitivo compartilhado de selo/pill.
 *
 * Unifica o markup repetido por badges de tipo de objeto, tipo de conhecimento,
 * impacto e ciclo de vida. É puramente visual: não conhece domínio nem estado.
 */

export type PillShape = "rounded" | "full";
export type PillSize = "sm" | "default" | "md";

const SIZE: Record<PillSize, string> = {
  sm: "px-1.5 py-0.5 text-[10px]",
  default: "px-2 py-0.5 text-[10px]",
  md: "px-2.5 py-1 text-[11px]",
};

export interface PillProps {
  /** Classe de tom (cor de fundo/texto) vinda do design system. */
  tone?: string;
  shape?: PillShape;
  size?: PillSize;
  /** Ícone opcional exibido antes do conteúdo. */
  icon?: ComponentType<{ className?: string }>;
  iconClassName?: string;
  /** Espaçamento entre ícone e conteúdo. */
  gap?: string;
  title?: string;
  className?: string;
  children?: ReactNode;
}

export function Pill({
  tone,
  shape = "rounded",
  size = "sm",
  icon: Icon,
  iconClassName = "h-3 w-3",
  gap = "gap-1",
  title,
  className,
  children,
}: PillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center",
        Icon ? gap : undefined,
        shape === "full" ? "rounded-full" : "rounded-md",
        SIZE[size],
        "font-medium",
        tone,
        className,
      )}
      title={title}
    >
      {Icon && <Icon className={iconClassName} />}
      {children}
    </span>
  );
}
