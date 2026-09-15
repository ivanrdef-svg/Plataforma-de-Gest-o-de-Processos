/**
 * Build 003 — armazenamento local de Knowledge Packages.
 *
 * O backend real chega em builds futuras; a interface já funciona como
 * definitiva. Somente documentos efetivamente persistidos são expostos.
 */

import { useSyncExternalStore } from "react";
import type {
  KnowledgeCategory,
  KnowledgePackage,
  KnowledgeStatus,
} from "@/config/knowledge-demo";
import type { KnowledgeType } from "@/config/knowledge-types";
import {
  KNOWLEDGE_TEMPLATES,
  type KnowledgeBlock,
} from "@/config/knowledge-templates";

const STORAGE_KEY = "process-platform:knowledge:v1";

export interface KnowledgeDoc extends KnowledgePackage {
  tags: string[];
  keywords: string[];
  blocks: KnowledgeBlock[];
  /** ISO — usado só para ordenação; a UI mostra `updatedAt`. */
  savedAt?: string;
  /** true quando criado pelo usuário (não vem dos dados de demonstração). */
  custom?: boolean;
}

type StoreState = Record<string, KnowledgeDoc>;

let state: StoreState = {};
let hydrated = false;
const listeners = new Set<() => void>();

function read(): StoreState {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoreState) : {};
  } catch {
    return {};
  }
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* armazenamento indisponível — a sessão continua funcionando em memória */
  }
}

function ensureHydrated() {
  if (hydrated || typeof window === "undefined") return;
  state = read();
  hydrated = true;
}

function emit() {
  snapshotCache = null;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  ensureHydrated();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

let snapshotCache: KnowledgeDoc[] | null = null;

function buildList(): KnowledgeDoc[] {
  ensureHydrated();
  return Object.values(state).sort((a, b) =>
    (b.savedAt ?? "").localeCompare(a.savedAt ?? ""),
  );
}

function getSnapshot(): KnowledgeDoc[] {
  if (!snapshotCache) snapshotCache = buildList();
  return snapshotCache;
}

const serverSnapshot: KnowledgeDoc[] = [];

function getServerSnapshot() {
  return serverSnapshot;
}

export function useKnowledgeDocs(): KnowledgeDoc[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useKnowledgeDoc(id: string): KnowledgeDoc | undefined {
  const docs = useKnowledgeDocs();
  return docs.find((d) => d.id === id);
}

export function getKnowledgeDoc(id: string): KnowledgeDoc | undefined {
  ensureHydrated();
  return state[id];
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function uniqueId(base: string) {
  const existing = new Set(Object.keys(state));
  let id = base || "knowledge";
  let n = 2;
  while (existing.has(id)) id = `${base}-${n++}`;
  return id;
}

/** Cria um novo Knowledge Package a partir do template do tipo. */
export function createKnowledgeDoc(type: KnowledgeType): KnowledgeDoc {
  ensureHydrated();
  const template = KNOWLEDGE_TEMPLATES[type];
  const id = uniqueId(slugify(template.defaultName));
  const doc: KnowledgeDoc = {
    id,
    name: template.defaultName,
    category: template.defaultCategory,
    type,
    owner: "Você",
    status: "rascunho",
    version: "v0.1",
    updatedAt: "agora",
    description: template.description,
    articles: 0,
    linkedObjects: 0,
    tags: [type],
    keywords: [],
    blocks: template.blocks(),
    savedAt: new Date().toISOString(),
    custom: true,
  };
  state = { ...state, [id]: doc };
  persist();
  emit();
  return doc;
}

/** Atualiza campos de um Knowledge Package (cria a cópia editável se preciso). */
export function updateKnowledgeDoc(
  id: string,
  patch: Partial<Omit<KnowledgeDoc, "id">>,
): KnowledgeDoc | undefined {
  ensureHydrated();
  const current = getKnowledgeDoc(id);
  if (!current) return undefined;
  const next: KnowledgeDoc = {
    ...current,
    ...patch,
    id,
    updatedAt: "agora",
    savedAt: new Date().toISOString(),
  };
  state = { ...state, [id]: next };
  persist();
  emit();
  return next;
}

export function updateKnowledgeBlocks(id: string, blocks: KnowledgeBlock[]) {
  return updateKnowledgeDoc(id, { blocks });
}

export type { KnowledgeCategory, KnowledgeStatus };
