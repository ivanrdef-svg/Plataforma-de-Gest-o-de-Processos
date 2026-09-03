/**
 * Build 023 — armazenamento local dos documentos originais importados para POP.
 *
 * Mesmo padrão de pop-store.ts: persistência temporária em localStorage,
 * `useSyncExternalStore` e chave própria. Store totalmente independente:
 * não importa nem é importado por pop-store.ts.
 */

import { useSyncExternalStore } from "react";
import { POP_SOURCE_DOCUMENTS_BUCKET } from "@/lib/pop-documents.functions";

const STORAGE_KEY = "process-platform:pop-source-document:v1";

export type PopSourceDocumentStatus = "enviado" | "processando" | "pronto" | "erro";

export interface PopSourceDocument {
  id: string;
  originalFileName: string;
  fileType: "docx";
  sizeBytes: number;
  storageBucket: string;
  storageObjectPath: string;
  status: PopSourceDocumentStatus;
  importedAt: string;
  errorMessage?: string;
}

type StoreState = Record<string, PopSourceDocument>;

let state: StoreState = {};
let hydrated = false;
let snapshotCache: PopSourceDocument[] | null = null;
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

function getSnapshot(): PopSourceDocument[] {
  ensureHydrated();
  if (!snapshotCache) {
    snapshotCache = Object.values(state).sort((a, b) =>
      (b.importedAt ?? "").localeCompare(a.importedAt ?? ""),
    );
  }
  return snapshotCache;
}

const serverSnapshot: PopSourceDocument[] = [];
function getServerSnapshot() {
  return serverSnapshot;
}

export function usePopSourceDocuments(): PopSourceDocument[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function usePopSourceDocument(id: string): PopSourceDocument | undefined {
  return usePopSourceDocuments().find((d) => d.id === id);
}

export interface CreatePopSourceDocumentInput {
  /** `sourceDocumentId` retornado por `uploadPopSourceDocument`. */
  id: string;
  originalFileName: string;
  storageObjectPath: string;
  /** Tamanho medido no cliente antes do upload. */
  sizeBytes: number;
  /** Opcional — assume o bucket padrão da infraestrutura de POP. */
  storageBucket?: string;
}

/**
 * Registra localmente um documento cujo upload JÁ foi concluído com sucesso.
 */
export function createPopSourceDocument(input: CreatePopSourceDocumentInput): PopSourceDocument {
  ensureHydrated();
  const doc: PopSourceDocument = {
    id: input.id,
    originalFileName: input.originalFileName,
    fileType: "docx",
    sizeBytes: input.sizeBytes,
    storageBucket: input.storageBucket ?? POP_SOURCE_DOCUMENTS_BUCKET,
    storageObjectPath: input.storageObjectPath,
    status: "enviado",
    importedAt: new Date().toISOString(),
  };
  state = { ...state, [doc.id]: doc };
  persist();
  emit();
  return doc;
}
