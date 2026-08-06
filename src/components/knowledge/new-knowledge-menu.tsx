import { ChevronDown, Plus } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { createKnowledgeDoc } from "@/lib/knowledge-store";
import { createPopDoc } from "@/lib/pop-store";
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
 * Build 003 — cria o Knowledge Package a partir do template do tipo
 * e abre o Workspace diretamente.
 */
export function NewKnowledgeMenu() {
  const navigate = useNavigate();

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
              onSelect={() => {
                // Build 004 — POP abre o Workspace estruturado dedicado.
                if (type.id === "POP") {
                  const pop = createPopDoc();
                  toast.success("Novo POP criado", {
                    description: "Estrutura padrão com 10 seções.",
                  });
                  void navigate({
                    to: "/pop/$popId",
                    params: { popId: pop.id },
                  });
                  return;
                }
                const doc = createKnowledgeDoc(type.id);
                toast.success(`${article} ${type.label} criado`, {
                  description: "Comece a escrever na aba Conteúdo.",
                });
                void navigate({
                  to: "/knowledge/$packageId",
                  params: { packageId: doc.id },
                });
              }}
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
