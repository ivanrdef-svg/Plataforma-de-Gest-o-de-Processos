/**
 * Build 007 — armazenamento local dos diagramas BPM.
 * Build 020 — diagrama editorial autônomo.
 *
 * A partir da Build 020 o diagrama deixa de ser uma projeção descartável do
 * Processo: ele é gerado uma única vez (quando ainda não existe) e depois
 * pertence ao usuário. Nada regenera nem sobrescreve o desenho existente de
 * forma automática — a sincronização com o Processo é aditiva.
 *
 * Persistência temporária em localStorage, mesmo padrão dos demais stores.
 */

import { useSyncExternalStore } from "react";
import {
  generateDiagramFromProcess,
  nodeSizeFor,
  processSignature,
  type BpmDiagram,
  type BpmEdge,
  type BpmEdgeKind,
  type BpmNode,
  type BpmNodeKind,
} from "@/config/bpm-model";
import type { ProcessDefinition } from "@/lib/process-store";

const STORAGE_KEY = "process-platform:bpm:v1";

type StoreState = Record<string, BpmDiagram>;

let state: StoreState = {};
let hydrated = false;
const listeners = new Set<() => void>();

function rid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function ensureHydrated() {
  if (hydrated || typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    state = raw ? (JSON.parse(raw) as StoreState) : {};
  } catch {
    state = {};
  }
  hydrated = true;
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* armazenamento indisponível — a sessão segue em memória */
  }
}

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  ensureHydrated();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): StoreState {
  ensureHydrated();
  return state;
}

const serverSnapshot: StoreState = {};
function getServerSnapshot() {
  return serverSnapshot;
}

function useDiagrams(): StoreState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Diagrama persistido do processo (pode não existir ainda). */
export function useBpmDiagram(processId: string): BpmDiagram | undefined {
  return useDiagrams()[processId];
}

function write(processId: string, next: BpmDiagram) {
  state = { ...state, [processId]: next };
  persist();
  emit();
}

/**
 * Geração inicial do diagrama. Só deve ser usada quando ainda NÃO existe
 * desenho para o Processo (ver `ensureDiagram`) ou como ação explícita e
 * consciente de "reconstruir do zero" acionada pelo usuário.
 *
 * Build 020: nada no store chama esta função automaticamente sobre um
 * diagrama existente.
 */
export function rebuildDiagramFromProcess(processId: string, processVersionId: string, doc: ProcessDefinition): BpmDiagram {
  ensureHydrated();
  const fresh = generateDiagramFromProcess(processId, processVersionId, doc);
  write(processId, fresh);
  return fresh;
}

/**
 * Garante que exista um diagrama para o Processo.
 * Se já existir, retorna exatamente o que está salvo — sem tocar em nada.
 */
export function ensureDiagram(processId: string, processVersionId: string, doc: ProcessDefinition): BpmDiagram {
  ensureHydrated();
  const current = state[processId];
  if (current) return current;
  return rebuildDiagramFromProcess(processId, processVersionId, doc);
}

/**
 * Etapas do Processo que ainda não estão representadas no diagrama.
 * Substitui `isDiagramStale`: comparação simples por `stepId`, sem diff de
 * conteúdo e sem qualquer efeito destrutivo.
 */
export function pendingProcessChanges(
  processId: string,
  processVersionId: string,
  doc: ProcessDefinition,
  diagram?: BpmDiagram,
): { count: number; stepIds: string[] } {
  if (!diagram) return { count: doc.steps.length, stepIds: doc.steps.map((s) => s.id) };
  const present = new Set(
    diagram.nodes.map((n) => n.stepId).filter(Boolean) as string[],
  );
  const stepIds = doc.steps.filter((s) => !present.has(s.id)).map((s) => s.id);
  return { count: stepIds.length, stepIds };
}

/** Próxima posição livre à direita do diagrama, para nós novos. */
function nextFreeSlot(diagram: BpmDiagram, index: number, kind: BpmNodeKind) {
  const size = nodeSizeFor(kind);
  const maxX = diagram.nodes.length
    ? Math.max(...diagram.nodes.map((n) => n.x + n.width))
    : 0;
  const minY = diagram.nodes.length
    ? Math.min(...diagram.nodes.map((n) => n.y))
    : 0;
  return {
    x: maxX + 96,
    y: minY + index * (size.height + 40),
  };
}

/**
 * Sincronização ADITIVA com o Processo.
 *
 * Cria nós para etapas que ainda não existem no diagrama e, quando é possível
 * inferir, uma aresta de sequência a partir da etapa anterior já representada.
 * Nunca remove, reposiciona ou sobrescreve nós/arestas existentes, nem toca em
 * `notes`.
 */
