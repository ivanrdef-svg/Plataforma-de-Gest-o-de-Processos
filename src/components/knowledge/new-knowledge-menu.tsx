import { ChevronDown, Plus } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { createKnowledgeDoc } from "@/lib/knowledge-store";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { KNOWLEDGE_TYPE_LIST } from "@/config/knowledge-types";

/**
 * Build 2.5 — menu "Novo".
 * Lista os tipos de conhecimento. Os formulários chegam em builds futuras.
 */
export function NewKnowledgeMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="h-10 gap-1.5">
          <Plus className="h-4 w-4" />
          Novo
          <ChevronDown className="h-3.5 w-3.5 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-[11px] font-normal uppercase tracking-wider text-muted-foreground">
          Criar conhecimento
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {KNOWLEDGE_TYPE_LIST.map((type) => {
          const Icon = type.icon;
          const article = type.id === "Norma" ? "Nova" : "Novo";
          return (
            <DropdownMenuItem
              key={type.id}
              onSelect={() =>
                toast(`${article} ${type.label}`, {
                  description: "O formulário chega em uma próxima build.",
                })
              }
            >
              <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
              {article} {type.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
