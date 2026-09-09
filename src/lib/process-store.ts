/**
 * Build 006 — armazenamento local de Processos estruturados.
 *
 * Mesmo padrão de knowledge-store e pop-store: persistência temporária em
 * localStorage até o backend definitivo chegar. Store adicional — nenhuma
 * funcionalidade existente é substituída.
 */

import { useSyncExternalStore } from "react";
import {
  PROCESS_SECTION_TEMPLATES,
  PROCESS_STEP_SEEDS,
  type ProcessSectionId,
} from "@/config/process-structure";
import {
  PROCESS_MODEL_ORDER,
  PROCESS_MODEL_SECTION_TEMPLATES,
  RULE_SEEDS,
  type ParticipantRole,
  type ProcessExecutionMode,
  type ProcessStepTypeId,
  type RuleCriticality,
} from "@/config/process-model";

const STORAGE_KEY = "process-platform:process:v1";

export type ProcessStatus =
  | "rascunho"
  | "em desenvolvimento"
  | "em revisão"
  | "publicado";

export const PROCESS_STATUS_OPTIONS: ProcessStatus[] = [
  "rascunho",
  "em desenvolvimento",
  "em revisão",
  "publicado",
];

export const PROCESS_CATEGORIES = [
  "Operações",
  "Comercial",
  "Financeiro",
  "Pessoas",
  "Tecnologia",
  "Qualidade",
  "Suprimentos",
] as const;

export type ProcessCategory = (typeof PROCESS_CATEGORIES)[number];

export interface ProcessSection {
  id: string;
  templateId?: ProcessSectionId;
  title: string;
  hint?: string;
  content: string;
  notes: string;
}

export interface ProcessStep {
  id: string;
  name: string;
  description: string;
  owner: string;
  inputs: string;
  outputs: string;
  duration: string;
  notes: string;
  /* Build 007 — modelagem estruturada da etapa (todos opcionais: docs
     criados em builds anteriores continuam válidos). */
  type?: ProcessStepTypeId;
  preconditions?: string;
  postconditions?: string;
  execution?: ProcessExecutionMode;
  dependsOn?: string;
}

/** Build 007 — regra de negócio do processo. */
export interface ProcessRule {
  id: string;
  name: string;
  description: string;
  application: string;
  impact: string;
  criticality: RuleCriticality;
}

/** Build 007 — participante do processo, ligado a etapas. */
export interface ProcessParticipant {
  id: string;
  name: string;
  role: ParticipantRole;
  area: string;
  stepIds: string[];
}

export interface ProcessDoc {
  id: string;
  code: string;
  name: string;
  category: ProcessCategory;
  status: ProcessStatus;
  version: string;
  owner: string;
  area: string;
  createdAt: string;
  revisedAt: string;
  description: string;
  tags: string[];
  keywords: string[];
  favorite: boolean;
  sections: ProcessSection[];
  steps: ProcessStep[];
  /* Build 007 — opcionais para manter compatibilidade com docs anteriores. */
  rules?: ProcessRule[];
  participants?: ProcessParticipant[];
  savedAt: string;
}

type StoreState = Record<string, ProcessDoc>;

let state: StoreState = {};
let hydrated = false;
let snapshotCache: ProcessDoc[] | null = null;
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

function getSnapshot(): ProcessDoc[] {
  ensureHydrated();
  if (!snapshotCache) {
    snapshotCache = Object.values(state).sort((a, b) =>
      (b.savedAt ?? "").localeCompare(a.savedAt ?? ""),
    );
  }
  return snapshotCache;
}

const serverSnapshot: ProcessDoc[] = [];
function getServerSnapshot() {
  return serverSnapshot;
}

export function useProcessDocs(): ProcessDoc[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useProcessDoc(id: string): ProcessDoc | undefined {
  return useProcessDocs().find((d) => d.id === id);
}

/**
 * Build 027.1 — leitura pontual (fora de React) para checagem de existência.
 * Estritamente somente leitura: não persiste, não emite, não muta o estado.
 */
export function getProcessDoc(id: string): ProcessDoc | undefined {
  ensureHydrated();
  return state[id];
}

function rid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
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
  return `PRC-${String(n).padStart(3, "0")}`;
}

function uniqueId(base: string) {
  let id = base;
  let n = 2;
  while (state[id]) id = `${base}-${n++}`;
  return id;
}

