import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { BookOpen, Home, LayoutGrid } from "lucide-react";
import { MODULE_GROUPS, PLATFORM_MODULES, type ModuleGroup } from "@/config/modules";
import { KNOWLEDGE_PACKAGES } from "@/config/knowledge-demo";
import { DEMO_WORKSPACES } from "@/config/workspace-demo";
import { useGlobalSearch } from "./global-search-context";

const GROUP_ORDER: ModuleGroup[] = ["core", "execucao", "inteligencia", "governanca"];

/**
 * Pesquisa global — principal meio de navegação da plataforma (Search First).
 * Futuras Sprints adicionam aqui resultados de objetos (conhecimento, POP,
 * processos) sem alterar o contrato deste componente.
 */
export function GlobalSearch() {
  const { isOpen, setOpen, close } = useGlobalSearch();
  const navigate = useNavigate();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen(!isOpen);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, setOpen]);

  const go = (to: string) => {
    close();
    navigate({ to });
  };

  return (
    <CommandDialog open={isOpen} onOpenChange={setOpen}>
      <CommandInput placeholder="Pesquisar módulos, workspaces e conhecimento..." />
      <CommandList>
        <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
        <CommandGroup heading="Navegação">
          <CommandItem onSelect={() => go("/")}>
            <Home className="mr-2 h-4 w-4" />
            Início
          </CommandItem>
          <CommandItem onSelect={() => go("/workspaces")}>
            <LayoutGrid className="mr-2 h-4 w-4" />
            Workspaces
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Knowledge">
          {KNOWLEDGE_PACKAGES.map((pkg) => (
            <CommandItem
              key={pkg.id}
              value={`${pkg.name} ${pkg.type} ${pkg.category} conhecimento pop`}
              onSelect={() => go(`/knowledge/${pkg.id}`)}
            >
              <BookOpen className="mr-2 h-4 w-4" />
              <span>{pkg.name}</span>
              <span className="ml-auto text-[10px] text-muted-foreground">
                {pkg.type}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Workspaces e processos">
          {DEMO_WORKSPACES.map((ws) => (
            <CommandItem
              key={ws.id}
              value={`${ws.name} ${ws.type} workspace processo`}
              onSelect={() => go(`/workspaces/${ws.id}`)}
            >
              <LayoutGrid className="mr-2 h-4 w-4" />
              <span>{ws.name}</span>
              <span className="ml-auto text-[10px] text-muted-foreground">
                {ws.type}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        {GROUP_ORDER.map((group) => (
          <CommandGroup key={group} heading={MODULE_GROUPS[group].label}>
            {PLATFORM_MODULES.filter((m) => m.group === group).map((module) => {
              const Icon = module.icon;
              return (
                <CommandItem
                  key={module.id}
                  value={`${module.name} ${module.description}`}
                  onSelect={() => {
                    if (module.route && module.status === "available") go(module.route);
                  }}
                  disabled={module.status !== "available"}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  <span>{module.name}</span>
                  {module.status !== "available" && (
                    <span className="ml-auto text-[10px] text-muted-foreground">
                      em breve
                    </span>
                  )}
                </CommandItem>
              );
            })}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
