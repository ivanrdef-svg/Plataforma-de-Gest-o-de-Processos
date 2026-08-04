import { useNavigate } from "@tanstack/react-router";
import { ExternalLink, MoreHorizontal, Share2, Star } from "lucide-react";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Build 2.5 — ações rápidas exibidas no hover dos cartões.
 * Apenas feedback visual (toast); sem regras de negócio.
 */

interface QuickAction {
  id: string;
  label: string;
  icon: typeof Star;
  onClick: () => void;
}

export function CardQuickActions({
  name,
  openTo,
  className,
}: {
  name: string;
  openTo?: () => void;
  className?: string;
}) {
  const navigate = useNavigate();
  void navigate;

  const actions: QuickAction[] = [
    {
      id: "abrir",
      label: "Abrir",
      icon: ExternalLink,
      onClick: () => openTo?.(),
    },
    {
      id: "favoritar",
      label: "Favoritar",
      icon: Star,
      onClick: () => toast.success(`"${name}" adicionado aos favoritos`),
    },
    {
      id: "compartilhar",
      label: "Compartilhar",
      icon: Share2,
      onClick: () => toast("Link de compartilhamento copiado"),
    },
    {
      id: "mais",
      label: "Mais opções",
      icon: MoreHorizontal,
      onClick: () => toast("Mais opções chegam em uma próxima build"),
    },
  ];

  return (
    <div
      className={cn(
        "flex items-center gap-0.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100 focus-within:opacity-100",
        className,
      )}
    >
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Tooltip key={action.id}>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={action.label}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  action.onClick();
                }}
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-[11px]">
              {action.label}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
