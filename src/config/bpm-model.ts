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
  const columnCount = layers.length + 2; // início + camadas + fim

  const eventNode = (
    id: string,
    kind: "start" | "end",
    name: string,
    column: number,
  ): BpmNode => ({
    id,
    kind,
    name,
    description:
      kind === "start"
        ? "Evento que dispara o processo."
        : "Evento que encerra o processo.",
    owner: kind === "start" ? doc.owner : "",
    duration: "",
    notes: "",
    width: NODE_SIZE.event.width,
    height: NODE_SIZE.event.height,
    x: column * (NODE_SIZE.task.width + GAP_X) + (NODE_SIZE.task.width - NODE_SIZE.event.width) / 2,
    y: 0,
    laneId: laneIdFor(kind === "start" ? doc.owner : ""),
  });

  // Altura total: a camada mais larga define o eixo vertical do canvas.
  const maxParallel = Math.max(1, ...layers.map((l) => l.length));
  const canvasHeight = maxParallel * ROW_HEIGHT + (maxParallel - 1) * GAP_Y;
  const centerY = canvasHeight / 2;

  const start = eventNode("start", "start", "Início", 0);
  start.y = centerY - start.height / 2;
  nodes.push(start);

  const nodeIdByStep = new Map<string, string>();
  const layerNodeIds: string[][] = [];

  layers.forEach((layer, layerIndex) => {
    const column = layerIndex + 1;
    const layerHeight = layer.length * ROW_HEIGHT + (layer.length - 1) * GAP_Y;
    const top = centerY - layerHeight / 2;
    const ids: string[] = [];

    layer.forEach((step, rowIndex) => {
      const kind = nodeKindFor(step);
      const size =
        kind === "gateway" ? NODE_SIZE.gateway : NODE_SIZE.task;
      const id = `task-${step.id}`;
      nodeIdByStep.set(step.id, id);
      ids.push(id);

      const rowTop = top + rowIndex * (ROW_HEIGHT + GAP_Y);
      nodes.push({
        id,
        kind,
        stepId: step.id,
        stepType: step.type ?? "atividade",
        name: step.name || `Etapa ${layerIndex + 1}`,
        description: step.description,
        owner: step.owner,
        duration: step.duration,
        notes: step.notes,
        inputs: step.inputs,
        outputs: step.outputs,
        width: size.width,
        height: size.height,
        x:
          column * (NODE_SIZE.task.width + GAP_X) +
          (NODE_SIZE.task.width - size.width) / 2,
        y: rowTop + (ROW_HEIGHT - size.height) / 2,
        laneId: laneIdFor(step.owner),
      });
    });

    layerNodeIds.push(ids);
  });

  const end = eventNode("end", "end", "Fim", columnCount - 1);
  end.y = centerY - end.height / 2;
  nodes.push(end);

  // Conexões de sequência entre camadas consecutivas.
  const chain: string[][] = [["start"], ...layerNodeIds, ["end"]];
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
