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
