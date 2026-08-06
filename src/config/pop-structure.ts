/**
 * Build 004 — estrutura do POP (Procedimento Operacional Padrão).
 *
 * O POP é um objeto estruturado: uma lista de seções independentes,
 * não um documento de texto. Builds futuras podem acrescentar seções
 * sem alterar componentes.
 */

export type PopSectionId =
  | "informacoes-gerais"
  | "objetivo"
  | "escopo"
  | "responsabilidades"
  | "recursos"
  | "procedimento"
  | "atencao"
  | "indicadores"
  | "referencias"
  | "revisoes";

export interface PopSectionTemplate {
  id: PopSectionId;
  title: string;
  hint: string;
  /** Conteúdo inicial (texto orientativo). */
  content: string;
}

export const POP_SECTION_TEMPLATES: PopSectionTemplate[] = [
  {
    id: "informacoes-gerais",
    title: "Informações Gerais",
    hint: "Identificação, área responsável e contexto do procedimento.",
    content:
      "Área responsável:\nProcesso relacionado:\nPúblico-alvo:\nPeriodicidade de execução:",
  },
  {
    id: "objetivo",
    title: "Objetivo",
    hint: "Para que este POP existe.",
    content: "Descreva o resultado que este procedimento garante.",
  },
  {
    id: "escopo",
    title: "Escopo",
    hint: "Onde se aplica e o que fica de fora.",
    content: "Aplica-se a:\nNão se aplica a:",
  },
  {
    id: "responsabilidades",
    title: "Responsabilidades",
    hint: "Quem executa, quem valida, quem aprova.",
    content: "Executor:\nRevisor:\nAprovador:",
  },
  {
    id: "recursos",
    title: "Recursos Necessários",
    hint: "Sistemas, documentos, materiais e acessos.",
    content: "Sistemas:\nDocumentos:\nAcessos necessários:",
  },
  {
    id: "procedimento",
    title: "Procedimento",
    hint: "Sequência de etapas da execução.",
    content: "1. Primeira etapa\n2. Segunda etapa\n3. Terceira etapa",
  },
  {
    id: "atencao",
    title: "Pontos de Atenção",
    hint: "Riscos, exceções e erros comuns.",
    content: "• Ponto crítico 1\n• Ponto crítico 2",
  },
  {
    id: "indicadores",
    title: "Indicadores",
    hint: "Como medir a execução deste procedimento.",
    content: "Indicador:\nMeta:\nFonte de dados:",
  },
  {
    id: "referencias",
    title: "Referências",
    hint: "Normas, políticas e conhecimentos relacionados.",
    content: "• Norma relacionada\n• Manual relacionado",
  },
  {
    id: "revisoes",
    title: "Histórico de Revisões",
    hint: "Registro das versões deste POP.",
    content: "v0.1 — Criação do procedimento.",
  },
];

/** Dados simulados de vínculos (Build 004). */
export const POP_DEMO_RELATIONS = [
  {
    group: "Knowledge Packages",
    items: [
      { name: "Manual de Atendimento ao Cliente", detail: "Manual · v2.1" },
      { name: "FAQ Operacional", detail: "FAQ · v1.4" },
    ],
  },
  {
    group: "Processos",
    items: [
      { name: "Onboarding de Clientes", detail: "Processo · em execução" },
      { name: "Fechamento Mensal", detail: "Processo · publicado" },
    ],
  },
  {
    group: "Normas",
    items: [
      { name: "Política de Segurança da Informação", detail: "Norma · vigente" },
      { name: "Código de Conduta", detail: "Norma · vigente" },
    ],
  },
  {
    group: "Checklists",
    items: [
      { name: "Checklist de Abertura de Turno", detail: "Checklist · v1.0" },
      { name: "Checklist de Conformidade", detail: "Checklist · v3.2" },
    ],
  },
];

/** Timeline fictícia de alterações (Build 004). */
export const POP_DEMO_HISTORY = [
  {
    date: "Hoje",
    title: "Rascunho criado",
    author: "Você",
    detail: "Estrutura padrão de POP gerada com 10 seções.",
  },
  {
    date: "Ontem",
    title: "Seção Indicadores revisada",
    author: "Marina Alves",
    detail: "Meta ajustada de 92% para 95% de conformidade.",
  },
  {
    date: "12 de março",
    title: "Aprovação de conteúdo",
    author: "Carlos Menezes",
    detail: "Revisão de escopo e responsabilidades concluída.",
  },
  {
    date: "28 de fevereiro",
    title: "Vínculo com processo",
    author: "Sistema",
    detail: "POP relacionado ao processo Onboarding de Clientes.",
  },
];
