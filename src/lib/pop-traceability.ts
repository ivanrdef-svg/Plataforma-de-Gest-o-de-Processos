/**
 * Build 031 — Etapa 1: rastreabilidade derivada de uma seção de POP.
 *
 * Funções PURAS: não leem nem escrevem nenhum store. Todos os dados chegam
 * prontos pelo chamador (a UI da Etapa 2 usará os hooks reativos existentes).
 *
 * Regra central do briefing: somente mapeamentos CONFIRMADOS participam da
 * rastreabilidade operacional (ProcessStep → BPMN → Workflow → execuções).
 */

import type { PopProcessStepMapping } from "@/config/pop-process-step-mapping-model";
import type { BpmDiagram } from "@/config/bpm-model";
import type { PopDoc, PopSection } from "@/lib/pop-store";
import type { ProcessDoc } from "@/lib/process-store";
import type { WorkflowDoc } from "@/lib/workflow-store";
import type { WorkflowInstance } from "@/lib/runtime-store";
import { getExecutedWorkflowVersion } from "@/lib/runtime-history";

export interface BpmTraceRef {
  diagramProcessId: string;
  nodeId: string;
  nodeName: string;
}

export interface WorkflowTraceRef {
  workflowId: string;
  workflowName: string;
  stepId: string;
  stepName: string;
  instanceCount: number;
  /** Present only on historical rows; current editorial rows have no executions. */
  workflowVersionId?: string;
  workflowVersion?: number;
}

export interface ProcessStepTraceRef {
  processStepId: string;
  processStepName: string;
  processStepOrder?: number;
}

export type PopSectionMappingStatus =
  | "nao-mapeada"
  | "sugerido"
  | "confirmado"
  | "rejeitado";

export type PopSectionTraceInconsistency =
  | "step-inexistente"
  | "step-de-outro-processo"
  | "processo-nao-vinculado";

export interface PopSectionTraceability {
  popSectionId: string;
  mappingStatus: PopSectionMappingStatus;
  /** Só quando `mappingStatus === "confirmado"` e o step existe. */
  processStep?: ProcessStepTraceRef;
  processStepInconsistency?: PopSectionTraceInconsistency;
  bpmNodes: BpmTraceRef[];
  workflowSteps: WorkflowTraceRef[];
}

export interface PopTraceabilityInput {
  section: PopSection;
  mappings: PopProcessStepMapping[];
  process?: ProcessDoc;
  bpmDiagram?: BpmDiagram;
  workflowDocs: WorkflowDoc[];
  instances: WorkflowInstance[];
}

/* ------------------------------------------------------------------ */
/* Índices (montados uma única vez quando há muitas seções)            */
/* ------------------------------------------------------------------ */

interface TraceIndexes {
  process: ProcessDoc | undefined;
  /** processStepId → { step, order } */
  processSteps: Map<string, { name: string; order: number }>;
  bpmProcessId: string | undefined;
  /** processStepId → nós do diagrama */
  bpmNodesByStep: Map<string, BpmTraceRef[]>;
  /** processStepId → etapas de workflow (do mesmo Processo) já com contagem */
  workflowStepsByProcessStep: Map<string, WorkflowTraceRef[]>;
}

function buildIndexes(input: {
  process?: ProcessDoc;
  bpmDiagram?: BpmDiagram;
  workflowDocs: WorkflowDoc[];
  instances: WorkflowInstance[];
}): TraceIndexes {
  const { process, bpmDiagram, workflowDocs, instances } = input;

  const processSteps = new Map<string, { name: string; order: number }>();
  process?.steps.forEach((step, index) => {
    processSteps.set(step.id, { name: step.name, order: index + 1 });
  });

  const bpmNodesByStep = new Map<string, BpmTraceRef[]>();
  // O diagrama só é considerado quando pertence ao Processo vinculado.
  const diagram =
    bpmDiagram && process && bpmDiagram.processId === process.id ? bpmDiagram : undefined;
  for (const node of diagram?.nodes ?? []) {
    if (!node.stepId) continue;
    const list = bpmNodesByStep.get(node.stepId) ?? [];
    list.push({
      diagramProcessId: diagram!.processId,
      nodeId: node.id,
      nodeName: node.name,
    });
    bpmNodesByStep.set(node.stepId, list);
  }

  const workflowStepsByProcessStep = new Map<string, WorkflowTraceRef[]>();
  if (process) {
    const relevant = workflowDocs.filter((wf) => wf.processId === process.id);
    for (const wf of relevant) {
      for (const step of wf.steps) {
        const ref: WorkflowTraceRef = {
          workflowId: wf.id,
          workflowName: wf.name,
          stepId: step.id,
          stepName: step.name,
          instanceCount: 0,
        };
        const list = workflowStepsByProcessStep.get(step.processStepId) ?? [];
        list.push(ref);
        workflowStepsByProcessStep.set(step.processStepId, list);
      }
    }
  }

  // Historical joins use the executed snapshot, even if current steps were removed/remapped.
  const historicalRefs = new Map<string, WorkflowTraceRef>();
  for (const instance of instances) {
    if (!process || instance.processId !== process.id) continue;
    const version = getExecutedWorkflowVersion(instance, workflowDocs.find(wf => wf.id === instance.workflowId));
    if (!version?.content || version.content.processId !== process.id) continue;
    const seen = new Set<string>();
    for (const task of instance.tasks) {
      if (seen.has(task.stepId)) continue;
      seen.add(task.stepId);
      const step = version.content.steps.find(s => s.id === task.stepId);
      if (!step) continue;
      const key = JSON.stringify([instance.workflowId, version.versionId, step.id]);
      const existing = historicalRefs.get(key);
      if (existing) {
        existing.instanceCount += 1;
        continue;
      }
      const ref: WorkflowTraceRef = {
        workflowId: instance.workflowId,
        workflowName: instance.workflowName,
        stepId: task.stepId,
        stepName: task.name,
        instanceCount: 1,
        workflowVersionId: version.versionId,
        workflowVersion: version.number,
      };
      historicalRefs.set(key, ref);
      const list = workflowStepsByProcessStep.get(step.processStepId) ?? [];
      list.push(ref);
      workflowStepsByProcessStep.set(step.processStepId, list);
    }
  }

  return { process, processSteps, bpmProcessId: diagram?.processId, bpmNodesByStep, workflowStepsByProcessStep };
}

