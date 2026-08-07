/**
 * Build 009 — Enterprise Lifecycle Engine.
 *
 * Ciclo de vida é uma CAPACIDADE NATIVA da plataforma, não uma funcionalidade
 * de módulo. O mesmo mecanismo atende Knowledge Packages, POPs, Processos,
 * Normas, Checklists, Fluxogramas e qualquer entidade futura.
 *
 * Nada aqui substitui os campos `status` já existentes nos stores: esta é uma
 * camada adicional que interpreta e evolui esses estados de forma unificada.
 * Builds futuras (Workflow, Analytics, Governança, IA) devem consumir este
 * modelo em vez de criar máquinas de estado próprias.
 */

import {
  Archive,
  ArchiveRestore,
  CheckCircle2,
  CircleDashed,
  Clock3,
  FileEdit,
  Globe2,
  Send,
  ShieldCheck,
  Sparkles,
  XOctagon,
  type LucideIcon,
} from "lucide-react";

/** Estados padrão da plataforma. Cada tipo poderá personalizar no futuro. */
export type LifecycleStateId =
  | "rascunho"
  | "em elaboração"
  | "em revisão"
  | "aguardando aprovação"
  | "aprovado"
  | "publicado"
  | "arquivado"
  | "obsoleto";

export interface LifecycleState {
  id: LifecycleStateId;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Tom discreto (fundo + texto) alinhado à identidade visual existente. */
  tone: string;
  /** Cor do ponto usado em timeline, trilha e cards. */
  dot: string;
  /** Posição na régua de maturidade (0–100). */
  maturity: number;
  /** Estado terminal não participa da régua principal. */
  terminal?: boolean;
}

export const LIFECYCLE_STATES: Record<LifecycleStateId, LifecycleState> = {
  rascunho: {
    id: "rascunho",
    label: "Rascunho",
    description: "Objeto criado, ainda sem conteúdo consolidado.",
    icon: CircleDashed,
    tone: "bg-muted text-muted-foreground",
    dot: "bg-muted-foreground/40",
    maturity: 10,
  },
  "em elaboração": {
    id: "em elaboração",
    label: "Em elaboração",
    description: "Conteúdo sendo construído pelo responsável.",
    icon: FileEdit,
    tone: "bg-primary/10 text-primary",
    dot: "bg-primary/50",
    maturity: 30,
  },
  "em revisão": {
    id: "em revisão",
    label: "Em revisão",
    description: "Conteúdo em análise técnica pelos revisores.",
    icon: Clock3,
    tone: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    dot: "bg-amber-500",
    maturity: 50,
  },
  "aguardando aprovação": {
    id: "aguardando aprovação",
    label: "Aguardando aprovação",
    description: "Revisão concluída, pendente de decisão do aprovador.",
    icon: ShieldCheck,
    tone: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
    dot: "bg-violet-500",
    maturity: 70,
  },
  aprovado: {
    id: "aprovado",
    label: "Aprovado",
    description: "Aprovado formalmente, pronto para publicação.",
    icon: CheckCircle2,
    tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    dot: "bg-emerald-500",
    maturity: 85,
  },
  publicado: {
    id: "publicado",
    label: "Publicado",
    description: "Vigente e disponível para toda a organização.",
    icon: Globe2,
    tone: "bg-emerald-600/12 text-emerald-700 dark:text-emerald-400",
    dot: "bg-emerald-600",
    maturity: 100,
  },
  arquivado: {
    id: "arquivado",
    label: "Arquivado",
    description: "Fora de uso corrente, preservado para consulta.",
    icon: Archive,
    tone: "bg-muted text-muted-foreground",
    dot: "bg-muted-foreground/50",
    maturity: 0,
    terminal: true,
  },
  obsoleto: {
    id: "obsoleto",
    label: "Obsoleto",
    description: "Substituído por uma versão mais recente.",
    icon: XOctagon,
    tone: "bg-destructive/10 text-destructive",
    dot: "bg-destructive",
    maturity: 0,
    terminal: true,
  },
};

/** Trilha principal de maturidade (sem estados terminais). */
export const LIFECYCLE_TRACK: LifecycleStateId[] = [
  "rascunho",
  "em elaboração",
  "em revisão",
  "aguardando aprovação",
  "aprovado",
  "publicado",
];

export const LIFECYCLE_STATE_IDS: LifecycleStateId[] = [
  ...LIFECYCLE_TRACK,
  "arquivado",
  "obsoleto",
];

export type LifecycleActionId =
  | "iniciar elaboração"
  | "enviar para revisão"
  | "solicitar aprovação"
  | "aprovar"
  | "publicar"
  | "reabrir"
  | "arquivar"
  | "restaurar"
  | "marcar obsoleto";

