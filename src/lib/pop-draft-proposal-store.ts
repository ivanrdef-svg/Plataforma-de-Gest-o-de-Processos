/**
 * Build 025 — Etapa 2: persistência local das propostas de rascunho.
 *
 * Mesmo padrão dos demais stores: localStorage + useSyncExternalStore.
 * Neste build só existem os status "proposto" e "erro" — transições de
 * revisão/confirmação/rejeição pertencem ao Build 026.
 */

import { useSyncExternalStore } from "react";
import type { PopDraftProposal } from "@/config/pop-draft-proposal-model";

const STORAGE_KEY = "process-platform:pop-draft-proposal:v1";

type StoreState = Record<string, PopDraftProposal>;

let state: StoreState = {};
let hydrated = false;
let snapshotCache: PopDraftProposal[] | null = null;
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
  snapshotCache = null;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  ensureHydrated();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): PopDraftProposal[] {
  ensureHydrated();
  if (!snapshotCache) {
    snapshotCache = Object.values(state).sort((a, b) =>
      (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
    );
  }
  return snapshotCache;
}

const serverSnapshot: PopDraftProposal[] = [];
function getServerSnapshot() {
  return serverSnapshot;
}

export function usePopDraftProposals(): PopDraftProposal[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function usePopDraftProposalsForSource(sourceDocumentId: string): PopDraftProposal[] {
  return usePopDraftProposals().filter((p) => p.sourceDocumentId === sourceDocumentId);
}

export type CreatePopDraftProposalInput =
  | { kind: "proposto"; proposal: PopDraftProposal }
  | { kind: "erro"; sourceDocumentId: string; errorMessage: string };

/**
 * Grava SEMPRE um registro novo — reprocessar a mesma fonte acumula propostas,
 * nunca sobrescreve a anterior (sem upsert por `sourceDocumentId`).
 */
export function createPopDraftProposal(input: CreatePopDraftProposalInput): PopDraftProposal {
  ensureHydrated();

  const proposal: PopDraftProposal =
    input.kind === "proposto"
      ? { ...input.proposal, id: input.proposal.id || rid("pdp"), status: "proposto" }
      : {
          id: rid("pdp"),
          sourceDocumentId: input.sourceDocumentId,
          status: "erro",
          proposedSections: [],
          findings: [],
          createdAt: new Date().toISOString(),
          errorMessage: input.errorMessage,
        };

  state = { ...state, [proposal.id]: proposal };
  persist();
  emit();
  return proposal;
}

/* ------------------------------------------------------------------ */
/* Build 026 — Etapa 2: ciclo de vida da revisão humana.               */
/* Nenhum PopDoc é criado aqui; a confirmação/materialização é Etapa 3. */
/* ------------------------------------------------------------------ */

export type PopDraftReviewResult =
  { ok: true; proposal: PopDraftProposal } | { ok: false; reason: PopDraftReviewFailure };

export type PopDraftReviewFailure =
  | "nao-encontrada"
  | "status-invalido"
  | "revisao-nao-iniciada"
  | "secao-nao-encontrada"
  | "ordenacao-invalida";

function deepCopy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function write(next: PopDraftProposal): PopDraftReviewResult {
  state = { ...state, [next.id]: next };
  persist();
  emit();
  return { ok: true, proposal: next };
}

function inReview(
  proposalId: string,
): { ok: true; proposal: PopDraftProposal } | { ok: false; reason: PopDraftReviewFailure } {
  ensureHydrated();
  const current = state[proposalId];
  if (!current) return { ok: false, reason: "nao-encontrada" };
  if (current.status !== "em revisão") return { ok: false, reason: "status-invalido" };
  if (!current.reviewedSections) return { ok: false, reason: "revisao-nao-iniciada" };
  return { ok: true, proposal: current };
}

/** "proposto" → "em revisão". Idempotente: nunca sobrescreve revisão em andamento. */
export function startPopDraftReview(proposalId: string): PopDraftReviewResult {
  ensureHydrated();
  const current = state[proposalId];
  if (!current) return { ok: false, reason: "nao-encontrada" };

  if (current.status === "em revisão") {
    if (current.reviewedSections) return { ok: true, proposal: current };
    return write({ ...current, reviewedSections: deepCopy(current.proposedSections) });
  }

  if (current.status !== "proposto") return { ok: false, reason: "status-invalido" };

  return write({
    ...current,
    status: "em revisão",
    reviewedSections: deepCopy(current.proposedSections),
  });
}

/** Só `title`/`content`; `humanEdited` apenas em mudança real de valor. */
export function updateReviewedSection(
  proposalId: string,
  sectionId: string,
  changes: { title?: string; content?: string },
): PopDraftReviewResult {
  const guard = inReview(proposalId);
  if (!guard.ok) return guard;
  const current = guard.proposal;
  const sections = current.reviewedSections ?? [];
  const index = sections.findIndex((s) => s.id === sectionId);
  if (index < 0) return { ok: false, reason: "secao-nao-encontrada" };

  const section = sections[index]!;
  const nextTitle = changes.title ?? section.title;
  const nextContent = changes.content ?? section.content;
  const changed = nextTitle !== section.title || nextContent !== section.content;

  const nextSection = {
    ...section,
    title: nextTitle,
    content: nextContent,
    humanEdited: changed ? true : section.humanEdited,
  };

  const nextSections = sections.slice();
  nextSections[index] = nextSection;
  return write({ ...current, reviewedSections: nextSections });
}

/** Nova seção escrita pelo humano: origem manual, sem procedência. */
export function addReviewedSection(
  proposalId: string,
  section: { title: string; content: string },
): PopDraftReviewResult {
  const guard = inReview(proposalId);
  if (!guard.ok) return guard;
  const current = guard.proposal;
  return write({
    ...current,
    reviewedSections: [
      ...(current.reviewedSections ?? []),
      {
        id: rid("pps"),
        title: section.title,
        content: section.content,
        origin: "manual",
        confidence: "alta",
        humanEdited: true,
      },
    ],
  });
}

export function removeReviewedSection(proposalId: string, sectionId: string): PopDraftReviewResult {
  const guard = inReview(proposalId);
  if (!guard.ok) return guard;
  const current = guard.proposal;
  const sections = current.reviewedSections ?? [];
  if (!sections.some((s) => s.id === sectionId)) {
    return { ok: false, reason: "secao-nao-encontrada" };
  }
  return write({ ...current, reviewedSections: sections.filter((s) => s.id !== sectionId) });
}

/** Reordenação pura: mesmo conjunto de ids, sem marcar `humanEdited`. */
export function reorderReviewedSections(
  proposalId: string,
  orderedSectionIds: string[],
): PopDraftReviewResult {
  const guard = inReview(proposalId);
  if (!guard.ok) return guard;
  const current = guard.proposal;
  const sections = current.reviewedSections ?? [];

  const unique = new Set(orderedSectionIds);
  if (unique.size !== orderedSectionIds.length) return { ok: false, reason: "ordenacao-invalida" };
  if (unique.size !== sections.length) return { ok: false, reason: "ordenacao-invalida" };
  const byId = new Map(sections.map((s) => [s.id, s] as const));
  if (orderedSectionIds.some((id) => !byId.has(id))) {
    return { ok: false, reason: "ordenacao-invalida" };
  }

  return write({
    ...current,
    reviewedSections: orderedSectionIds.map((id) => byId.get(id)!),
  });
}

/** Único caminho de saída de "em revisão" nesta etapa. */
export function rejectPopDraftProposal(proposalId: string): PopDraftReviewResult {
  ensureHydrated();
  const current = state[proposalId];
  if (!current) return { ok: false, reason: "nao-encontrada" };
  if (current.status !== "proposto" && current.status !== "em revisão") {
    return { ok: false, reason: "status-invalido" };
  }
  return write({ ...current, status: "rejeitado" });
}
