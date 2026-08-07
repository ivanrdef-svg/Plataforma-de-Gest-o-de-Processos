/**
 * Build 005 — store de relacionamentos (camada adicional).
 *
 * Mesmo padrão dos stores existentes (knowledge-store / pop-store):
 * persistência temporária em localStorage. Relacionamentos criados pelo
 * usuário são guardados; objetos sem vínculos recebem uma rede simulada
 * determinística para demonstrar o ecossistema conectado.
 */

import { useMemo, useSyncExternalStore } from "react";
import {
  DEPENDENCY_KINDS,
  OBJECT_CATALOG,
  type ImpactLevel,
  type RelatedObjectType,
  type RelationshipKind,
} from "@/config/relationship-model";

const STORAGE_KEY = "process-platform:relationships:v1";

export interface Relationship {
  id: string;
  /** Objeto de origem (o que está aberto no Workspace). */
  sourceId: string;
  targetId: string;
  targetName: string;
  targetType: RelatedObjectType;
  kind: RelationshipKind;
  description: string;
  notes: string;
  impact: ImpactLevel;
  updatedAt: string;
  /** Vínculo simulado (semente) ou criado pelo usuário. */
  seeded?: boolean;
}

type StoreState = Record<string, Relationship[]>;

let state: StoreState = {};
let hydrated = false;
let version = 0;
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
  version += 1;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  ensureHydrated();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getVersion() {
  ensureHydrated();
  return version;
}

function getServerVersion() {
  return 0;
}

/* ------------------------------------------------------------------ */
/* Rede simulada determinística                                        */
/* ------------------------------------------------------------------ */

function hash(value: string) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

const SEED_PLAN: Array<{
  type: RelatedObjectType;
  kind: RelationshipKind;
  impact: ImpactLevel;
  description: string;
  updatedAt: string;
}> = [
  { type: "Norma", kind: "Origina", impact: "crítico", description: "Norma que originou este objeto e define suas regras obrigatórias.", updatedAt: "há 2 dias" },
  { type: "Processo", kind: "É utilizado por", impact: "alto", description: "Processo corporativo que consome este objeto na execução.", updatedAt: "há 5 dias" },
  { type: "POP", kind: "Depende de", impact: "alto", description: "Procedimento operacional dependente deste conteúdo.", updatedAt: "ontem" },
  { type: "Knowledge Package", kind: "Complementa", impact: "médio", description: "Conhecimento complementar consultado com frequência.", updatedAt: "há 1 semana" },
  { type: "Checklist", kind: "Executa", impact: "médio", description: "Checklist aplicado para garantir a execução correta.", updatedAt: "há 3 dias" },
  { type: "Risco", kind: "Mitiga", impact: "crítico", description: "Risco corporativo mitigado por este objeto.", updatedAt: "há 4 dias" },
  { type: "Controle", kind: "Controla", impact: "alto", description: "Controle interno associado à conformidade deste objeto.", updatedAt: "há 6 dias" },
  { type: "Indicador", kind: "Produz", impact: "médio", description: "Indicador alimentado pelos resultados deste objeto.", updatedAt: "há 2 semanas" },
  { type: "Sistema", kind: "Consome", impact: "médio", description: "Sistema que consome informações geradas aqui.", updatedAt: "há 9 dias" },
  { type: "Área", kind: "Está relacionado", impact: "baixo", description: "Área organizacional responsável pela aplicação.", updatedAt: "há 1 mês" },
  { type: "Documento", kind: "Faz referência", impact: "baixo", description: "Documento de apoio referenciado no conteúdo.", updatedAt: "há 1 mês" },
];

function seedFor(objectId: string): Relationship[] {
  const base = hash(objectId);
  const count = 5 + (base % 4); // 5 a 8 vínculos
  const out: Relationship[] = [];

  for (let i = 0; i < count; i++) {
    const plan = SEED_PLAN[(base + i * 3) % SEED_PLAN.length]!;
    const candidates = OBJECT_CATALOG.filter((o) => o.type === plan.type);
    if (candidates.length === 0) continue;
    const target = candidates[(base + i * 7) % candidates.length]!;
    if (target.id === objectId || out.some((r) => r.targetId === target.id)) continue;
    out.push({
      id: `seed_${objectId}_${target.id}`,
      sourceId: objectId,
      targetId: target.id,
      targetName: target.name,
      targetType: target.type,
      kind: plan.kind,
      description: plan.description,
      notes: "",
      impact: plan.impact,
      updatedAt: plan.updatedAt,
      seeded: true,
    });
  }
  return out;
}

const seedCache = new Map<string, Relationship[]>();
function getSeed(objectId: string) {
  let cached = seedCache.get(objectId);
  if (!cached) {
    cached = seedFor(objectId);
    seedCache.set(objectId, cached);
  }
  return cached;
}

/* ------------------------------------------------------------------ */
/* API                                                                 */
/* ------------------------------------------------------------------ */

export function getRelationships(objectId: string): Relationship[] {
  ensureHydrated();
  const created = state[objectId] ?? [];
  const removed = new Set(created.map((r) => r.targetId));
  const seeds = getSeed(objectId).filter((s) => !removed.has(s.targetId));
  return [...created, ...seeds];
}

export function useRelationships(objectId: string): Relationship[] {
  const v = useSyncExternalStore(subscribe, getVersion, getServerVersion);
  return useMemo(() => {
    void v;
    return getRelationships(objectId);
  }, [objectId, v]);
}

export interface RelationshipStats {
  total: number;
  criticos: number;
  dependencias: number;
  impactos: number;
}

export function summarize(items: Relationship[]): RelationshipStats {
  return {
    total: items.length,
    criticos: items.filter((r) => r.impact === "crítico").length,
    dependencias: items.filter((r) => DEPENDENCY_KINDS.includes(r.kind)).length,
    impactos: items.filter((r) => r.impact === "crítico" || r.impact === "alto")
      .length,
  };
}

export function useRelationshipStats(objectId: string): RelationshipStats {
  const items = useRelationships(objectId);
  return useMemo(() => summarize(items), [items]);
}

export interface NewRelationshipInput {
  targetId: string;
  targetName: string;
  targetType: RelatedObjectType;
  kind: RelationshipKind;
  description: string;
  notes: string;
  impact: ImpactLevel;
}

export function addRelationship(
  sourceId: string,
  input: NewRelationshipInput,
): Relationship {
  ensureHydrated();
  const rel: Relationship = {
    id: `rel_${Math.random().toString(36).slice(2, 10)}`,
    sourceId,
    ...input,
    updatedAt: "agora",
  };
  state = { ...state, [sourceId]: [rel, ...(state[sourceId] ?? [])] };
  persist();
  emit();
  return rel;
}

export function removeRelationship(sourceId: string, relationshipId: string) {
  ensureHydrated();
  const current = state[sourceId] ?? [];
  state = { ...state, [sourceId]: current.filter((r) => r.id !== relationshipId) };
  persist();
  emit();
}
