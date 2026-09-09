/**
 * Build 004 — armazenamento local de POPs estruturados.
 *
 * Mesmo padrão do knowledge-store: persistência temporária em localStorage
 * até o backend definitivo chegar. Nenhuma funcionalidade existente é
 * substituída — este store é adicional.
 */

import { useSyncExternalStore } from "react";
import type { KnowledgeCategory } from "@/config/knowledge-demo";
import { POP_SECTION_TEMPLATES, type PopSectionId } from "@/config/pop-structure";
import type { PopContentOrigin, PopProvenance } from "@/config/pop-draft-proposal-model";
import { getProcessDoc } from "@/lib/process-store";

const STORAGE_KEY = "process-platform:pop:v1";

export type PopStatus = "rascunho" | "em revisão" | "publicado";

// Build 026 — taxonomia de origem/procedência é única na plataforma.
export type { PopContentOrigin, PopProvenance };

export interface PopSection {
  id: string;
  /** Identificador da seção padrão (quando derivada do template). */
  templateId?: PopSectionId;
  title: string;
  hint?: string;
  content: string;
  notes: string;
  /** Build 026 — origem unificada. Ausente em POPs criados antes disso. */
  origin?: PopContentOrigin;
  /** Build 026 — procedência unificada (substitui `sourceReference`). */
  provenance?: PopProvenance;
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
  /** Build 027.1 — vínculo estrutural com um Processo. Opcional/retrocompatível. */
  processId?: string;
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

/** Build 028 — POPs estruturalmente vinculados a um Processo (somente leitura). */
export function getPopsForProcess(processId: string): PopDoc[] {
  ensureHydrated();
  return Object.values(state)
    .filter((p) => p.processId === processId)
    .sort((a, b) => (b.savedAt ?? "").localeCompare(a.savedAt ?? ""));
}

/** Build 028 — hook reativo equivalente a `getPopsForProcess`. */
export function usePopsForProcess(processId: string): PopDoc[] {
  return usePopDocs().filter((p) => p.processId === processId);
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

export function updatePopDoc(id: string, patch: Partial<Omit<PopDoc, "id">>): PopDoc | undefined {
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
    sections: doc.sections.map((s) => (s.id === sectionKey ? { ...s, ...patch } : s)),
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

/* ------------------------------------------------------------------ */
/* Build 026 — Etapa 3: materialização de uma revisão em PopDoc.        */
/* Entrada estritamente tipada: campos da proposta (confidence,         */
/* humanEdited, findings, aiMeta) não podem vazar por construção.       */
/* ------------------------------------------------------------------ */

export interface CreatePopDocSectionInput {
  title: string;
  content: string;
  notes?: string;
  templateId?: PopSectionId;
  origin?: PopContentOrigin;
  provenance?: PopProvenance;
}

export interface CreatePopDocFromSectionsInput {
  name: string;
  sections: CreatePopDocSectionInput[];
  importOrigin?: PopImportOrigin;
}

/** Sempre cria um POP novo (id/code novos) — nunca faz upsert. */
export function createPopDocFromSections(input: CreatePopDocFromSectionsInput): PopDoc {
  ensureHydrated();
  const now = new Date();
  const id = uniqueId(`pop-${now.getTime().toString(36)}`);
  const doc: PopDoc = {
    id,
    code: nextCode(),
    name: input.name,
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
    sections: input.sections.map((s) => ({
      id: sectionId(),
      ...(s.templateId ? { templateId: s.templateId } : {}),
      title: s.title,
      content: s.content,
      notes: s.notes ?? "",
      ...(s.origin ? { origin: s.origin } : {}),
      ...(s.provenance ? { provenance: s.provenance } : {}),
    })),
    savedAt: now.toISOString(),
    ...(input.importOrigin ? { importOrigin: input.importOrigin } : {}),
  };
  state = { ...state, [id]: doc };
  persist();
  emit();
  return doc;
}

/* ------------------------------------------------------------------ */
/* Build 027.1 — vínculo estrutural POP → Processo.                     */
/* Sinalização de falha por `undefined`, como o restante do arquivo.    */
/* Não usa relationship-store: o vínculo é um campo do próprio POP.     */
/* ------------------------------------------------------------------ */

/** Vincula o POP a um Processo existente. Recusa (undefined) se qualquer lado não existir. */
export function linkPopToProcess(popId: string, processId: string): PopDoc | undefined {
  ensureHydrated();
  const current = state[popId];
  if (!current) return undefined;
  // Leitura pura do process-store — nenhuma escrita naquele domínio.
  if (!getProcessDoc(processId)) return undefined;
  const next: PopDoc = {
    ...current,
    processId,
    revisedAt: formatDate(),
    savedAt: new Date().toISOString(),
  };
  state = { ...state, [popId]: next };
  persist();
  emit();
  return next;
}

/** Remove o vínculo, omitindo a chave `processId`. */
export function unlinkPopFromProcess(popId: string): PopDoc | undefined {
  ensureHydrated();
  const current = state[popId];
  if (!current) return undefined;
  const { processId: _removed, ...rest } = current;
  void _removed;
  const next: PopDoc = {
    ...rest,
    revisedAt: formatDate(),
    savedAt: new Date().toISOString(),
  };
  state = { ...state, [popId]: next };
  persist();
  emit();
  return next;
}
