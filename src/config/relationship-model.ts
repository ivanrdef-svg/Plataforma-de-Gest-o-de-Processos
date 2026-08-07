/**
 * Build 005 — Enterprise Relationship Engine.
 *
 * Modelo ÚNICO de relacionamento usado por todos os ativos da plataforma.
 * Nada aqui substitui estruturas existentes: é uma camada adicional que
 * qualquer objeto (Knowledge Package, POP, Processo, Risco...) pode usar.
 *
 * Builds futuras (Processos, BPM, Workflow, Analytics, IA) devem consumir
 * este mesmo modelo em vez de criar vínculos próprios.
 */

import {
  Boxes,
  Briefcase,
  BookMarked,
  CheckSquare,
  FileQuestion,
  FileText,
  GitBranch,
  Gauge,
  Layers,
  MonitorCog,
  ScrollText,
  ShieldAlert,
  ShieldCheck,
  User,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react";

/** Todos os tipos de objeto que podem se relacionar. */
export type RelatedObjectType =
  | "Knowledge Package"
  | "POP"
  | "Processo"
  | "Norma"
  | "Manual"
  | "Checklist"
  | "FAQ"
  | "Fluxograma"
  | "Risco"
  | "Controle"
  | "Indicador"
  | "Área"
  | "Cargo"
  | "Pessoa"
  | "Sistema"
  | "Documento";

export interface ObjectTypeStyle {
  id: RelatedObjectType;
  icon: LucideIcon;
  /** Tom discreto (fundo + texto) — segue a identidade visual existente. */
  tone: string;
}

export const OBJECT_TYPES: Record<RelatedObjectType, ObjectTypeStyle> = {
  "Knowledge Package": { id: "Knowledge Package", icon: Boxes, tone: "bg-primary/10 text-primary" },
  POP: { id: "POP", icon: Workflow, tone: "bg-primary/10 text-primary" },
  Processo: { id: "Processo", icon: Layers, tone: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300" },
  Norma: { id: "Norma", icon: ScrollText, tone: "bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  Manual: { id: "Manual", icon: BookMarked, tone: "bg-sky-500/10 text-sky-700 dark:text-sky-300" },
  Checklist: { id: "Checklist", icon: CheckSquare, tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  FAQ: { id: "FAQ", icon: FileQuestion, tone: "bg-violet-500/10 text-violet-700 dark:text-violet-300" },
  Fluxograma: { id: "Fluxograma", icon: GitBranch, tone: "bg-rose-500/10 text-rose-700 dark:text-rose-300" },
  Risco: { id: "Risco", icon: ShieldAlert, tone: "bg-red-500/10 text-red-700 dark:text-red-300" },
  Controle: { id: "Controle", icon: ShieldCheck, tone: "bg-teal-500/10 text-teal-700 dark:text-teal-300" },
  Indicador: { id: "Indicador", icon: Gauge, tone: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300" },
  "Área": { id: "Área", icon: Briefcase, tone: "bg-muted text-muted-foreground" },
  Cargo: { id: "Cargo", icon: Users, tone: "bg-muted text-muted-foreground" },
  Pessoa: { id: "Pessoa", icon: User, tone: "bg-muted text-muted-foreground" },
  Sistema: { id: "Sistema", icon: MonitorCog, tone: "bg-slate-500/10 text-slate-700 dark:text-slate-300" },
  Documento: { id: "Documento", icon: FileText, tone: "bg-muted text-muted-foreground" },
};

export const OBJECT_TYPE_LIST: RelatedObjectType[] = Object.keys(
  OBJECT_TYPES,
) as RelatedObjectType[];

/** Tipos de relacionamento disponíveis nesta build. */
export const RELATIONSHIP_KINDS = [
  "Origina",
  "Depende de",
  "Complementa",
  "Substitui",
  "Executa",
  "Controla",
  "Mitiga",
  "Consulta",
  "É utilizado por",
  "Está relacionado",
  "Faz referência",
  "Produz",
  "Consome",
] as const;

export type RelationshipKind = (typeof RELATIONSHIP_KINDS)[number];

/** Grau de impacto do vínculo. */
export type ImpactLevel = "crítico" | "alto" | "médio" | "baixo";

export const IMPACT_LEVELS: ImpactLevel[] = ["crítico", "alto", "médio", "baixo"];

export const IMPACT_TONE: Record<ImpactLevel, string> = {
  "crítico": "bg-red-500/10 text-red-700 dark:text-red-300",
  alto: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  "médio": "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  baixo: "bg-muted text-muted-foreground",
};

/** Vínculos que caracterizam dependência (usado nos indicadores discretos). */
export const DEPENDENCY_KINDS: RelationshipKind[] = [
  "Depende de",
  "Consome",
  "Executa",
];

export interface CatalogObject {
  id: string;
  name: string;
  type: RelatedObjectType;
  detail: string;
}

/**
 * Catálogo simulado de objetos corporativos disponíveis para vínculo.
 * Substituído por fonte real em builds futuras, mantendo o formato.
 */
export const OBJECT_CATALOG: CatalogObject[] = [
  { id: "kp-fiscal", name: "Conhecimento Fiscal", type: "Knowledge Package", detail: "v3.0 · publicado" },
  { id: "kp-seguranca", name: "Segurança da Informação", type: "Knowledge Package", detail: "v1.8 · em revisão" },
  { id: "kp-atendimento", name: "Manual de Atendimento ao Cliente", type: "Manual", detail: "v2.1 · publicado" },
  { id: "kp-faq-op", name: "FAQ Operacional", type: "FAQ", detail: "v1.4 · publicado" },
  { id: "pop-014", name: "POP-014 Abertura de Conta", type: "POP", detail: "v1.2 · publicado" },
  { id: "pop-021", name: "POP-021 Conferência de Caixa", type: "POP", detail: "v0.9 · rascunho" },
  { id: "pr-onboarding", name: "Onboarding de Clientes", type: "Processo", detail: "v1.4 · em revisão" },
  { id: "pr-fornecedores", name: "Gestão de Fornecedores", type: "Processo", detail: "v0.9 · rascunho" },
  { id: "pr-fechamento", name: "Fechamento Mensal", type: "Processo", detail: "v2.0 · publicado" },
  { id: "nr-psi", name: "Política de Segurança da Informação", type: "Norma", detail: "vigente" },
  { id: "nr-conduta", name: "Código de Conduta", type: "Norma", detail: "vigente" },
  { id: "nr-credito", name: "Política de Crédito", type: "Norma", detail: "vigente" },
  { id: "ck-turno", name: "Checklist de Abertura de Turno", type: "Checklist", detail: "v1.0" },
  { id: "ck-conformidade", name: "Checklist de Conformidade", type: "Checklist", detail: "v3.2" },
  { id: "fx-onboarding", name: "BPMN Onboarding v2", type: "Fluxograma", detail: "modelagem" },
  { id: "rk-231", name: "Risco R-231 — Falha de Cadastro", type: "Risco", detail: "alto" },
  { id: "rk-118", name: "Risco R-118 — Vazamento de Dados", type: "Risco", detail: "crítico" },
  { id: "ct-dupla", name: "Controle C-07 Dupla Checagem", type: "Controle", detail: "ativo" },
  { id: "ct-acesso", name: "Controle C-12 Revisão de Acessos", type: "Controle", detail: "ativo" },
  { id: "in-sla", name: "SLA de Ativação", type: "Indicador", detail: "meta 95%" },
  { id: "in-churn", name: "Indicador de Churn", type: "Indicador", detail: "meta < 3%" },
  { id: "ar-operacoes", name: "Operações", type: "Área", detail: "12 pessoas" },
  { id: "ar-compliance", name: "Compliance", type: "Área", detail: "5 pessoas" },
  { id: "cg-analista", name: "Analista de Processos", type: "Cargo", detail: "8 posições" },
  { id: "ps-marina", name: "Marina Alves", type: "Pessoa", detail: "Gestora de Processos" },
  { id: "ps-camila", name: "Camila Torres", type: "Pessoa", detail: "Especialista Fiscal" },
  { id: "sy-crm", name: "CRM Corporativo", type: "Sistema", detail: "integração ativa" },
  { id: "sy-erp", name: "ERP Financeiro", type: "Sistema", detail: "integração ativa" },
  { id: "dc-contrato", name: "Contrato Padrão de Serviço", type: "Documento", detail: "modelo v4" },
  { id: "dc-matriz", name: "Matriz de Alçadas", type: "Documento", detail: "revisão anual" },
];
