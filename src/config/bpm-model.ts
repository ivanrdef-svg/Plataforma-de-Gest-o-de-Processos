/**
 * Build 007 — BPM Designer Foundation.
 * Build 008 — Intelligent BPM Designer.
 *
 * Modelo gráfico que representa um Processo. O diagrama NUNCA é criado do
 * zero: ele é derivado do modelo estruturado do Processo (evento inicial,
 * etapas tipificadas, sequência, dependências, participantes e finalização).
 *
 * Os tipos abaixo já preveem a evolução futura (pools, lanes, subprocessos,
 * anotações e conectores BPMN completos). Nesta build são gerados eventos de
 * início/fim, atividades, decisões (gateway) e aprovações.
 */

import type { ProcessDoc, ProcessStep } from "@/lib/process-store";
import type { ProcessStepTypeId } from "@/config/process-model";

/** Tipos de nó suportados hoje + reservados para builds futuras. */
export type BpmNodeKind =
  | "start"
  | "task"
  | "end"
  | "gateway"
  | "approval"
  // reservados (builds futuras)
  | "event"
  | "subprocess"
  | "annotation";

/** Tipos de conector. */
export type BpmEdgeKind = "sequence" | "message" | "association";

/** Build 008 — validação visual discreta sobre o diagrama. */
export type BpmIssueSeverity = "erro" | "atencao";

export interface BpmIssue {
  id: string;
  severity: BpmIssueSeverity;
  message: string;
  nodeId?: string;
}

export interface BpmNode {
  id: string;
  kind: BpmNodeKind;
  /** Etapa de origem no Processo (quando o nó representa uma etapa). */
  stepId?: string;
  /** Tipo da etapa no modelo do Processo (Build 007). */
  stepType?: ProcessStepTypeId;
  name: string;
  description: string;
  owner: string;
  duration: string;
  notes: string;
  /** Build 008 — entradas/saídas herdadas da etapa. */
  inputs?: string;
  outputs?: string;
  /** Build 008 — inconsistências detectadas para este elemento. */
  issues?: BpmIssue[];
  x: number;
  y: number;
  width: number;
  height: number;
  /** Pool/lane a que o nó pertence (derivada do responsável). */
  laneId?: string;
}

export interface BpmEdge {
  id: string;
  kind: BpmEdgeKind;
  source: string;
  target: string;
  label?: string;
  /** `flow` = sequência do processo; `dependency` = dependência declarada. */
  variant?: "flow" | "dependency";
}

/** Pools e lanes do diagrama (derivadas dos participantes). */
export interface BpmLane {
  id: string;
  name: string;
}

export interface BpmDiagram {
  processId: string;
  /** Assinatura do modelo usada para detectar diagrama desatualizado. */
  signature: string;
  nodes: BpmNode[];
  edges: BpmEdge[];
  lanes: BpmLane[];
  /** Build 008 — inconsistências do modelo refletidas no diagrama. */
  issues: BpmIssue[];
  generatedAt: string;
}

export const NODE_SIZE = {
  task: { width: 208, height: 88 },
  gateway: { width: 108, height: 108 },
  event: { width: 72, height: 72 },
} as const;

const GAP_X = 96;
const GAP_Y = 40;
/** Colunas por faixa antes de quebrar a linha do diagrama. */
const MAX_COLUMNS = 6;
const BAND_GAP_Y = 140;
const ROW_HEIGHT = NODE_SIZE.task.height;

/** Assinatura determinística do modelo do processo. */
export function processSignature(doc: ProcessDoc): string {
  return doc.steps
    .map((s) =>
      [
        s.id,
        s.name,
        s.owner,
        s.duration,
        s.description,
        s.type ?? "",
        s.execution ?? "",
        s.dependsOn ?? "",
        s.inputs,
        s.outputs,
      ].join("~"),
    )
    .join("|");
}

function laneIdFor(owner: string) {
  const clean = owner.trim().toLowerCase();
  return clean ? `lane-${clean.replace(/\s+/g, "-")}` : "lane-sem-responsavel";
}

function nodeKindFor(step: ProcessStep): BpmNodeKind {
  if (step.type === "decisao") return "gateway";
  if (step.type === "aprovacao") return "approval";
  return "task";
}

/**
 * Agrupa as etapas em camadas do fluxo.
 * Etapas marcadas como "paralela" entram na mesma camada da etapa anterior.
 */
function buildLayers(steps: ProcessStep[]): ProcessStep[][] {
  const layers: ProcessStep[][] = [];
  steps.forEach((step, index) => {
    const parallel = step.execution === "paralela" && index > 0 && layers.length > 0;
    if (parallel) {
      layers[layers.length - 1]!.push(step);
    } else {
      layers.push([step]);
    }
  });
  return layers;
}

