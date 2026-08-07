/**
 * Build 007 — armazenamento local dos diagramas BPM.
 *
 * Mesmo padrão dos demais stores (knowledge, pop, process, relationships):
 * persistência temporária em localStorage. Store adicional — nada existente
 * é substituído. A origem da informação continua sendo o Processo.
 */

import { useSyncExternalStore } from "react";
import {
  generateDiagramFromProcess,
  processSignature,
  type BpmDiagram,
  type BpmNode,
} from "@/config/bpm-model";
import type { ProcessDoc } from "@/lib/process-store";

const STORAGE_KEY = "process-platform:bpm:v1";

type StoreState = Record<string, BpmDiagram>;

let state: StoreState = {};
let hydrated = false;
const listeners = new Set<() => void>();

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

/** Gera (ou regenera) o diagrama a partir da estrutura do Processo. */
export function regenerateDiagram(doc: ProcessDoc): BpmDiagram {
  ensureHydrated();
  const fresh = generateDiagramFromProcess(doc);
  const previous = state[doc.id];

  // Preserva refinamentos manuais (observações) por etapa de origem.
  if (previous) {
    const notesByKey = new Map(
      previous.nodes.map((n) => [n.stepId ?? n.id, n.notes]),
    );
    fresh.nodes = fresh.nodes.map((n) => ({
      ...n,
      notes: notesByKey.get(n.stepId ?? n.id) ?? n.notes,
    }));
  }

  state = { ...state, [doc.id]: fresh };
  persist();
  emit();
  return fresh;
}

/** Garante que exista um diagrama para o processo, sem regenerar se já houver. */
export function ensureDiagram(doc: ProcessDoc): BpmDiagram {
  ensureHydrated();
  const current = state[doc.id];
  // Build 008 — diagramas gerados antes da geração inteligente não possuem
  // `issues`: nesse caso o fluxo é regerado a partir do modelo do Processo.
  if (current && Array.isArray(current.issues)) return current;
  return regenerateDiagram(doc);
}

/** true quando as etapas do Processo mudaram depois da última geração. */
export function isDiagramStale(doc: ProcessDoc, diagram?: BpmDiagram) {
  if (!diagram) return true;
  return diagram.signature !== processSignature(doc);
}

/** Atualiza um nó (posição no canvas ou refinamento manual). */
export function updateBpmNode(
  processId: string,
  nodeId: string,
  patch: Partial<Omit<BpmNode, "id">>,
) {
  ensureHydrated();
  const diagram = state[processId];
  if (!diagram) return;
  state = {
    ...state,
    [processId]: {
      ...diagram,
      nodes: diagram.nodes.map((n) =>
        n.id === nodeId ? { ...n, ...patch } : n,
      ),
    },
  };
  persist();
  emit();
}
