/**
 * Build 011 — Workflow Foundation.
 *
 * Camada adicional de DEFINIÇÃO de workflow. Nada é substituído: os tipos de
 * etapa continuam sendo os do Process Modeling Engine (Build 007) e os papéis
 * continuam sendo os do Governance Engine (Build 010). Aqui ficam apenas os
 * vocabulários próprios da preparação para execução.
 *
 * O motor de execução (Workflow Runtime) será implementado em uma build futura.
 */

import type { ProcessStepTypeId } from "./process-model";

/* ------------------------------------------------------------------ */
/* Tipos de execução (derivados dos tipos de etapa já existentes)      */
/* ------------------------------------------------------------------ */

/** Subconjunto executável dos tipos do Process Modeling Engine. */
export const WORKFLOW_EXECUTION_TYPES: ProcessStepTypeId[] = [
  "atividade",
  "aprovacao",
  "validacao",
  "decisao",
  "consulta",
  "comunicacao",
  "integracao",
  "espera",
];

/**
 * Rótulo de execução. "Atividade" no modelo organizacional é uma "Tarefa"
 * quando o processo passa a ser executado — o tipo continua sendo o mesmo.
 */
export const EXECUTION_LABEL: Partial<Record<ProcessStepTypeId, string>> = {
  atividade: "Tarefa",
};

export function executionLabel(id: string | undefined, fallback: string): string {
  return EXECUTION_LABEL[(id ?? "") as ProcessStepTypeId] ?? fallback;
}

/* ------------------------------------------------------------------ */
/* Estados da definição (espelham o Lifecycle Engine existente)        */
/* ------------------------------------------------------------------ */

export const WORKFLOW_STATUS_OPTIONS = [
  "rascunho",
  "em configuração",
  "em revisão",
  "aprovado",
  "publicado",
  "arquivado",
] as const;

export type WorkflowStatus = (typeof WORKFLOW_STATUS_OPTIONS)[number];

/* ------------------------------------------------------------------ */
/* Indicadores do Workflow Center                                      */
/* ------------------------------------------------------------------ */

export const WORKFLOW_CENTER_STATS = [
  { id: "total", label: "Workflows" },
  { id: "configuracao", label: "Em configuração" },
  { id: "publicados", label: "Publicados" },
  { id: "execucao", label: "Em execução" },
  { id: "etapas", label: "Etapas executáveis" },
  { id: "participantes", label: "Participantes" },
];

/* ------------------------------------------------------------------ */
/* Sementes de configuração das etapas                                 */
/* ------------------------------------------------------------------ */

export const EXECUTION_RULE_HINTS = {
  precondition: "O que precisa estar pronto para a etapa iniciar.",
  condition: "Condição que decide se a etapa ocorre.",
  deadline: "Prazo esperado para conclusão (ex.: 2 dias úteis).",
  expectedAction: "Ação esperada de quem executa a etapa.",
};

/** Histórico simulado usado quando o workflow ainda não tem eventos reais. */
export const WORKFLOW_DEMO_HISTORY = [
  {
    date: "há 3 dias",
    title: "Processo associado",
    detail: "Definição de workflow criada a partir do processo modelado.",
    author: "Marina Duarte",
  },
  {
    date: "há 2 dias",
    title: "Etapas configuradas",
    detail: "Responsáveis, entradas e saídas herdados do Process Modeling Engine.",
    author: "Rafael Lima",
  },
  {
    date: "ontem",
    title: "Participantes definidos",
    detail: "Papéis de governança associados às etapas executáveis.",
    author: "Camila Torres",
  },
];
