/**
 * Build 006 — Process Builder.
 *
 * O Processo é uma entidade estruturada da plataforma. Ele nasce do
 * conhecimento existente (Knowledge Packages, POPs, Normas, Checklists)
 * e, em builds futuras, originará BPM, Workflow e indicadores.
 *
 * Nada aqui substitui estruturas existentes: é uma camada adicional que
 * segue exatamente o padrão do POP Builder (Build 004).
 */

export type ProcessSectionId =
  | "resumo"
  | "objetivo"
  | "escopo"
  | "entradas"
  | "saidas"
  | "participantes"
  | "sistemas"
  | "documentos";

export interface ProcessSectionTemplate {
  id: ProcessSectionId;
  title: string;
  hint: string;
  content: string;
}

export const PROCESS_SECTION_TEMPLATES: ProcessSectionTemplate[] = [
  {
    id: "resumo",
    title: "Resumo",
    hint: "Visão geral do processo em poucas linhas.",
    content: "Descreva de forma sintética o que este processo entrega ao negócio.",
  },
  {
    id: "objetivo",
    title: "Objetivo",
    hint: "O resultado que este processo garante.",
    content: "Objetivo principal:\nResultado esperado:",
  },
  {
    id: "escopo",
    title: "Escopo",
    hint: "Onde o processo começa e onde termina.",
    content: "Início do processo:\nFim do processo:\nNão faz parte deste processo:",
  },
  {
    id: "entradas",
    title: "Entradas",
    hint: "O que o processo recebe para poder começar.",
    content: "• Entrada 1 — origem\n• Entrada 2 — origem",
  },
  {
    id: "saidas",
    title: "Saídas",
    hint: "O que o processo entrega ao final.",
    content: "• Saída 1 — destinatário\n• Saída 2 — destinatário",
  },
  {
    id: "participantes",
    title: "Participantes",
    hint: "Áreas, cargos e pessoas envolvidas na execução.",
    content: "Área responsável:\nÁreas participantes:\nAprovador:",
  },
  {
    id: "sistemas",
    title: "Sistemas envolvidos",
    hint: "Plataformas e integrações utilizadas pelo processo.",
    content: "• Sistema — finalidade\n• Sistema — finalidade",
  },
  {
    id: "documentos",
    title: "Documentos relacionados",
    hint: "Formulários, modelos e registros usados ou gerados.",
    content: "• Documento — momento de uso",
  },
];

/** Etapas iniciais sugeridas ao criar um processo. */
export const PROCESS_STEP_SEEDS = [
  {
    name: "Recebimento da solicitação",
    description: "Entrada formal da demanda no processo.",
    owner: "Área solicitante",
    inputs: "Solicitação registrada",
    outputs: "Demanda validada",
    duration: "1 dia",
  },
  {
    name: "Análise e triagem",
    description: "Verificação de completude e priorização.",
    owner: "Analista de processos",
    inputs: "Demanda validada",
    outputs: "Demanda classificada",
    duration: "2 dias",
  },
  {
    name: "Execução",
    description: "Realização das atividades conforme POP relacionado.",
    owner: "Time executor",
    inputs: "Demanda classificada",
    outputs: "Entrega produzida",
    duration: "5 dias",
  },
  {
    name: "Validação e encerramento",
    description: "Conferência do resultado e registro do encerramento.",
    owner: "Gestor do processo",
    inputs: "Entrega produzida",
    outputs: "Processo encerrado",
    duration: "1 dia",
  },
];

/** Origem simulada do processo (Build 006). */
export const PROCESS_DEMO_ORIGIN = [
  {
    group: "Knowledge Packages",
    type: "Knowledge Package" as const,
    items: [
      { name: "Manual de Atendimento ao Cliente", detail: "Manual · v2.1" },
      { name: "Base de Conhecimento Operacional", detail: "Knowledge · v1.8" },
    ],
  },
  {
    group: "POPs relacionados",
    type: "POP" as const,
    items: [
      { name: "POP-001 — Abertura de Chamado", detail: "POP · publicado" },
      { name: "POP-004 — Validação de Entrega", detail: "POP · em revisão" },
    ],
  },
  {
    group: "Normas relacionadas",
    type: "Norma" as const,
    items: [
      { name: "Política de Segurança da Informação", detail: "Norma · vigente" },
      { name: "Norma de Atendimento SLA", detail: "Norma · vigente" },
    ],
  },
  {
    group: "Checklists relacionados",
    type: "Checklist" as const,
    items: [
      { name: "Checklist de Conformidade", detail: "Checklist · v3.2" },
      { name: "Checklist de Encerramento", detail: "Checklist · v1.1" },
    ],
  },
];

/** Timeline fictícia do processo (Build 006). */
export const PROCESS_DEMO_HISTORY = [
  {
    date: "Hoje",
    title: "Processo criado",
    author: "Você",
    detail: "Estrutura base gerada a partir do conhecimento existente.",
  },
  {
    date: "Ontem",
    title: "Etapas revisadas",
    author: "Marina Alves",
    detail: "Tempo estimado da etapa de execução ajustado de 7 para 5 dias.",
  },
  {
    date: "12 de março",
    title: "Origem vinculada",
    author: "Sistema",
    detail: "POP-001 e Manual de Atendimento associados como origem.",
  },
  {
    date: "28 de fevereiro",
    title: "Escopo aprovado",
    author: "Carlos Menezes",
    detail: "Fronteiras de início e fim do processo validadas.",
  },
];

/** KPIs simulados do Process Center. */
export const PROCESS_CENTER_STATS = [
  { id: "total", label: "Processos" },
  { id: "desenvolvimento", label: "Em desenvolvimento" },
  { id: "publicados", label: "Publicados" },
  { id: "etapas", label: "Etapas mapeadas" },
  { id: "prontos", label: "Prontos para BPM" },
];

/** Processos simulados em andamento (widget da Home). */
export const PROCESS_DEMO_IN_PROGRESS = [
  {
    id: "demo-onboarding",
    name: "Onboarding de Clientes",
    area: "Comercial",
    stage: "Mapeamento de etapas",
    progress: 72,
    steps: 9,
  },
  {
    id: "demo-fechamento",
    name: "Fechamento Contábil Mensal",
    area: "Financeiro",
    stage: "Validação de escopo",
    progress: 45,
    steps: 6,
  },
  {
    id: "demo-compras",
    name: "Compras e Suprimentos",
    area: "Suprimentos",
    stage: "Pronto para BPM",
    progress: 91,
    steps: 12,
  },
];
