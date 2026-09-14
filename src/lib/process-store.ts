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

import {
  normalizeProcessDoc,
  getProcessVersion,
  getWorkingProcessVersion,
  getPublishedProcessVersion,
  getAuthoringProcessVersion,
  type ProcessDoc,
  type LegacyProcessDoc,
  type ProcessDefinition,
  type ProcessVersion,
} from "./process-versioning";
export {
  normalizeProcessDoc,
  getProcessVersion,
  getWorkingProcessVersion,
  getPublishedProcessVersion,
  getAuthoringProcessVersion,
} from "./process-versioning";
export type {
  ProcessDoc,
  LegacyProcessDoc,
  ProcessDefinition,
  ProcessVersion,
  ProcessVersionStatus,
} from "./process-versioning";

const STORAGE_KEY = "process-platform:process:v1";

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

type StoreState = Record<string, ProcessDoc>;

let state: StoreState = {};
let hydrated = false;
let snapshotCache: ProcessDoc[] | null = null;
const listeners = new Set<() => void>();

function ensureHydrated() {
  if (hydrated || typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, ProcessDoc | LegacyProcessDoc>) : {};
    state = Object.fromEntries(
      Object.entries(parsed).map(([id, doc]) => [id, freezeProcess(normalizeProcessDoc(doc))]),
    );
    if (raw && JSON.stringify(state) !== raw) persist();
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

/**
 * Build 029 — leitura pura de todos os Processos, fora de React.
 * Mesmo padrão de `getProcessDoc`: não persiste, não emite, não muta o estado.
 * Existe para que outros stores não precisem conhecer a chave de localStorage daqui.
 */
export function getProcessDocs(): ProcessDoc[] {
  ensureHydrated();
  return Object.values(state);
}

function rid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
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
  const definition: ProcessDefinition = {
    name,
    category: "Operações",
    owner: "Você",
    area: "Operações",
    description: "Processo em modelagem a partir do conhecimento existente.",
    tags: ["Processo"],
    keywords: [],
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
  };
  definition.sections = withModelSections(definition.sections);
  const versionId = id + "-pv1";
  const at = now.toISOString();
  return saveProcess({
    id,
    code: nextCode(),
    favorite: false,
    createdAt: at,
    savedAt: at,
    workingVersionId: versionId,
    versions: [
      { id: versionId, number: 1, status: "rascunho", definition, createdAt: at, updatedAt: at },
    ],
  });
}

function freezeProcess<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freezeProcess(child);
    Object.freeze(value);
  }
  return value;
}
function saveProcess(doc: ProcessDoc): ProcessDoc {
  const saved = freezeProcess(structuredClone(doc));
  state = { ...state, [saved.id]: saved };
  persist();
  emit();
  return saved;
}
function workingDefinition(id: string): ProcessDefinition | undefined {
  ensureHydrated();
  const doc = state[id];
  return doc ? getWorkingProcessVersion(doc)?.definition : undefined;
}
export function updateProcessDoc(
  id: string,
  patch: Partial<Pick<ProcessDoc, "favorite">>,
): ProcessDoc | undefined {
  ensureHydrated();
  const doc = state[id];
  if (!doc) return undefined;
  return saveProcess({
    ...doc,
    ...(typeof patch.favorite === "boolean" ? { favorite: patch.favorite } : {}),
    savedAt: new Date().toISOString(),
  });
}
export function updateWorkingProcessDefinition(
  id: string,
  patch: Partial<ProcessDefinition>,
): ProcessDoc | undefined {
  ensureHydrated();
  const doc = state[id];
  const working = doc && getWorkingProcessVersion(doc);
  if (!doc || !working) return undefined;
  const now = new Date().toISOString();
  return saveProcess({
    ...doc,
    savedAt: now,
    versions: doc.versions.map((v) =>
      v.id === working.id
        ? { ...v, updatedAt: now, definition: { ...v.definition, ...structuredClone(patch) } }
        : v,
    ),
  });
}

export function updateProcessSection(
  docId: string,
  sectionKey: string,
  patch: Partial<Omit<ProcessSection, "id">>,
) {
  const doc = workingDefinition(docId);
  if (!doc) return undefined;
  return updateWorkingProcessDefinition(docId, {
    sections: doc.sections.map((s) => (s.id === sectionKey ? { ...s, ...patch } : s)),
  });
}

