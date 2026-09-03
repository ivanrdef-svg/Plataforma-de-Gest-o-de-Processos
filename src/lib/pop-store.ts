/**
 * Build 004 — armazenamento local de POPs estruturados.
 *
 * Mesmo padrão do knowledge-store: persistência temporária em localStorage
 * até o backend definitivo chegar. Nenhuma funcionalidade existente é
 * substituída — este store é adicional.
 */

import { useSyncExternalStore } from "react";
import type { KnowledgeCategory } from "@/config/knowledge-demo";
import {
  POP_SECTION_TEMPLATES,
  type PopSectionId,
} from "@/config/pop-structure";

const STORAGE_KEY = "process-platform:pop:v1";

export type PopStatus = "rascunho" | "em revisão" | "publicado";

/** Build 023 — procedência de uma seção (opcional, retrocompatível). */
export type PopSectionOrigin = "manual" | "ia" | "documento";

export interface PopSectionSourceReference {
  sourceDocumentId: string;
  sourceSectionReference?: string;
}

export interface PopSection {
  id: string;
  /** Identificador da seção padrão (quando derivada do template). */
  templateId?: PopSectionId;
  title: string;
  hint?: string;
  content: string;
  notes: string;
  /** Build 023 — origem da seção. Ausente em todo POP criado até hoje. */
  origin?: PopSectionOrigin;
  /** Build 023 — vínculo com o documento original importado. */
  sourceReference?: PopSectionSourceReference;
}

/** Build 023 — vínculo do POP com a importação que o originou. */
export interface PopImportOrigin {
  sourceDocumentId: string;
  draftProposalId: string;
  confirmedAt: string;
}

export interface PopDoc {
  id: string;
  code: string;
  name: string;
  category: KnowledgeCategory;
  status: PopStatus;
  version: string;
  owner: string;
  createdAt: string;
  revisedAt: string;
  description: string;
  tags: string[];
  keywords: string[];
  favorite: boolean;
  sections: PopSection[];
  savedAt: string;
  /** Build 023 — presente apenas em POPs criados por importação (Build 026). */
  importOrigin?: PopImportOrigin;
}

type StoreState = Record<string, PopDoc>;

let state: StoreState = {};
let hydrated = false;
let snapshotCache: PopDoc[] | null = null;
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
  snapshotCache = null;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  ensureHydrated();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): PopDoc[] {
  ensureHydrated();
  if (!snapshotCache) {
    snapshotCache = Object.values(state).sort((a, b) =>
      (b.savedAt ?? "").localeCompare(a.savedAt ?? ""),
    );
  }
  return snapshotCache;
}

const serverSnapshot: PopDoc[] = [];
function getServerSnapshot() {
  return serverSnapshot;
}

export function usePopDocs(): PopDoc[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function usePopDoc(id: string): PopDoc | undefined {
  return usePopDocs().find((d) => d.id === id);
}

function sectionId() {
  return `s_${Math.random().toString(36).slice(2, 10)}`;
}

function formatDate(date = new Date()) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function nextCode() {
  const n = Object.keys(state).length + 1;
  return `POP-${String(n).padStart(3, "0")}`;
}

function uniqueId(base: string) {
  let id = base;
  let n = 2;
  while (state[id]) id = `${base}-${n++}`;
  return id;
}

export function createPopDoc(name = "Novo POP"): PopDoc {
  ensureHydrated();
  const now = new Date();
  const id = uniqueId(`pop-${now.getTime().toString(36)}`);
  const doc: PopDoc = {
    id,
    code: nextCode(),
    name,
    category: "Operações",
    status: "rascunho",
    version: "v0.1",
    owner: "Você",
    createdAt: formatDate(now),
    revisedAt: formatDate(now),
    description: "Procedimento Operacional Padrão em elaboração.",
    tags: ["POP"],
    keywords: [],
    favorite: false,
    sections: POP_SECTION_TEMPLATES.map((t) => ({
      id: sectionId(),
      templateId: t.id,
      title: t.title,
      hint: t.hint,
      content: t.content,
      notes: "",
    })),
    savedAt: now.toISOString(),
  };
  state = { ...state, [id]: doc };
  persist();
  emit();
  return doc;
}

export function updatePopDoc(
  id: string,
  patch: Partial<Omit<PopDoc, "id">>,
): PopDoc | undefined {
  ensureHydrated();
  const current = state[id];
  if (!current) return undefined;
  const next: PopDoc = {
    ...current,
    ...patch,
    id,
    revisedAt: formatDate(),
    savedAt: new Date().toISOString(),
  };
  state = { ...state, [id]: next };
  persist();
  emit();
  return next;
}

export function updatePopSection(
  docId: string,
  sectionKey: string,
  patch: Partial<Omit<PopSection, "id">>,
) {
  const doc = state[docId];
  if (!doc) return undefined;
  return updatePopDoc(docId, {
    sections: doc.sections.map((s) =>
      s.id === sectionKey ? { ...s, ...patch } : s,
    ),
  });
}

export function duplicatePopDoc(id: string): PopDoc | undefined {
  ensureHydrated();
  const source = state[id];
  if (!source) return undefined;
  const now = new Date();
  const newId = uniqueId(`pop-${now.getTime().toString(36)}`);
  const copy: PopDoc = {
    ...source,
    id: newId,
    code: nextCode(),
    name: `${source.name} (cópia)`,
    status: "rascunho",
    version: "v0.1",
    createdAt: formatDate(now),
    revisedAt: formatDate(now),
    favorite: false,
    sections: source.sections.map((s) => ({ ...s, id: sectionId() })),
    savedAt: now.toISOString(),
  };
  state = { ...state, [newId]: copy };
  persist();
  emit();
  return copy;
}