export interface LifecycleAction {
  id: LifecycleActionId;
  label: string;
  icon: LucideIcon;
  /** Estado resultante. */
  to: LifecycleStateId;
  /** Ação principal do estado atual (destaque visual). */
  primary?: boolean;
  variant?: "default" | "outline" | "ghost";
}

const ACTION: Record<LifecycleActionId, Omit<LifecycleAction, "primary">> = {
  "iniciar elaboração": {
    id: "iniciar elaboração",
    label: "Iniciar elaboração",
    icon: Sparkles,
    to: "em elaboração",
  },
  "enviar para revisão": {
    id: "enviar para revisão",
    label: "Enviar para revisão",
    icon: Send,
    to: "em revisão",
  },
  "solicitar aprovação": {
    id: "solicitar aprovação",
    label: "Solicitar aprovação",
    icon: ShieldCheck,
    to: "aguardando aprovação",
  },
  aprovar: { id: "aprovar", label: "Aprovar", icon: CheckCircle2, to: "aprovado" },
  publicar: { id: "publicar", label: "Publicar", icon: Globe2, to: "publicado" },
  reabrir: { id: "reabrir", label: "Reabrir edição", icon: FileEdit, to: "em elaboração" },
  arquivar: { id: "arquivar", label: "Arquivar", icon: Archive, to: "arquivado" },
  restaurar: {
    id: "restaurar",
    label: "Restaurar",
    icon: ArchiveRestore,
    to: "em elaboração",
  },
  "marcar obsoleto": {
    id: "marcar obsoleto",
    label: "Marcar como obsoleto",
    icon: XOctagon,
    to: "obsoleto",
  },
};

/** Transições permitidas por estado — configuração padrão da plataforma. */
const TRANSITIONS: Record<LifecycleStateId, LifecycleActionId[]> = {
  rascunho: ["iniciar elaboração", "arquivar"],
  "em elaboração": ["enviar para revisão", "arquivar"],
  "em revisão": ["solicitar aprovação", "reabrir", "arquivar"],
  "aguardando aprovação": ["aprovar", "reabrir", "arquivar"],
  aprovado: ["publicar", "reabrir", "arquivar"],
  publicado: ["reabrir", "marcar obsoleto", "arquivar"],
  arquivado: ["restaurar"],
  obsoleto: ["restaurar", "arquivar"],
};

/** Ações disponíveis a partir de um estado, com a principal destacada. */
export function actionsFor(state: LifecycleStateId): LifecycleAction[] {
  return (TRANSITIONS[state] ?? []).map((id, index) => ({
    ...ACTION[id],
    primary: index === 0,
    variant: index === 0 ? "default" : "outline",
  }));
}

/** Próximo estado natural na trilha de maturidade (para o painel de Lifecycle). */
export function nextStateFor(state: LifecycleStateId): LifecycleStateId | undefined {
  const [first] = TRANSITIONS[state] ?? [];
  return first ? ACTION[first].to : undefined;
}

export function stateStyle(state: LifecycleStateId): LifecycleState {
  return LIFECYCLE_STATES[state] ?? LIFECYCLE_STATES.rascunho;
}

/**
 * Converte os `status` livres já existentes nos módulos (Knowledge, POP,
 * Processo) para o estado unificado. Preserva totalmente os dados atuais.
 */
export function stateFromLegacyStatus(status: string | undefined): LifecycleStateId {
  const value = (status ?? "").trim().toLowerCase();
  switch (value) {
    case "publicado":
    case "vigente":
      return "publicado";
    case "aprovado":
      return "aprovado";
    case "aguardando aprovação":
      return "aguardando aprovação";
    case "em revisão":
    case "revisão":
      return "em revisão";
    case "em desenvolvimento":
    case "em elaboração":
    case "em modelagem":
      return "em elaboração";
    case "arquivado":
      return "arquivado";
    case "obsoleto":
      return "obsoleto";
    default:
      return "rascunho";
  }
}

/**
 * Caminho inverso: devolve um `status` compatível com os campos legados dos
 * módulos, para que cards e badges antigos continuem coerentes.
 */
export function legacyStatusFor(
  state: LifecycleStateId,
  allowed: readonly string[],
): string | undefined {
  const preference: Record<LifecycleStateId, string[]> = {
    rascunho: ["rascunho"],
    "em elaboração": ["em desenvolvimento", "em elaboração", "rascunho"],
    "em revisão": ["em revisão"],
    "aguardando aprovação": ["em revisão"],
    aprovado: ["publicado", "em revisão"],
    publicado: ["publicado"],
    arquivado: ["rascunho"],
    obsoleto: ["rascunho"],
  };
  return preference[state].find((candidate) => allowed.includes(candidate));
}

/** Estados que representam pendência de ação humana. */
export const AWAITING_STATES: LifecycleStateId[] = [
  "em revisão",
  "aguardando aprovação",
  "aprovado",
];