/**
 * Build 008 — geração automática inteligente.
 *
 * Evento inicial → camadas de etapas (sequência + paralelismo) → finalização.
 * Dependências declaradas viram conectores adicionais e os participantes
 * alimentam as lanes do diagrama.
 */
export function generateDiagramFromProcess(doc: ProcessDoc): BpmDiagram {
  const nodes: BpmNode[] = [];
  const edges: BpmEdge[] = [];
  const issues: BpmIssue[] = [];

  const layers = buildLayers(doc.steps);

  /* Colunas do fluxo: início → camadas de etapas → fim.
     Para manter o diagrama legível, as colunas quebram em faixas
     (MAX_COLUMNS por faixa) em vez de crescer indefinidamente à direita. */
  type Slot = { id: string; kind: BpmNodeKind; step?: ProcessStep };
  const columns: Slot[][] = [
    [{ id: "start", kind: "start" }],
    ...layers.map((layer) =>
      layer.map((step) => ({
        id: `task-${step.id}`,
        kind: nodeKindFor(step),
        step,
      })),
    ),
    [{ id: "end", kind: "end" }],
  ];

  const COL_SLOT = NODE_SIZE.task.width;
  const rowsOfColumns: Slot[][][] = [];
  for (let i = 0; i < columns.length; i += MAX_COLUMNS) {
    rowsOfColumns.push(columns.slice(i, i + MAX_COLUMNS));
  }

  // Posição vertical de cada faixa.
  const bandTops: number[] = [];
  let cursorY = 0;
  rowsOfColumns.forEach((band) => {
    const maxParallel = Math.max(1, ...band.map((c) => c.length));
    bandTops.push(cursorY);
    cursorY += maxParallel * ROW_HEIGHT + (maxParallel - 1) * GAP_Y + BAND_GAP_Y;
  });

  const nodeIdByStep = new Map<string, string>();
  const columnNodeIds: string[][] = [];

  columns.forEach((column, columnIndex) => {
    const bandIndex = Math.floor(columnIndex / MAX_COLUMNS);
    const colInBand = columnIndex % MAX_COLUMNS;
    const band = rowsOfColumns[bandIndex]!;
    const bandParallel = Math.max(1, ...band.map((c) => c.length));
    const bandHeight = bandParallel * ROW_HEIGHT + (bandParallel - 1) * GAP_Y;
    const bandCenter = bandTops[bandIndex]! + bandHeight / 2;

    const columnHeight = column.length * ROW_HEIGHT + (column.length - 1) * GAP_Y;
    const top = bandCenter - columnHeight / 2;
    const ids: string[] = [];

    column.forEach((slot, rowIndex) => {
      const size =
        slot.kind === "gateway"
          ? NODE_SIZE.gateway
          : slot.kind === "start" || slot.kind === "end"
            ? NODE_SIZE.event
            : NODE_SIZE.task;
      const rowTop = top + rowIndex * (ROW_HEIGHT + GAP_Y);
      const x =
        colInBand * (COL_SLOT + GAP_X) + (COL_SLOT - size.width) / 2;
      const y = rowTop + (ROW_HEIGHT - size.height) / 2;
      ids.push(slot.id);

      if (slot.step) {
        nodeIdByStep.set(slot.step.id, slot.id);
        nodes.push({
          id: slot.id,
          kind: slot.kind,
          stepId: slot.step.id,
          stepType: slot.step.type ?? "atividade",
          name: slot.step.name || `Etapa ${columnIndex}`,
          description: slot.step.description,
          owner: slot.step.owner,
          duration: slot.step.duration,
          notes: slot.step.notes,
          inputs: slot.step.inputs,
          outputs: slot.step.outputs,
          width: size.width,
          height: size.height,
          x,
          y,
          laneId: laneIdFor(slot.step.owner),
        });
      } else {
        const isStart = slot.kind === "start";
        nodes.push({
          id: slot.id,
          kind: slot.kind,
          name: isStart ? "Início" : "Fim",
          description: isStart
            ? "Evento que dispara o processo."
            : "Evento que encerra o processo.",
          owner: isStart ? doc.owner : "",
          duration: "",
          notes: "",
          width: size.width,
          height: size.height,
          x,
          y,
          laneId: laneIdFor(isStart ? doc.owner : ""),
        });
      }
    });

    columnNodeIds.push(ids);
  });

  // Conexões de sequência entre colunas consecutivas.
  const chain: string[][] = columnNodeIds;
  for (let i = 0; i < chain.length - 1; i++) {
    for (const source of chain[i]!) {
      for (const target of chain[i + 1]!) {
        const sourceNode = nodes.find((n) => n.id === source);
        edges.push({
          id: `e-${source}-${target}`,
          kind: "sequence",
          variant: "flow",
          source,
          target,
          ...(sourceNode?.kind === "gateway" ? { label: "Sim" } : {}),
        });
      }
    }
  }

  // Dependências declaradas nas etapas viram conectores adicionais.
  doc.steps.forEach((step) => {
    const declared = (step.dependsOn ?? "")
      .split(/[,;\n]/)
      .map((v) => v.trim())
      .filter(Boolean);
    if (!declared.length) return;

    const targetId = nodeIdByStep.get(step.id);
    if (!targetId) return;

    declared.forEach((ref, i) => {
      const match = doc.steps.find(
        (s) =>
          s.id === ref ||
          s.name.trim().toLowerCase() === ref.toLowerCase() ||
          (!!s.name && ref.toLowerCase().includes(s.name.trim().toLowerCase())),
      );
      const sourceId = match ? nodeIdByStep.get(match.id) : undefined;

      if (!sourceId || sourceId === targetId) {
        issues.push({
          id: `dep-${step.id}-${i}`,
          severity: "atencao",
          message: `Dependência "${ref}" não corresponde a nenhuma etapa do processo.`,
          nodeId: targetId,
        });
        return;
      }

      const duplicate = edges.some(
        (e) => e.source === sourceId && e.target === targetId,
      );
      if (duplicate) return;

      edges.push({
        id: `dep-${sourceId}-${targetId}`,
        kind: "association",
        variant: "dependency",
        source: sourceId,
        target: targetId,
        label: "depende de",
      });
    });
  });

  // Validação visual do modelo.
  nodes.forEach((node) => {
    if (!node.stepId) return;

    if (!node.owner.trim()) {
      issues.push({
        id: `owner-${node.id}`,
        severity: "atencao",
        message: `"${node.name}" está sem responsável definido.`,
        nodeId: node.id,
      });
    }
    if (!node.description.trim()) {
      issues.push({
        id: `desc-${node.id}`,
        severity: "atencao",
        message: `"${node.name}" está sem descrição.`,
        nodeId: node.id,
      });
    }
    if (!node.name.trim()) {
      issues.push({
        id: `name-${node.id}`,
        severity: "erro",
        message: "Existe uma etapa sem nome no modelo.",
        nodeId: node.id,
      });
    }
    const connected = edges.some(
      (e) => e.source === node.id || e.target === node.id,
    );
    if (!connected) {
      issues.push({
        id: `isolated-${node.id}`,
        severity: "erro",
        message: `"${node.name}" está isolada no fluxo.`,
        nodeId: node.id,
      });
    }
  });

  if (!doc.steps.length) {
    issues.push({
      id: "no-steps",
      severity: "erro",
      message: "O processo ainda não possui etapas para gerar o fluxo.",
    });
  }

  // Anexa as inconsistências aos respectivos nós.
  const byNode = new Map<string, BpmIssue[]>();
  issues.forEach((issue) => {
    if (!issue.nodeId) return;
    const list = byNode.get(issue.nodeId) ?? [];
    list.push(issue);
    byNode.set(issue.nodeId, list);
  });
  const withIssues = nodes.map((n) => ({ ...n, issues: byNode.get(n.id) ?? [] }));

  // Lanes derivadas dos participantes das etapas.
  const laneNames = new Map<string, string>();
  doc.steps.forEach((s) => {
    const name = s.owner.trim();
    laneNames.set(laneIdFor(name), name || "Sem responsável");
  });
  const lanes: BpmLane[] = Array.from(laneNames, ([id, name]) => ({ id, name }));

  return {
    processId: doc.id,
    signature: processSignature(doc),
    nodes: withIssues,
    edges,
    lanes,
    issues,
    generatedAt: new Date().toISOString(),
  };
}

/** Limites do diagrama, usado por "Centralizar", minimapa e zoom-to-fit. */
export function diagramBounds(diagram: BpmDiagram) {
  if (!diagram.nodes.length) {
    return { minX: 0, minY: 0, maxX: 400, maxY: 300, width: 400, height: 300 };
  }
  const minX = Math.min(...diagram.nodes.map((n) => n.x));
  const minY = Math.min(...diagram.nodes.map((n) => n.y));
  const maxX = Math.max(...diagram.nodes.map((n) => n.x + n.width));
  const maxY = Math.max(...diagram.nodes.map((n) => n.y + n.height));
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

/** Resumo das inconsistências do diagrama (Build 008). */
export function diagramIssueSummary(diagram: BpmDiagram) {
  const list = diagram.issues ?? [];
  return {
    total: list.length,
    errors: list.filter((i) => i.severity === "erro").length,
    warnings: list.filter((i) => i.severity === "atencao").length,
  };
}
