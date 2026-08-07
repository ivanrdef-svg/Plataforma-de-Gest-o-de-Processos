/**
 * Build 007 — BPM Designer Foundation.
 *
 * Modelo gráfico mínimo que representa um Processo. O diagrama NUNCA é criado
 * do zero: ele é derivado da estrutura do Processo (etapas cadastradas).
 *
 * Os tipos abaixo já preveem a evolução futura (gateways, eventos, pools,
 * lanes, subprocessos, anotações e conectores BPMN completos), mas nesta build
 * apenas `start`, `task` e `end` são gerados e renderizados.
 */

import type { ProcessDoc } from "@/lib/process-store";

/** Tipos de nó suportados hoje + reservados para builds futuras. */
export type BpmNodeKind =
  | "start"
  | "task"
  | "end"
  // reservados (Build 008+)
  | "gateway"
  | "event"
  | "subprocess"
  | "annotation";

/** Tipos de conector — hoje apenas `sequence`. */
export type BpmEdgeKind = "sequence" | "message" | "association";

export interface BpmNode {
  id: string;
  kind: BpmNodeKind;
  /** Etapa de origem no Processo (quando o nó representa uma etapa). */
  stepId?: string;
  name: string;
  description: string;
  owner: string;
  duration: string;
  notes: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Reservado: pool/lane a que o nó pertence. */
  laneId?: string;
}

export interface BpmEdge {
  id: string;
  kind: BpmEdgeKind;
  source: string;
  target: string;
  label?: string;
}

/** Reservado para Build futura: pools e lanes do diagrama. */
export interface BpmLane {
  id: string;
  name: string;
}

export interface BpmDiagram {
  processId: string;
  /** Assinatura das etapas usada para detectar diagrama desatualizado. */
  signature: string;
  nodes: BpmNode[];
  edges: BpmEdge[];
  lanes: BpmLane[];
  generatedAt: string;
}

export const NODE_SIZE = {
  task: { width: 208, height: 88 },
  event: { width: 72, height: 72 },
} as const;

const GAP_X = 84;
const ROW_Y = 120;

/** Assinatura determinística das etapas do processo. */
export function processSignature(doc: ProcessDoc): string {
  return doc.steps
    .map((s) => [s.id, s.name, s.owner, s.duration, s.description].join("~"))
    .join("|");
}

/**
 * Gera o fluxo inicial a partir das etapas do Processo.
 * Início → Etapas (na ordem cadastrada) → Fim.
 */
export function generateDiagramFromProcess(doc: ProcessDoc): BpmDiagram {
  const nodes: BpmNode[] = [];
  const edges: BpmEdge[] = [];
  let x = 0;

  const pushEvent = (id: string, kind: "start" | "end", name: string) => {
    const size = NODE_SIZE.event;
    nodes.push({
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
      x,
      y: ROW_Y + (NODE_SIZE.task.height - size.height) / 2,
      width: size.width,
      height: size.height,
    });
    x += size.width + GAP_X;
  };

  pushEvent("start", "start", "Início");

  doc.steps.forEach((step, i) => {
    const size = NODE_SIZE.task;
    nodes.push({
      id: `task-${step.id}`,
      kind: "task",
      stepId: step.id,
      name: step.name || `Etapa ${i + 1}`,
      description: step.description,
      owner: step.owner,
      duration: step.duration,
      notes: step.notes,
      x,
      y: ROW_Y,
      width: size.width,
      height: size.height,
    });
    x += size.width + GAP_X;
  });

  pushEvent("end", "end", "Fim");

  for (let i = 0; i < nodes.length - 1; i++) {
    edges.push({
      id: `e-${nodes[i]!.id}-${nodes[i + 1]!.id}`,
      kind: "sequence",
      source: nodes[i]!.id,
      target: nodes[i + 1]!.id,
    });
  }

  return {
    processId: doc.id,
    signature: processSignature(doc),
    nodes,
    edges,
    lanes: [],
    generatedAt: new Date().toISOString(),
  };
}

/** Limites do diagrama, usado por "Centralizar" e zoom-to-fit. */
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
