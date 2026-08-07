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

const GAP_X = 72;
const GAP_Y = 96;
const COLUMNS = 3;
const ROW_Y = 40;


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
  const edges: BpmEdge[] = [];

  type Draft = Omit<BpmNode, "x" | "y">;
  const drafts: Draft[] = [];

  const eventDraft = (id: string, kind: "start" | "end", name: string): Draft => ({
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
  });

  drafts.push(eventDraft("start", "start", "Início"));

  doc.steps.forEach((step, i) => {
    drafts.push({
      id: `task-${step.id}`,
      kind: "task",
      stepId: step.id,
      name: step.name || `Etapa ${i + 1}`,
      description: step.description,
      owner: step.owner,
      duration: step.duration,
      notes: step.notes,
      width: NODE_SIZE.task.width,
      height: NODE_SIZE.task.height,
    });
  });

  drafts.push(eventDraft("end", "end", "Fim"));

  // Layout em serpentina: mantém o diagrama legível mesmo com muitas etapas.
  const slot = NODE_SIZE.task.width;
  const nodes: BpmNode[] = drafts.map((draft, index) => {
    const row = Math.floor(index / COLUMNS);
    const colInRow = index % COLUMNS;
    const col = row % 2 === 0 ? colInRow : COLUMNS - 1 - colInRow;
    const slotX = col * (slot + GAP_X);
    return {
      ...draft,
      x: slotX + (slot - draft.width) / 2,
      y:
        ROW_Y +
        row * (NODE_SIZE.task.height + GAP_Y) +
        (NODE_SIZE.task.height - draft.height) / 2,
    };
  });

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