export function updateProcessStep(
  docId: string,
  stepKey: string,
  patch: Partial<Omit<ProcessStep, "id">>,
) {
  const doc = workingDefinition(docId);
  if (!doc) return undefined;
  return updateWorkingProcessDefinition(docId, {
    steps: doc.steps.map((s) => (s.id === stepKey ? { ...s, ...patch } : s)),
  });
}

export function addProcessStep(docId: string, atIndex?: number) {
  const doc = workingDefinition(docId);
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
  return updateWorkingProcessDefinition(docId, { steps });
}

export function removeProcessStep(docId: string, stepKey: string) {
  const doc = workingDefinition(docId);
  if (!doc) return undefined;
  return updateWorkingProcessDefinition(docId, {
    steps: doc.steps.filter((s) => s.id !== stepKey),
  });
}

export function moveProcessStep(docId: string, stepKey: string, delta: number) {
  const doc = workingDefinition(docId);
  if (!doc) return undefined;
  const index = doc.steps.findIndex((s) => s.id === stepKey);
  const target = index + delta;
  if (index < 0 || target < 0 || target >= doc.steps.length) return doc;
  const steps = [...doc.steps];
  const [moved] = steps.splice(index, 1);
  steps.splice(target, 0, moved!);
  return updateWorkingProcessDefinition(docId, { steps });
}

export function duplicateProcessDoc(id: string): ProcessDoc | undefined {
  ensureHydrated();
  const source = state[id];
  const sourceVersion = source && getAuthoringProcessVersion(source);
  if (!source || !sourceVersion) return undefined;
  const now = new Date().toISOString();
  const newId = uniqueId("prc-" + Date.now().toString(36));
  const definition = structuredClone(sourceVersion.definition);
  const stepIds = new Map(definition.steps.map((step) => [step.id, rid("e")]));
  definition.name += " (cópia)";
  definition.sections = definition.sections.map((section) => ({ ...section, id: rid("s") }));
  definition.steps = definition.steps.map((step) => ({ ...step, id: stepIds.get(step.id)! }));
  definition.rules = definition.rules.map((rule) => ({ ...rule, id: rid("r") }));
  definition.participants = definition.participants.map((participant) => ({
    ...participant,
    id: rid("p"),
    stepIds: participant.stepIds.flatMap((id) => {
      const mapped = stepIds.get(id);
      return mapped ? [mapped] : [];
    }),
  }));
  const versionId = newId + "-pv1";
  return saveProcess({
    id: newId,
    code: nextCode(),
    favorite: false,
    createdAt: now,
    savedAt: now,
    workingVersionId: versionId,
    versions: [
      { id: versionId, number: 1, status: "rascunho", createdAt: now, updatedAt: now, definition },
    ],
  });
}

export type CreateProcessVersionResult =
  | { ok: true; version: ProcessVersion }
  | {
      ok: false;
      reason:
        "process-not-found" | "draft-exists" | "version-not-found" | "version-not-owned-by-process";
    };
export function createProcessVersion(
  processId: string,
  basedOnVersionId?: string,
): CreateProcessVersionResult {
  ensureHydrated();
  const doc = state[processId];
  if (!doc) return { ok: false, reason: "process-not-found" };
  if (doc.versions.some((v) => v.status === "rascunho"))
    return { ok: false, reason: "draft-exists" };
  const base = basedOnVersionId
    ? getProcessVersion(doc, basedOnVersionId)
    : getPublishedProcessVersion(doc);
  if (!base) {
    const otherOwner =
      basedOnVersionId &&
      Object.values(state).some(
        (other) => other.id !== processId && other.versions.some((v) => v.id === basedOnVersionId),
      );
    return { ok: false, reason: otherOwner ? "version-not-owned-by-process" : "version-not-found" };
  }
  const number = Math.max(0, ...doc.versions.map((v) => v.number)) + 1;
  const now = new Date().toISOString();
  const version: ProcessVersion = {
    id: doc.id + "-pv" + number,
    number,
    status: "rascunho",
    basedOnVersionId: base.id,
    definition: structuredClone(base.definition),
    createdAt: now,
    updatedAt: now,
  };
  const saved = saveProcess({
    ...doc,
    workingVersionId: version.id,
    savedAt: now,
    versions: [...doc.versions, version],
  });
  return { ok: true, version: getWorkingProcessVersion(saved)! };
}
export type PublishProcessVersionResult =
  { ok: true; version: ProcessVersion } | { ok: false; reason: "process-not-found" | "no-draft" };
