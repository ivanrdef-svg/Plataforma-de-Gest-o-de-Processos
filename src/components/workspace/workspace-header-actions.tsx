import { useState } from "react";
import { MoreHorizontal, Share2, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Build 2.5 — ações do header do Workspace (favoritar, compartilhar, mais).
 * Estado local apenas: nenhuma persistência nesta build.
 */
export function WorkspaceHeaderActions({ name }: { name: string }) {
  const [favorite, setFavorite] = useState(false);

  return (
    <div className="flex items-center gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            aria-label={favorite ? "Remover dos favoritos" : "Favoritar"}
            aria-pressed={favorite}
            className="h-8 w-8 p-0"
            onClick={() => {
              setFavorite((v) => !v);
              toast(
                favorite
                  ? `"${name}" removido dos favoritos`
                  : `"${name}" adicionado aos favoritos`,
              );
            }}
          >
            <Star
              className={cn(
                "h-4 w-4 transition-colors",
                favorite && "fill-amber-400 text-amber-500",
              )}
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent className="text-[11px]">Favoritar</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Compartilhar"
            className="h-8 w-8 p-0"
            onClick={() => toast("Link de compartilhamento copiado")}
          >
            <Share2 className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent className="text-[11px]">Compartilhar</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Mais opções"
            className="h-8 w-8 p-0"
            onClick={() => toast("Mais opções chegam em uma próxima build")}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent className="text-[11px]">Mais opções</TooltipContent>
      </Tooltip>
    </div>
  );
}