export function createProcessDoc(name = "Novo Processo"): ProcessDoc {
  ensureHydrated();
  const now = new Date();
  const id = uniqueId(`prc-${now.getTime().toString(36)}`);
  const doc: ProcessDoc = {
    id,
    code: nextCode(),
    name,
    category: "Operações",
    status: "em desenvolvimento",
    version: "v0.1",
    owner: "Você",
    area: "Operações",
    createdAt: formatDate(now),
    revisedAt: formatDate(now),
    description: "Processo em modelagem a partir do conhecimento existente.",
    tags: ["Processo"],
    keywords: [],
    favorite: false,
    sections: PROCESS_SECTION_TEMPLATES.map((t) => ({
      id: rid("s"),
      templateId: t.id,
      title: t.title,
      hint: t.hint,
      content: t.content,
      notes: "",
    })),
    steps: PROCESS_STEP_SEEDS.map((s) => ({
      id: rid("e"),
      name: s.name,
      description: s.description,
      owner: s.owner,
      inputs: s.inputs,
      outputs: s.outputs,
      duration: s.duration,
      notes: "",
    })),
    rules: RULE_SEEDS.map((r) => ({ id: rid("r"), ...r })),
    participants: [],
    savedAt: now.toISOString(),
  };
  doc.sections = withModelSections(doc.sections);
  state = { ...state, [id]: doc };
  persist();
  emit();
  return doc;
}

