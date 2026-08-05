/**
 * Build 003 — templates iniciais por tipo de conhecimento.
 *
 * Cada tipo começa com uma estrutura de blocos diferente.
 * Somente conteúdo inicial; nenhuma regra de negócio.
 */

import type { KnowledgeType } from "./knowledge-types";
import type { KnowledgeCategory } from "./knowledge-demo";

export type KnowledgeBlockType =
  | "title"
  | "subtitle"
  | "text"
  | "list"
  | "table"
  | "callout"
  | "divider";

export interface KnowledgeBlock {
  id: string;
  type: KnowledgeBlockType;
  /** Texto para title/subtitle/text/callout. */
  text?: string;
  /** Itens para list. */
  items?: string[];
  /** Linhas para table (primeira linha é o cabeçalho). */
  rows?: string[][];
}

export function createBlockId() {
  return `b_${Math.random().toString(36).slice(2, 10)}`;
}

function b(block: Omit<KnowledgeBlock, "id">): KnowledgeBlock {
  return { id: createBlockId(), ...block };
}

export interface KnowledgeTemplate {
  type: KnowledgeType;
  defaultName: string;
  defaultCategory: KnowledgeCategory;
  description: string;
  blocks: () => KnowledgeBlock[];
}

export const KNOWLEDGE_TEMPLATES: Record<KnowledgeType, KnowledgeTemplate> = {
  POP: {
    type: "POP",
    defaultName: "Novo POP",
    defaultCategory: "Operações",
    description: "Procedimento Operacional Padrão em elaboração.",
    blocks: () => [
      b({ type: "title", text: "Novo POP" }),
      b({ type: "callout", text: "Objetivo: descreva o propósito deste procedimento." }),
      b({ type: "subtitle", text: "Escopo" }),
      b({ type: "text", text: "Onde e para quem este procedimento se aplica." }),
      b({ type: "subtitle", text: "Etapas do procedimento" }),
      b({ type: "list", items: ["Etapa 1", "Etapa 2", "Etapa 3"] }),
      b({ type: "divider" }),
      b({ type: "subtitle", text: "Responsabilidades" }),
      b({
        type: "table",
        rows: [
          ["Papel", "Responsabilidade"],
          ["Executor", "Realizar as etapas"],
          ["Aprovador", "Validar a execução"],
        ],
      }),
    ],
  },
  Manual: {
    type: "Manual",
    defaultName: "Novo Manual",
    defaultCategory: "Tecnologia",
    description: "Manual de referência em elaboração.",
    blocks: () => [
      b({ type: "title", text: "Novo Manual" }),
      b({ type: "text", text: "Apresentação e público-alvo deste manual." }),
      b({ type: "subtitle", text: "Capítulos" }),
      b({ type: "list", items: ["Introdução", "Conceitos", "Uso prático"] }),
      b({ type: "divider" }),
      b({ type: "subtitle", text: "Referências" }),
      b({ type: "text", text: "Documentos e normas relacionadas." }),
    ],
  },
  Norma: {
    type: "Norma",
    defaultName: "Nova Norma",
    defaultCategory: "Compliance",
    description: "Norma institucional em elaboração.",
    blocks: () => [
      b({ type: "title", text: "Nova Norma" }),
      b({ type: "callout", text: "Vigência: definir data de início e revisão." }),
      b({ type: "subtitle", text: "Finalidade" }),
      b({ type: "text", text: "Motivo da existência desta norma." }),
      b({ type: "subtitle", text: "Diretrizes" }),
      b({ type: "list", items: ["Diretriz 1", "Diretriz 2"] }),
      b({ type: "divider" }),
      b({ type: "subtitle", text: "Penalidades e exceções" }),
      b({ type: "text", text: "Descreva aqui." }),
    ],
  },
  FAQ: {
    type: "FAQ",
    defaultName: "Novo FAQ",
    defaultCategory: "Pessoas",
    description: "Perguntas frequentes em elaboração.",
    blocks: () => [
      b({ type: "title", text: "Novo FAQ" }),
      b({ type: "subtitle", text: "Pergunta 1" }),
      b({ type: "text", text: "Resposta objetiva." }),
      b({ type: "subtitle", text: "Pergunta 2" }),
      b({ type: "text", text: "Resposta objetiva." }),
    ],
  },
  Checklist: {
    type: "Checklist",
    defaultName: "Novo Checklist",
    defaultCategory: "Operações",
    description: "Checklist de verificação em elaboração.",
    blocks: () => [
      b({ type: "title", text: "Novo Checklist" }),
      b({ type: "callout", text: "Use este checklist antes de concluir a atividade." }),
      b({ type: "list", items: ["Verificar item 1", "Verificar item 2", "Verificar item 3"] }),
      b({ type: "divider" }),
      b({ type: "subtitle", text: "Evidências" }),
      b({
        type: "table",
        rows: [
          ["Item", "Evidência"],
          ["Item 1", "—"],
        ],
      }),
    ],
  },
  Fluxograma: {
    type: "Fluxograma",
    defaultName: "Novo Fluxograma",
    defaultCategory: "Operações",
    description: "Descrição textual de fluxo em elaboração.",
    blocks: () => [
      b({ type: "title", text: "Novo Fluxograma" }),
      b({ type: "text", text: "Descrição textual do fluxo (o desenho BPMN chega em builds futuras)." }),
      b({ type: "subtitle", text: "Sequência" }),
      b({ type: "list", items: ["Início", "Atividade", "Decisão", "Fim"] }),
      b({ type: "divider" }),
      b({
        type: "table",
        rows: [
          ["Etapa", "Área"],
          ["Início", "Solicitante"],
        ],
      }),
    ],
  },
};
