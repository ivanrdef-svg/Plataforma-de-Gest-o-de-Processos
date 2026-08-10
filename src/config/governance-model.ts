/**
 * Build 010 — Enterprise Governance Engine.
 *
 * Governança é uma CAPACIDADE TRANSVERSAL: o mesmo modelo atende Knowledge
 * Packages, POPs, Processos, Normas, Checklists, Fluxogramas e ativos futuros.
 *
 * Governança NÃO é Workflow: aqui definimos responsabilidades, autoridade,
 * aprovação, revisão, criticidade, conformidade, riscos, controles e auditoria.
 * A execução dessas definições será responsabilidade do Workflow Engine.
 *
 * Nada aqui substitui o Lifecycle Engine (estado do ativo) nem o Relationship
 * Engine (vínculos). Esta camada consome ambos.
 */

import {
  AlertTriangle,
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  CircleDashed,
  Clock3,
  Eye,
  FileSearch,
  Gavel,
  MessageSquare,
  MinusCircle,
  PenLine,
  Play,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Criticidade                                                         */
/* ------------------------------------------------------------------ */

export type CriticalityLevel = "baixa" | "média" | "alta" | "crítica";

export const CRITICALITY_LEVELS: CriticalityLevel[] = [
  "baixa",
  "média",
  "alta",
  "crítica",
];

export interface CriticalityStyle {
  id: CriticalityLevel;
  label: string;
  description: string;
  tone: string;
  dot: string;
  weight: number;
}

export const CRITICALITY: Record<CriticalityLevel, CriticalityStyle> = {
  baixa: {
    id: "baixa",
    label: "Criticidade baixa",
    description: "Impacto limitado; revisão em ciclo longo.",
    tone: "bg-muted text-muted-foreground",
    dot: "bg-muted-foreground/50",
    weight: 1,
  },
  "média": {
    id: "média",
    label: "Criticidade média",
    description: "Impacto relevante em uma área ou serviço.",
    tone: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
    dot: "bg-sky-500",
    weight: 2,
  },
  alta: {
    id: "alta",
    label: "Criticidade alta",
    description: "Impacto corporativo; exige aprovação formal.",
    tone: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    dot: "bg-amber-500",
    weight: 3,
  },
  "crítica": {
    id: "crítica",
    label: "Criticidade crítica",
    description: "Impacto regulatório ou risco material à operação.",
    tone: "bg-red-500/10 text-red-700 dark:text-red-300",
    dot: "bg-red-500",
    weight: 4,
  },
};

export function criticalityStyle(level: CriticalityLevel): CriticalityStyle {
  return CRITICALITY[level] ?? CRITICALITY.baixa;
}

/* ------------------------------------------------------------------ */
/* Responsabilidades                                                   */
/* ------------------------------------------------------------------ */

export type ResponsibilityRole =
  | "Owner"
  | "Co-owner"
  | "Revisor"
  | "Aprovador"
  | "Executor"
  | "Consultado"
  | "Informado";

export interface ResponsibilityRoleStyle {
  id: ResponsibilityRole;
  description: string;
  icon: LucideIcon;
  tone: string;
}

export const RESPONSIBILITY_ROLES: Record<
  ResponsibilityRole,
  ResponsibilityRoleStyle
> = {
  Owner: {
    id: "Owner",
    description: "Responsável final pelo ativo e por sua vigência.",
    icon: BadgeCheck,
    tone: "bg-primary/10 text-primary",
  },
  "Co-owner": {
    id: "Co-owner",
    description: "Compartilha a responsabilidade de manutenção do ativo.",
    icon: Users,
    tone: "bg-primary/10 text-primary",
  },
  Revisor: {
    id: "Revisor",
    description: "Avalia tecnicamente o conteúdo antes da aprovação.",
    icon: FileSearch,
    tone: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  Aprovador: {
    id: "Aprovador",
    description: "Detém a autoridade formal de aprovação.",
    icon: Gavel,
    tone: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  },
  Executor: {
    id: "Executor",
    description: "Executa o que o ativo determina no dia a dia.",
    icon: Play,
    tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  Consultado: {
    id: "Consultado",
    description: "Consultado antes de mudanças relevantes.",
    icon: MessageSquare,
    tone: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  },
  Informado: {
    id: "Informado",
    description: "Comunicado sobre publicações e alterações.",
    icon: Eye,
    tone: "bg-muted text-muted-foreground",
  },
};

export const RESPONSIBILITY_ORDER: ResponsibilityRole[] = [
  "Owner",
  "Co-owner",
  "Revisor",
  "Aprovador",
  "Executor",
  "Consultado",
  "Informado",
];

/** Natureza do responsável — pessoa, cargo ou área. */
export type ResponsibilityScope = "Pessoa" | "Cargo" | "Área";

/* ------------------------------------------------------------------ */
/* Revisão                                                             */
/* ------------------------------------------------------------------ */

export const REVIEW_PERIODICITIES = [
  "Mensal",
  "Trimestral",
  "Semestral",
  "Anual",
  "Bienal",
] as const;

export type ReviewPeriodicity = (typeof REVIEW_PERIODICITIES)[number];

export const PERIODICITY_DAYS: Record<ReviewPeriodicity, number> = {
  Mensal: 30,
  Trimestral: 90,
  Semestral: 180,
  Anual: 365,
  Bienal: 730,
};

export type ReviewSituation = "em dia" | "próxima do vencimento" | "vencida";

export const REVIEW_SITUATION: Record<
  ReviewSituation,
  { id: ReviewSituation; label: string; tone: string; icon: LucideIcon }
> = {
  "em dia": {
    id: "em dia",
    label: "Em dia",
    tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    icon: CheckCircle2,
  },
  "próxima do vencimento": {
    id: "próxima do vencimento",
    label: "Próxima do vencimento",
    tone: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    icon: CalendarClock,
  },
  vencida: {
    id: "vencida",
    label: "Revisão vencida",
    tone: "bg-red-500/10 text-red-700 dark:text-red-300",
    icon: AlertTriangle,
  },
};

/** Situação da revisão a partir da data prevista (ISO). */
export function reviewSituationFor(nextIso: string): ReviewSituation {
  const next = Date.parse(nextIso);
  if (Number.isNaN(next)) return "em dia";
  const days = Math.round((next - Date.now()) / 86_400_000);
  if (days < 0) return "vencida";
  if (days <= 30) return "próxima do vencimento";
  return "em dia";
}

/* ------------------------------------------------------------------ */
/* Aprovação                                                           */
/* ------------------------------------------------------------------ */

export type ApprovalStatus =
  | "não iniciada"
  | "aguardando aprovação"
  | "aprovada"
  | "expirada";

export const APPROVAL_STATUS: Record<
  ApprovalStatus,
  { id: ApprovalStatus; label: string; tone: string; icon: LucideIcon }
> = {
  "não iniciada": {
    id: "não iniciada",
    label: "Não iniciada",
    tone: "bg-muted text-muted-foreground",
    icon: CircleDashed,
  },
  "aguardando aprovação": {
    id: "aguardando aprovação",
    label: "Aguardando aprovação",
    tone: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
    icon: Clock3,
  },
  aprovada: {
    id: "aprovada",
    label: "Aprovada",
    tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    icon: ShieldCheck,
  },
  expirada: {
    id: "expirada",
    label: "Aprovação expirada",
    tone: "bg-red-500/10 text-red-700 dark:text-red-300",
    icon: AlertTriangle,
  },
};

/* ------------------------------------------------------------------ */
/* Conformidade                                                        */
/* ------------------------------------------------------------------ */

export type ComplianceStatus =
  | "conforme"
  | "em análise"
  | "pendente"
  | "não aplicável";

export const COMPLIANCE_STATUSES: ComplianceStatus[] = [
  "conforme",
  "em análise",
  "pendente",
  "não aplicável",
];

export const COMPLIANCE_STATUS: Record<
  ComplianceStatus,
  { id: ComplianceStatus; label: string; tone: string; icon: LucideIcon }
> = {
  conforme: {
    id: "conforme",
    label: "Conforme",
    tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    icon: CheckCircle2,
  },
  "em análise": {
    id: "em análise",
    label: "Em análise",
    tone: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
    icon: FileSearch,
  },
  pendente: {
    id: "pendente",
    label: "Pendente",
    tone: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    icon: AlertTriangle,
  },
  "não aplicável": {
    id: "não aplicável",
    label: "Não aplicável",
    tone: "bg-muted text-muted-foreground",
    icon: MinusCircle,
  },
};

/** Natureza do requisito de conformidade. */
export type ComplianceKind =
  | "Norma"
  | "Política"
  | "Regulamento"
  | "Requisito"
  | "Framework";

export const COMPLIANCE_KINDS: ComplianceKind[] = [
  "Norma",
  "Política",
  "Regulamento",
  "Requisito",
  "Framework",
];

/* ------------------------------------------------------------------ */
/* Riscos e controles                                                  */
/* ------------------------------------------------------------------ */

export type RiskStatus = "identificado" | "em tratamento" | "mitigado" | "aceito";

export const RISK_STATUS_TONE: Record<RiskStatus, string> = {
  identificado: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  "em tratamento": "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  mitigado: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  aceito: "bg-muted text-muted-foreground",
};

export type ControlType = "Preventivo" | "Detectivo" | "Corretivo" | "Automatizado";

export type ControlStatus = "ativo" | "em implantação" | "inativo";

export const CONTROL_STATUS_TONE: Record<ControlStatus, string> = {
  ativo: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  "em implantação": "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  inativo: "bg-muted text-muted-foreground",
};

/* ------------------------------------------------------------------ */
/* Auditoria                                                           */
/* ------------------------------------------------------------------ */

export type GovernanceEventKind =
  | "criação"
  | "revisão"
  | "aprovação"
  | "responsável"
  | "criticidade"
  | "conformidade"
  | "observação";

export const GOVERNANCE_EVENT: Record<
  GovernanceEventKind,
  { id: GovernanceEventKind; label: string; tone: string; icon: LucideIcon }
> = {
  "criação": {
    id: "criação",
    label: "Governança iniciada",
    tone: "bg-primary/10 text-primary",
    icon: Sparkles,
  },
  "revisão": {
    id: "revisão",
    label: "Revisão",
    tone: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    icon: FileSearch,
  },
  "aprovação": {
    id: "aprovação",
    label: "Aprovação",
    tone: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
    icon: Gavel,
  },
  "responsável": {
    id: "responsável",
    label: "Responsável alterado",
    tone: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
    icon: UserCog,
  },
  criticidade: {
    id: "criticidade",
    label: "Criticidade alterada",
    tone: "bg-red-500/10 text-red-700 dark:text-red-300",
    icon: ShieldAlert,
  },
  conformidade: {
    id: "conformidade",
    label: "Conformidade atualizada",
    tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    icon: ShieldCheck,
  },
  "observação": {
    id: "observação",
    label: "Observação registrada",
    tone: "bg-muted text-muted-foreground",
    icon: PenLine,
  },
};

/** Indicadores do Governance Center. */
export const GOVERNANCE_STATS = [
  { id: "governados", label: "Ativos governados" },
  { id: "revisao", label: "Aguardando revisão" },
  { id: "aprovacao", label: "Aguardando aprovação" },
  { id: "criticos", label: "Alta criticidade" },
] as const;
