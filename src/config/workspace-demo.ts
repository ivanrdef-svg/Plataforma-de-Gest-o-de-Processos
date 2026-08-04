/**
 * Dados simulados da Sprint 001 (Workspace Foundation).
 *
 * Nenhuma regra de negócio aqui — apenas conteúdo fictício para dar vida
 * à infraestrutura visual. Em sprints futuras estes dados serão substituídos
 * por fontes reais, mantendo os mesmos formatos.
 */

export interface DemoWorkspace {
  id: string;
  name: string;
  type: string;
  version: string;
  status: "rascunho" | "em revisão" | "publicado";
  owner: string;
  updatedAt: string;
  description: string;
}

export const DEMO_WORKSPACES: DemoWorkspace[] = [
  {
    id: "onboarding-clientes",
    name: "Onboarding de Clientes",
    type: "Processo",
    version: "v1.4",
    status: "em revisão",
    owner: "Marina Alves",
    updatedAt: "há 2 horas",
    description:
      "Jornada completa de entrada de novos clientes, do cadastro à ativação.",
  },
  {
    id: "gestao-fornecedores",
    name: "Gestão de Fornecedores",
    type: "Processo",
    version: "v0.9",
    status: "rascunho",
    owner: "Rafael Souza",
    updatedAt: "ontem",
    description: "Homologação, contratação e avaliação periódica de fornecedores.",
  },
  {
    id: "base-conhecimento-fiscal",
    name: "Base de Conhecimento Fiscal",
    type: "Conhecimento",
    version: "v3.0",
    status: "publicado",
    owner: "Camila Torres",
    updatedAt: "há 3 dias",
    description: "Repositório de regras, obrigações e orientações fiscais.",
  },
];

export const DEMO_RELATIONS = {
  relacionamentos: [
    "Política de Crédito",
    "Cadastro Único de Clientes",
    "Matriz de Alçadas",
  ],
  dependencias: ["Integração CRM", "Validação de Documentos"],
  impactos: ["SLA de Ativação", "Indicador de Churn"],
  objetos: ["POP-014 Abertura de Conta", "BPMN Onboarding v2", "Risco R-231"],
};

export const DEMO_TASKS = [
  { id: "t1", title: "Revisar etapas do Onboarding", due: "Hoje" },
  { id: "t2", title: "Validar matriz de responsabilidades", due: "Amanhã" },
  { id: "t3", title: "Aprovar versão v1.4", due: "Sexta" },
];

export const DEMO_FAVORITES = [
  { id: "f1", title: "Onboarding de Clientes", type: "Processo" },
  { id: "f2", title: "Base de Conhecimento Fiscal", type: "Conhecimento" },
];

export const DEMO_ENVIRONMENT = {
  status: "Pronto",
  lastSync: "há 1 minuto",
  version: "Sprint 001",
  environment: "Preview",
};

/**
 * Build 2.5 — "Continue trabalhando": últimos objetos abertos pelo usuário.
 * Dados simulados; a fonte real chega em builds futuras mantendo o formato.
 */
export interface DemoRecentObject {
  id: string;
  name: string;
  type: string;
  editedAt: string;
  owner: string;
  /** Progresso opcional (0-100) — exibido como barra discreta. */
  progress?: number;
  /** Rota de destino do botão "Continuar". */
  to: "workspace" | "knowledge";
  targetId: string;
}

export const DEMO_RECENT_OBJECTS: DemoRecentObject[] = [
  {
    id: "r1",
    name: "Onboarding de Clientes",
    type: "Processo",
    editedAt: "há 12 minutos",
    owner: "Marina Alves",
    progress: 72,
    to: "workspace",
    targetId: "onboarding-clientes",
  },
  {
    id: "r2",
    name: "Conhecimento Fiscal",
    type: "Knowledge Package",
    editedAt: "há 3 horas",
    owner: "Camila Torres",
    progress: 100,
    to: "knowledge",
    targetId: "conhecimento-fiscal",
  },
  {
    id: "r3",
    name: "Gestão de Fornecedores",
    type: "Processo",
    editedAt: "ontem",
    owner: "Rafael Souza",
    progress: 34,
    to: "workspace",
    targetId: "gestao-fornecedores",
  },
  {
    id: "r4",
    name: "Segurança da Informação",
    type: "Knowledge Package",
    editedAt: "há 2 dias",
    owner: "Bruno Lima",
    to: "knowledge",
    targetId: "seguranca-informacao",
  },
];
