/**
 * Dados simulados do Build 002 (Knowledge Center).
 *
 * Somente conteúdo fictício para dar vida à interface do módulo de
 * conhecimento. Nenhuma regra de negócio, CRUD ou persistência aqui.
 * Sprints futuras substituem a fonte mantendo estes formatos.
 */

export type KnowledgeStatus = "rascunho" | "em revisão" | "publicado";

export interface KnowledgePackage {
  /** Identificador estável usado na rota. Nunca renomear. */
  id: string;
  name: string;
  category: KnowledgeCategory;
  owner: string;
  status: KnowledgeStatus;
  version: string;
  updatedAt: string;
  description: string;
  /** Métricas fictícias exibidas no card. */
  articles: number;
  linkedObjects: number;
}

export type KnowledgeCategory =
  | "Financeiro"
  | "Operações"
  | "Pessoas"
  | "Tecnologia"
  | "Compliance"
  | "Comercial";

export const KNOWLEDGE_CATEGORIES: KnowledgeCategory[] = [
  "Financeiro",
  "Operações",
  "Pessoas",
  "Tecnologia",
  "Compliance",
  "Comercial",
];

export const KNOWLEDGE_PACKAGES: KnowledgePackage[] = [
  {
    id: "conhecimento-fiscal",
    name: "Conhecimento Fiscal",
    category: "Financeiro",
    owner: "Camila Torres",
    status: "publicado",
    version: "v3.0",
    updatedAt: "há 3 dias",
    description:
      "Regras, obrigações acessórias e orientações fiscais consolidadas para todas as filiais.",
    articles: 42,
    linkedObjects: 12,
  },
  {
    id: "onboarding-clientes",
    name: "Onboarding de Clientes",
    category: "Comercial",
    owner: "Marina Alves",
    status: "em revisão",
    version: "v1.4",
    updatedAt: "há 2 horas",
    description:
      "Tudo que a organização sabe sobre a jornada de entrada e ativação de novos clientes.",
    articles: 28,
    linkedObjects: 9,
  },
  {
    id: "gestao-fornecedores",
    name: "Gestão de Fornecedores",
    category: "Operações",
    owner: "Rafael Souza",
    status: "rascunho",
    version: "v0.9",
    updatedAt: "ontem",
    description:
      "Homologação, contratação e avaliação periódica da base de fornecedores.",
    articles: 17,
    linkedObjects: 6,
  },
  {
    id: "seguranca-informacao",
    name: "Segurança da Informação",
    category: "Tecnologia",
    owner: "Bruno Lima",
    status: "publicado",
    version: "v2.2",
    updatedAt: "há 1 semana",
    description:
      "Diretrizes de proteção de dados, acessos, incidentes e continuidade tecnológica.",
    articles: 35,
    linkedObjects: 21,
  },
  {
    id: "ciclo-de-vida-do-colaborador",
    name: "Ciclo de Vida do Colaborador",
    category: "Pessoas",
    owner: "Aline Prado",
    status: "em revisão",
    version: "v1.1",
    updatedAt: "há 4 dias",
    description:
      "Admissão, desenvolvimento, movimentações e desligamento sob a ótica do conhecimento.",
    articles: 23,
    linkedObjects: 8,
  },
  {
    id: "programa-de-compliance",
    name: "Programa de Compliance",
    category: "Compliance",
    owner: "Eduardo Nunes",
    status: "publicado",
    version: "v4.1",
    updatedAt: "há 2 semanas",
    description:
      "Código de conduta, políticas antifraude, canal de denúncias e trilhas de treinamento.",
    articles: 51,
    linkedObjects: 30,
  },
];

export const KNOWLEDGE_QUICK_FILTERS = [
  { id: "todos", label: "Todos" },
  { id: "publicado", label: "Publicados" },
  { id: "em revisão", label: "Em revisão" },
  { id: "rascunho", label: "Rascunhos" },
] as const;

export type KnowledgeQuickFilter = (typeof KNOWLEDGE_QUICK_FILTERS)[number]["id"];

export function getKnowledgePackage(id: string): KnowledgePackage | undefined {
  return KNOWLEDGE_PACKAGES.find((p) => p.id === id);
}