/* ------------------------------------------------------------------ */
/* Núcleo                                                              */
/* ------------------------------------------------------------------ */

function traceWithIndexes(
  section: PopSection,
  mappings: PopProcessStepMapping[],
  idx: TraceIndexes,
): PopSectionTraceability {
  const own = mappings.filter((m) => m.popSectionId === section.id);

  const empty: PopSectionTraceability = {
    popSectionId: section.id,
    mappingStatus: "nao-mapeada",
    bpmNodes: [],
    workflowSteps: [],
  };

  if (own.length === 0) return empty;

  const confirmed = own.filter((m) => m.status === "confirmado");

  if (confirmed.length === 0) {
    // Estado mais "ativo" primeiro: sugerido > rejeitado.
    const status: PopSectionMappingStatus = own.some((m) => m.status === "sugerido")
      ? "sugerido"
      : "rejeitado";
    return { ...empty, mappingStatus: status };
  }

  const result: PopSectionTraceability = {
    popSectionId: section.id,
    mappingStatus: "confirmado",
    bpmNodes: [],
    workflowSteps: [],
  };

  // Defensivo: mapping confirmado sem Processo carregado.
  if (!idx.process) {
    result.processStepInconsistency = "processo-nao-vinculado";
    return result;
  }

  const seenNodes = new Set<string>();
  const seenWfSteps = new Set<string>();

  for (const mapping of confirmed) {
    if (mapping.processId !== idx.process.id) {
      result.processStepInconsistency ??= "step-de-outro-processo";
      continue;
    }
    const step = idx.processSteps.get(mapping.processStepId);
    if (!step) {
      result.processStepInconsistency ??= "step-inexistente";
      continue;
    }
    // Primeiro step válido define `processStep` (ordem dos mappings recebidos).
    result.processStep ??= {
      processStepId: mapping.processStepId,
      processStepName: step.name,
      processStepOrder: step.order,
    };

    for (const node of idx.bpmNodesByStep.get(mapping.processStepId) ?? []) {
      if (seenNodes.has(node.nodeId)) continue;
      seenNodes.add(node.nodeId);
      result.bpmNodes.push(node);
    }
    for (const wfStep of idx.workflowStepsByProcessStep.get(mapping.processStepId) ?? []) {
      const key = JSON.stringify([wfStep.workflowId, wfStep.workflowVersionId ?? null, wfStep.stepId]);
      if (seenWfSteps.has(key)) continue;
      seenWfSteps.add(key);
      result.workflowSteps.push(wfStep);
    }
  }

  return result;
}

export function getPopSectionTraceability(
  input: PopTraceabilityInput,
): PopSectionTraceability {
  const idx = buildIndexes(input);
  return traceWithIndexes(input.section, input.mappings, idx);
}

/**
 * Mesma lógica para todas as seções de um POP, montando os índices uma única
 * vez fora do loop.
 */
export function getPopTraceabilitySummary(
  _pop: PopDoc,
  sections: PopSection[],
  input: {
    mappings: PopProcessStepMapping[];
    process?: ProcessDoc;
    bpmDiagram?: BpmDiagram;
    workflowDocs: WorkflowDoc[];
    instances: WorkflowInstance[];
  },
): PopSectionTraceability[] {
  const idx = buildIndexes(input);
  const bySection = new Map<string, PopProcessStepMapping[]>();
  for (const mapping of input.mappings) {
    const list = bySection.get(mapping.popSectionId) ?? [];
    list.push(mapping);
    bySection.set(mapping.popSectionId, list);
  }
  return sections.map((section) =>
    traceWithIndexes(section, bySection.get(section.id) ?? [], idx),
  );
}
