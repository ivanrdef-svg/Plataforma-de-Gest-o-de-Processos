import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Workflow,
  FileText,
  GitBranch,
  BarChart3,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  ClipboardCheck,
  LayoutGrid,
} from "lucide-react";

/**
 * Registro central de módulos da plataforma.
 *
 * Esta é a infraestrutura de crescimento: cada Sprint futura adiciona ou
 * ativa módulos aqui, sem reescrever navegação, busca global ou Launchpad.
 * Nunca remova entradas existentes — apenas evolua `status` e `route`.
 */

export type ModuleStatus = "available" | "planned";

export interface PlatformModule {
  /** Identificador estável. Nunca renomear. */
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  /** Rota destino quando o módulo estiver disponível. */
  route?: string;
  status: ModuleStatus;
  group: ModuleGroup;
}

export type ModuleGroup = "core" | "execucao" | "inteligencia" | "governanca";

export const MODULE_GROUPS: Record<ModuleGroup, { label: string }> = {
  core: { label: "Conhecimento" },
  execucao: { label: "Execução" },
  inteligencia: { label: "Inteligência" },
  governanca: { label: "Governança" },
};

export const PLATFORM_MODULES: PlatformModule[] = [
  {
    id: "workspaces",
    name: "Workspaces",
    description: "Espaços de trabalho onde todo objeto é aberto e evoluído.",
    icon: LayoutGrid,
    route: "/workspaces",
    status: "available",
    group: "core",
  },
  {
    id: "knowledge",
    name: "Conhecimento",
    description: "A origem de tudo: base estruturada de conhecimento corporativo.",
    icon: BookOpen,
    route: "/knowledge",
    status: "available",
    group: "core",
  },

  {
    id: "processes",
    name: "Processos",
    description: "Engenharia de processos, cadeia de valor e arquitetura processual.",
    icon: Workflow,
    route: "/processos",
    status: "available",
    group: "core",
  },
  {
    id: "pop",
    name: "POP",
    description: "Procedimentos Operacionais Padrão como objetos estruturados.",
    icon: FileText,
    status: "planned",
    group: "core",
  },
  {
    id: "bpmn",
    name: "Modelagem BPMN",
    description: "Representação gráfica dos processos em notação BPMN.",
    icon: GitBranch,
    status: "planned",
    group: "execucao",
  },
  {
    id: "workflow",
    name: "Workflow",
    description: "Execução operacional dos processos modelados.",
    icon: ClipboardCheck,
    status: "planned",
    group: "execucao",
  },
  {
    id: "analytics",
    name: "Analytics",
    description: "Medição contínua da execução dos processos.",
    icon: BarChart3,
    status: "planned",
    group: "inteligencia",
  },
  {
    id: "ai",
    name: "Inteligência Artificial",
    description: "Aprendizado contínuo a partir da execução e do conhecimento.",
    icon: Sparkles,
    status: "planned",
    group: "inteligencia",
  },
  {
    id: "governance",
    name: "Governança",
    description: "Políticas, papéis, aprovações e ciclo de vida dos objetos.",
    icon: ShieldCheck,
    status: "planned",
    group: "governanca",
  },
  {
    id: "risks",
    name: "Riscos",
    description: "Identificação e tratamento de riscos associados aos processos.",
    icon: AlertTriangle,
    status: "planned",
    group: "governanca",
  },
  {
    id: "controls",
    name: "Controles Internos",
    description: "Controles vinculados a riscos, processos e procedimentos.",
    icon: ShieldCheck,
    status: "planned",
    group: "governanca",
  },
];

export function getModule(id: string): PlatformModule | undefined {
  return PLATFORM_MODULES.find((m) => m.id === id);
}

export function modulesByGroup(group: ModuleGroup): PlatformModule[] {
  return PLATFORM_MODULES.filter((m) => m.group === group);
}