export function updateProcessDoc(
  id: string,
  patch: Partial<Omit<ProcessDoc, "id">>,
): ProcessDoc | undefined {
  ensureHydrated();
  const current = state[id];
  if (!current) return undefined;
  const next: ProcessDoc = {
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

export function updateProcessSection(
  docId: string,
  sectionKey: string,
  patch: Partial<Omit<ProcessSection, "id">>,
) {
  const doc = state[docId];
  if (!doc) return undefined;
  return updateProcessDoc(docId, {
    sections: doc.sections.map((s) =>
      s.id === sectionKey ? { ...s, ...patch } : s,
    ),
  });
}

export function updateProcessStep(
  docId: string,
  stepKey: string,
  patch: Partial<Omit<ProcessStep, "id">>,
) {
  const doc = state[docId];
  if (!doc) return undefined;
  return updateProcessDoc(docId, {
    steps: doc.steps.map((s) => (s.id === stepKey ? { ...s, ...patch } : s)),
  });
}

export function addProcessStep(docId: string, atIndex?: number) {
  const doc = state[docId];
  if (!doc) return undefined;
  const step: ProcessStep = {
    id: rid("e"),
    name: "Nova etapa",
    description: "",
    owner: "",
    inputs: "",
    outputs: "",
    duration: "",
    notes: "",
  };
  const steps = [...doc.steps];
  steps.splice(atIndex ?? steps.length, 0, step);
  return updateProcessDoc(docId, { steps });
}

export function removeProcessStep(docId: string, stepKey: string) {
  const doc = state[docId];
  if (!doc) return undefined;
  return updateProcessDoc(docId, {
    steps: doc.steps.filter((s) => s.id !== stepKey),
  });
}

export function moveProcessStep(docId: string, stepKey: string, delta: number) {
  const doc = state[docId];
  if (!doc) return undefined;
  const index = doc.steps.findIndex((s) => s.id === stepKey);
  const target = index + delta;
  if (index < 0 || target < 0 || target >= doc.steps.length) return doc;
  const steps = [...doc.steps];
  const [moved] = steps.splice(index, 1);
  steps.splice(target, 0, moved!);
  return updateProcessDoc(docId, { steps });
}

export function duplicateProcessDoc(id: string): ProcessDoc | undefined {
  ensureHydrated();
  const source = state[id];
  if (!source) return undefined;
  const now = new Date();
  const newId = uniqueId(`prc-${now.getTime().toString(36)}`);
  const copy: ProcessDoc = {
    ...source,
    id: newId,
    code: nextCode(),
    name: `${source.name} (cópia)`,
    status: "rascunho",
    version: "v0.1",
    createdAt: formatDate(now),
    revisedAt: formatDate(now),
    favorite: false,
    sections: source.sections.map((s) => ({ ...s, id: rid("s") })),
    steps: source.steps.map((s) => ({ ...s, id: rid("e") })),
    savedAt: now.toISOString(),
  };
  state = { ...state, [newId]: copy };
  persist();
  emit();
  return copy;
}


/* ------------------------------------------------------------------ */
/* Build 007 — Process Modeling Engine                                 */
/* ------------------------------------------------------------------ */

/**
 * Garante que o documento contenha todos os blocos do modelo organizacional,
 * preservando integralmente o conteúdo já escrito e as seções customizadas.
 */
export function withModelSections(sections: ProcessSection[]): ProcessSection[] {
  const byTemplate = new Map<string, ProcessSection>();
  const custom: ProcessSection[] = [];
  for (const section of sections) {
    if (section.templateId && !byTemplate.has(section.templateId)) {
      byTemplate.set(section.templateId, section);
    } else {
      custom.push(section);
    }
  }

  const catalog = [...PROCESS_SECTION_TEMPLATES, ...PROCESS_MODEL_SECTION_TEMPLATES];
  const ordered: ProcessSection[] = [];
  for (const templateId of PROCESS_MODEL_ORDER) {
    const existing = byTemplate.get(templateId);
    if (existing) {
      ordered.push(existing);
      byTemplate.delete(templateId);
      continue;
    }
    const template = catalog.find((t) => t.id === templateId);
    if (!template) continue;
    ordered.push({
      id: rid("s"),
      templateId: template.id,
      title: template.title,
      hint: template.hint,
      content: template.content,
      notes: "",
    });
  }

  return [...ordered, ...byTemplate.values(), ...custom];
}

/** Aplica os blocos do modelo a um processo já existente (idempotente). */
export function ensureProcessModel(docId: string) {
  ensureHydrated();
  const doc = state[docId];
  if (!doc) return undefined;
  const sections = withModelSections(doc.sections);
  const missing = sections.length !== doc.sections.length;
  if (!missing && doc.rules && doc.participants) return doc;
  const next: ProcessDoc = {
    ...doc,
    sections,
    rules: doc.rules ?? RULE_SEEDS.map((r) => ({ id: rid("r"), ...r })),
    participants: doc.participants ?? [],
  };
  state = { ...state, [docId]: next };
  persist();
  emit();
  return next;
}

export function addProcessRule(docId: string) {
  const doc = state[docId];
  if (!doc) return undefined;
  const rule: ProcessRule = {
    id: rid("r"),
    name: "Nova regra de negócio",
    description: "",
    application: "",
    impact: "",
    criticality: "média",
  };
  return updateProcessDoc(docId, { rules: [...(doc.rules ?? []), rule] });
}

export function updateProcessRule(
  docId: string,
  ruleId: string,
  patch: Partial<Omit<ProcessRule, "id">>,
) {
  const doc = state[docId];
  if (!doc) return undefined;
  return updateProcessDoc(docId, {
    rules: (doc.rules ?? []).map((r) => (r.id === ruleId ? { ...r, ...patch } : r)),
  });
}

export function removeProcessRule(docId: string, ruleId: string) {
  const doc = state[docId];
  if (!doc) return undefined;
  return updateProcessDoc(docId, {
    rules: (doc.rules ?? []).filter((r) => r.id !== ruleId),
  });
}

export function addProcessParticipant(docId: string, seed?: Partial<ProcessParticipant>) {
  const doc = state[docId];
  if (!doc) return undefined;
  const participant: ProcessParticipant = {
    id: rid("p"),
    name: seed?.name ?? "Novo participante",
    role: seed?.role ?? "Executor",
    area: seed?.area ?? "",
    stepIds: seed?.stepIds ?? [],
  };
  return updateProcessDoc(docId, {
    participants: [...(doc.participants ?? []), participant],
  });
}

export function updateProcessParticipant(
  docId: string,
  participantId: string,
  patch: Partial<Omit<ProcessParticipant, "id">>,
) {
  const doc = state[docId];
  if (!doc) return undefined;
  return updateProcessDoc(docId, {
    participants: (doc.participants ?? []).map((p) =>
      p.id === participantId ? { ...p, ...patch } : p,
    ),
  });
}

export function removeProcessParticipant(docId: string, participantId: string) {
  const doc = state[docId];
  if (!doc) return undefined;
  return updateProcessDoc(docId, {
    participants: (doc.participants ?? []).filter((p) => p.id !== participantId),
  });
}

export function toggleParticipantStep(
  docId: string,
  participantId: string,
  stepId: string,
) {
  const doc = state[docId];
  const participant = doc?.participants?.find((p) => p.id === participantId);
  if (!doc || !participant) return undefined;
  const stepIds = participant.stepIds.includes(stepId)
    ? participant.stepIds.filter((s) => s !== stepId)
    : [...participant.stepIds, stepId];
  return updateProcessParticipant(docId, participantId, { stepIds });
}
