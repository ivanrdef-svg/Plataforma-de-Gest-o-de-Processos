/**
 * Build 007 — Process Modeling Engine.
 *
 * Camada adicional sobre o Process Builder (Build 006). Nada é substituído:
 * aqui ficam os blocos estruturados extras do modelo organizacional, os tipos
 * de etapa e os vocabulários usados por regras de negócio e participantes.
 */

import {
  AlertTriangle,
  ArrowRightLeft,
  BadgeCheck,
  CheckCircle2,
  Flag,
  GitBranch,
  MessageSquare,
  Search,
  Timer,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import type { ProcessSectionId, ProcessSectionTemplate } from "./process-structure";

/* ------------------------------------------------------------------ */
/* Tipos de etapa                                                      */
/* ------------------------------------------------------------------ */

export type ProcessStepTypeId =
  | "atividade"
  | "validacao"
  | "decisao"
  | "aprovacao"
  | "integracao"
  | "comunicacao"
  | "consulta"
  | "espera"
  | "marco";

export interface ProcessStepType {
  id: ProcessStepTypeId;
  label: string;
  hint: string;
  icon: LucideIcon;
  /** Identidade visual discreta — tokens semânticos, sem cores fixas. */
  tone: string;
  dot: string;
}

export const PROCESS_STEP_TYPES: ProcessStepType[] = [
  {
    id: "atividade",
    label: "Atividade",
    hint: "Trabalho executado por uma pessoa ou time.",
    icon: Workflow,
    tone: "border-border bg-muted/60 text-muted-foreground",
    dot: "bg-muted-foreground/60",
  },
  {
    id: "validacao",
    label: "Validação",
    hint: "Conferência de conformidade ou qualidade.",
    icon: CheckCircle2,
    tone: "border-primary/25 bg-primary/10 text-primary",
    dot: "bg-primary/70",
  },
  {
    id: "decisao",
    label: "Decisão",
    hint: "Bifurcação do fluxo conforme uma condição.",
    icon: GitBranch,
    tone: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-400",
    dot: "bg-amber-500/70",
  },
  {
    id: "aprovacao",
    label: "Aprovação",
    hint: "Autorização formal de um responsável.",
    icon: BadgeCheck,
    tone: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    dot: "bg-emerald-500/70",
  },
  {
    id: "integracao",
    label: "Integração",
    hint: "Troca automática entre sistemas.",
    icon: ArrowRightLeft,
    tone: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-400",
    dot: "bg-sky-500/70",
  },
  {
    id: "comunicacao",
    label: "Comunicação",
    hint: "Aviso, notificação ou alinhamento.",
    icon: MessageSquare,
    tone: "border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-400",
    dot: "bg-violet-500/70",
  },
  {
    id: "consulta",
    label: "Consulta",
    hint: "Busca de informação em base ou sistema.",
    icon: Search,
    tone: "border-teal-500/25 bg-teal-500/10 text-teal-700 dark:text-teal-400",
    dot: "bg-teal-500/70",
  },
  {
    id: "espera",
    label: "Espera",
    hint: "Aguardo por prazo, evento ou terceiro.",
    icon: Timer,
    tone: "border-orange-500/25 bg-orange-500/10 text-orange-700 dark:text-orange-400",
    dot: "bg-orange-500/70",
  },
  {
    id: "marco",
    label: "Marco",
    hint: "Ponto de controle relevante do processo.",
    icon: Flag,
    tone: "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-400",
    dot: "bg-rose-500/70",
  },
];

export function getStepType(id?: string): ProcessStepType {
  return (
    PROCESS_STEP_TYPES.find((t) => t.id === id) ?? PROCESS_STEP_TYPES[0]!
  );
}

/* ------------------------------------------------------------------ */
/* Execução / dependências                                             */
/* ------------------------------------------------------------------ */

export type ProcessExecutionMode = "sequencial" | "paralela" | "condicional";

export const PROCESS_EXECUTION_MODES: {
  id: ProcessExecutionMode;
  label: string;
  hint: string;
}[] = [
  { id: "sequencial", label: "Sequencial", hint: "Executa após a etapa anterior." },
  { id: "paralela", label: "Paralela", hint: "Executa junto com a etapa anterior." },
  { id: "condicional", label: "Condicional", hint: "Executa apenas se a condição ocorrer." },
];

/* ------------------------------------------------------------------ */
/* Regras de negócio                                                   */
/* ------------------------------------------------------------------ */

export const RULE_CRITICALITY = ["baixa", "média", "alta", "crítica"] as const;
export type RuleCriticality = (typeof RULE_CRITICALITY)[number];

export const RULE_CRITICALITY_TONE: Record<RuleCriticality, string> = {
  baixa: "border-border bg-muted/60 text-muted-foreground",
  média: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-400",
  alta: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  crítica: "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-400",
};

export const RULE_SEEDS = [
  {
    name: "Prazo máximo de atendimento",
    description: "Toda solicitação deve ser concluída dentro do SLA acordado.",
    application: "Etapa de execução",
    impact: "Descumprimento gera reabertura e notificação ao gestor.",
    criticality: "alta" as RuleCriticality,
  },
  {
    name: "Dupla conferência de entrega",
    description: "Entregas acima do valor limite exigem validação de um segundo revisor.",
    application: "Etapa de validação e encerramento",
    impact: "Reduz retrabalho e risco de erro material.",
    criticality: "crítica" as RuleCriticality,
  },
];

/* ------------------------------------------------------------------ */
/* Participantes                                                       */
/* ------------------------------------------------------------------ */

export const PARTICIPANT_ROLES = [
  "Responsável",
  "Executor",
  "Aprovador",
  "Consultado",
  "Informado",
] as const;
export type ParticipantRole = (typeof PARTICIPANT_ROLES)[number];

/* ------------------------------------------------------------------ */
/* Blocos adicionais do modelo                                         */
/* ------------------------------------------------------------------ */

export const PROCESS_MODEL_SECTION_TEMPLATES: ProcessSectionTemplate[] = [
  {
    id: "evento-inicial",
    title: "Evento inicial",
    hint: "O gatilho que dá origem a uma execução do processo.",
    content: "Gatilho:\nOrigem do gatilho:\nFrequência esperada:",
  },
  {
    id: "resultados",
    title: "Resultados esperados",
    hint: "O valor entregue ao final de cada execução.",
    content: "• Resultado 1 — como é medido\n• Resultado 2 — como é medido",
  },
  {
    id: "papeis",
    title: "Papéis envolvidos",
    hint: "Funções necessárias para executar o processo.",
    content: "• Papel — responsabilidade principal",
  },
  {
    id: "areas",
    title: "Áreas envolvidas",
    hint: "Estruturas organizacionais que participam do fluxo.",
    content: "• Área — participação no processo",
  },
  {
    id: "riscos",
    title: "Riscos",
    hint: "O que pode falhar durante a execução.",
    content: "• Risco — probabilidade / impacto",
  },
  {
    id: "controles",
    title: "Controles",
    hint: "Mecanismos que reduzem ou detectam os riscos.",
    content: "• Controle — risco tratado / frequência",
  },
  {
    id: "indicadores",
    title: "Indicadores",
    hint: "Como o desempenho do processo é medido.",
    content: "• Indicador — meta / fonte do dado",
  },
];

/** Ordem canônica do modelo organizacional completo. */
export const PROCESS_MODEL_ORDER: ProcessSectionId[] = [
  "resumo",
  "objetivo",
  "evento-inicial",
  "escopo",
  "entradas",
  "saidas",
  "resultados",
  "papeis",
  "areas",
  "participantes",
  "sistemas",
  "riscos",
  "controles",
  "indicadores",
  "documentos",
];

/** Agrupamento visual dos blocos na aba Modelo. */
export const PROCESS_MODEL_GROUPS: {
  id: string;
  label: string;
  hint: string;
  sections: ProcessSectionId[];
}[] = [
  {
    id: "proposito",
    label: "Propósito",
    hint: "Por que este processo existe e onde ele começa.",
    sections: ["resumo", "objetivo", "evento-inicial", "escopo"],
  },
  {
    id: "fluxo",
    label: "Fluxo de valor",
    hint: "O que entra, o que sai e o que é entregue.",
    sections: ["entradas", "saidas", "resultados"],
  },
  {
    id: "organizacao",
    label: "Organização",
    hint: "Quem participa e com quais sistemas.",
    sections: ["papeis", "areas", "participantes", "sistemas"],
  },
  {
    id: "governanca",
    label: "Governança",
    hint: "Riscos, controles, indicadores e registros.",
    sections: ["riscos", "controles", "indicadores", "documentos"],
  },
];
