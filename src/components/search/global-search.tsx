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
import { BookOpen, FileText, GitBranch, Home, Workflow } from "lucide-react";
import { MODULE_GROUPS, PLATFORM_MODULES, type ModuleGroup } from "@/config/modules";
import { useKnowledgeDocs } from "@/lib/knowledge-store";
import { usePopDocs } from "@/lib/pop-store";
import { getAuthoringProcessVersion, useProcessDocs } from "@/lib/process-store";
import { useWorkflowDocs } from "@/lib/workflow-store";
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
  const knowledgeDocs = useKnowledgeDocs();
  const popDocs = usePopDocs();
  const processDocs = useProcessDocs();
  const workflowDocs = useWorkflowDocs();

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
      <CommandInput placeholder="Pesquisar módulos, processos, POPs e conhecimento..." />
      <CommandList>
        <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
        <CommandGroup heading="Navegação">
          <CommandItem onSelect={() => go("/")}>
            <Home className="mr-2 h-4 w-4" />
            Início
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Knowledge">
          {knowledgeDocs.map((pkg) => (
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
        <CommandGroup heading="Processos">
          {processDocs.map((process) => {
            const definition = getAuthoringProcessVersion(process)?.definition;
            if (!definition) return null;
            return (
            <CommandItem
              key={process.id}
              value={`${definition.name} ${definition.category} ${definition.area} processo`}
              onSelect={() => go(`/processos/${process.id}`)}
            >
              <GitBranch className="mr-2 h-4 w-4" />
              <span>{definition.name}</span>
              <span className="ml-auto text-[10px] text-muted-foreground">
                Processo
              </span>
            </CommandItem>
            );
          })}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="POPs">
          {popDocs.map((pop) => (
            <CommandItem
              key={pop.id}
              value={`${pop.name} ${pop.code} ${pop.category} pop`}
              onSelect={() => go(`/pop/${pop.id}`)}
            >
              <FileText className="mr-2 h-4 w-4" />
              <span>{pop.name}</span>
              <span className="ml-auto text-[10px] text-muted-foreground">POP</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Workflows">
          {workflowDocs.map((workflow) => (
            <CommandItem
              key={workflow.id}
              value={`${workflow.name} ${workflow.code} ${workflow.area} workflow`}
              onSelect={() => go(`/workflow/${workflow.id}`)}
            >
              <Workflow className="mr-2 h-4 w-4" />
              <span>{workflow.name}</span>
              <span className="ml-auto text-[10px] text-muted-foreground">Workflow</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        {GROUP_ORDER.map((group) => (
          <CommandGroup key={group} heading={MODULE_GROUPS[group].label}>
            {PLATFORM_MODULES.filter(
              (module) => module.group === group && module.id !== "workspaces",
            ).map((module) => {
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