export function publishProcessVersion(processId: string): PublishProcessVersionResult {
  ensureHydrated();
  const doc = state[processId];
  if (!doc) return { ok: false, reason: "process-not-found" };
  const draft = getWorkingProcessVersion(doc);
  if (!draft) return { ok: false, reason: "no-draft" };
  const now = new Date().toISOString();
  const { workingVersionId: _working, ...container } = doc;
  const saved = saveProcess({
    ...container,
    savedAt: now,
    publishedVersionId: draft.id,
    versions: doc.versions.map((version) =>
      version.id === draft.id
        ? { ...version, status: "publicada", publishedAt: now, updatedAt: now }
        : version.status === "publicada"
          ? { ...version, status: "arquivada", archivedAt: now, updatedAt: now }
          : version,
    ),
  });
  return { ok: true, version: getPublishedProcessVersion(saved)! };
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
  const definition = workingDefinition(docId);
  if (!definition) return undefined;
  const sections = withModelSections(definition.sections);
  if (sections.length === definition.sections.length) return getProcessDoc(docId);
  return updateWorkingProcessDefinition(docId, { sections });
}

export function addProcessRule(docId: string) {
  const doc = workingDefinition(docId);
  if (!doc) return undefined;
  const rule: ProcessRule = {
    id: rid("r"),
    name: "Nova regra de negócio",
    description: "",
    application: "",
    impact: "",
    criticality: "média",
  };
  return updateWorkingProcessDefinition(docId, { rules: [...(doc.rules ?? []), rule] });
}

export function updateProcessRule(
  docId: string,
  ruleId: string,
  patch: Partial<Omit<ProcessRule, "id">>,
) {
  const doc = workingDefinition(docId);
  if (!doc) return undefined;
  return updateWorkingProcessDefinition(docId, {
    rules: (doc.rules ?? []).map((r) => (r.id === ruleId ? { ...r, ...patch } : r)),
  });
}

export function removeProcessRule(docId: string, ruleId: string) {
  const doc = workingDefinition(docId);
  if (!doc) return undefined;
  return updateWorkingProcessDefinition(docId, {
    rules: (doc.rules ?? []).filter((r) => r.id !== ruleId),
  });
}

export function addProcessParticipant(docId: string, seed?: Partial<ProcessParticipant>) {
  const doc = workingDefinition(docId);
  if (!doc) return undefined;
  const participant: ProcessParticipant = {
    id: rid("p"),
    name: seed?.name ?? "Novo participante",
    role: seed?.role ?? "Executor",
    area: seed?.area ?? "",
    stepIds: seed?.stepIds ?? [],
  };
  return updateWorkingProcessDefinition(docId, {
    participants: [...(doc.participants ?? []), participant],
  });
}

export function updateProcessParticipant(
  docId: string,
  participantId: string,
  patch: Partial<Omit<ProcessParticipant, "id">>,
) {
  const doc = workingDefinition(docId);
  if (!doc) return undefined;
  return updateWorkingProcessDefinition(docId, {
    participants: (doc.participants ?? []).map((p) =>
      p.id === participantId ? { ...p, ...patch } : p,
    ),
  });
}

export function removeProcessParticipant(docId: string, participantId: string) {
  const doc = workingDefinition(docId);
  if (!doc) return undefined;
  return updateWorkingProcessDefinition(docId, {
    participants: (doc.participants ?? []).filter((p) => p.id !== participantId),
  });
}

export function toggleParticipantStep(docId: string, participantId: string, stepId: string) {
  const doc = workingDefinition(docId);
  const participant = doc?.participants?.find((p) => p.id === participantId);
  if (!doc || !participant) return undefined;
  const stepIds = participant.stepIds.includes(stepId)
    ? participant.stepIds.filter((s) => s !== stepId)
    : [...participant.stepIds, stepId];
  return updateProcessParticipant(docId, participantId, { stepIds });
}