export function syncDiagramWithProcess(processId: string, processVersionId: string, doc: ProcessDefinition): BpmDiagram {
  ensureHydrated();
  const current = state[processId];
  if (!current) return rebuildDiagramFromProcess(processId, processVersionId, doc);

  const { stepIds } = pendingProcessChanges(processId, processVersionId, doc, current);
  if (!stepIds.length && current.syncedFromProcessVersionId === processVersionId) return current;

  const nodeByStep = new Map<string, string>();
  current.nodes.forEach((n) => {
    if (n.stepId) nodeByStep.set(n.stepId, n.id);
  });

  const nodes: BpmNode[] = [...current.nodes];
  const edges: BpmEdge[] = [...current.edges];

  stepIds.forEach((stepId, index) => {
    const step = doc.steps.find((s) => s.id === stepId);
    if (!step) return;

    const kind: BpmNodeKind =
      step.type === "decisao"
        ? "gateway"
        : step.type === "aprovacao"
          ? "approval"
          : "task";
    const size = nodeSizeFor(kind);
    const pos = nextFreeSlot(current, index, kind);
    const id = rid("node");

    nodes.push({
      id,
      kind,
      stepId: step.id,
      stepType: step.type ?? "atividade",
      name: step.name || "Nova etapa",
      description: step.description,
      owner: step.owner,
      duration: step.duration,
      notes: step.notes,
      inputs: step.inputs,
      outputs: step.outputs,
      issues: [],
      width: size.width,
      height: size.height,
      x: pos.x,
      y: pos.y,
    });
    nodeByStep.set(step.id, id);

    // Liga à etapa anterior do Processo, quando ela já está no diagrama.
    const position = doc.steps.findIndex((s) => s.id === step.id);
    const previous = position > 0 ? doc.steps[position - 1] : undefined;
    const sourceId = previous ? nodeByStep.get(previous.id) : undefined;
    if (sourceId && sourceId !== id) {
      const duplicate = edges.some(
        (e) => e.source === sourceId && e.target === id,
      );
      if (!duplicate) {
        edges.push({
          id: rid("edge"),
          kind: "sequence",
          variant: "flow",
          source: sourceId,
          target: id,
        });
      }
    }
  });

  const next: BpmDiagram = { ...current, nodes, edges, syncedFromProcessVersionId: processVersionId };
  write(processId, next);
  return next;
}

/** Cria um nó editorial (sem `stepId`) na posição informada. */
export function addManualNode(
  processId: string,
  kind: BpmNodeKind,
  position: { x: number; y: number },
): BpmNode | undefined {
  ensureHydrated();
  const diagram = state[processId];
  if (!diagram) return undefined;

  const size = nodeSizeFor(kind);
  const node: BpmNode = {
    id: rid("node"),
    kind,
    manual: true,
    name:
      kind === "start"
        ? "Início"
        : kind === "end"
          ? "Fim"
          : kind === "gateway"
            ? "Decisão"
            : "Nova atividade",
    description: "",
    owner: "",
    duration: "",
    notes: "",
    issues: [],
    width: size.width,
    height: size.height,
    x: Math.round(position.x - size.width / 2),
    y: Math.round(position.y - size.height / 2),
  };

  write(processId, { ...diagram, nodes: [...diagram.nodes, node] });
  return node;
}

/**
 * Atualiza propriedades de um nó (posição, notas, nome, descrição,
 * responsável…). Mantém a assinatura anterior de `updateBpmNode`.
 */
export function updateBpmNode(
  processId: string,
  nodeId: string,
  patch: Partial<Omit<BpmNode, "id">>,
) {
  ensureHydrated();
  const diagram = state[processId];
  if (!diagram) return;
  write(processId, {
    ...diagram,
    nodes: diagram.nodes.map((n) => (n.id === nodeId ? { ...n, ...patch } : n)),
  });
}

/** Alias explícito para edição de propriedades editoriais. */
export const updateNodeProperties = updateBpmNode;

/** Remove um nó e todas as arestas conectadas a ele. */
export function removeNode(processId: string, nodeId: string) {
  ensureHydrated();
  const diagram = state[processId];
  if (!diagram) return;
  write(processId, {
    ...diagram,
    nodes: diagram.nodes.filter((n) => n.id !== nodeId),
    edges: diagram.edges.filter(
      (e) => e.source !== nodeId && e.target !== nodeId,
    ),
  });
}

/** Cria uma conexão manual entre dois nós existentes. */
export function addEdge(
  processId: string,
  sourceId: string,
  targetId: string,
  kind: BpmEdgeKind = "sequence",
): BpmEdge | undefined {
  ensureHydrated();
  const diagram = state[processId];
  if (!diagram) return undefined;
  if (sourceId === targetId) return undefined;

  const has = (id: string) => diagram.nodes.some((n) => n.id === id);
  if (!has(sourceId) || !has(targetId)) return undefined;

  const duplicate = diagram.edges.some(
    (e) => e.source === sourceId && e.target === targetId && e.kind === kind,
  );
  if (duplicate) return undefined;

  const edge: BpmEdge = {
    id: rid("edge"),
    kind,
    variant: kind === "sequence" ? "flow" : "dependency",
    source: sourceId,
    target: targetId,
    manual: true,
  };
  write(processId, { ...diagram, edges: [...diagram.edges, edge] });
  return edge;
}

/** Remove apenas a aresta indicada. */
export function removeEdge(processId: string, edgeId: string) {
  ensureHydrated();
  const diagram = state[processId];
  if (!diagram) return;
  write(processId, {
    ...diagram,
    edges: diagram.edges.filter((e) => e.id !== edgeId),
  });
}

/** Assinatura atual do modelo — informativa (não dispara regeneração). */
export function processDefinitionSignature(doc: ProcessDefinition) {
  return processSignature(doc);
}
