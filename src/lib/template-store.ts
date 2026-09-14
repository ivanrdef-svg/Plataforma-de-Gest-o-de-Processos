/**
 * Build 019 — armazenamento local dos Workflow Templates.
 *
 * Store ADICIONAL, no mesmo padrão dos existentes (`workflow-store.ts` como
 * referência): `useSyncExternalStore` + localStorage, com chave própria.
 * Nada das Builds 001–018.1 é substituído.
 *
 * Princípio arquitetural absoluto:
 *   Template → cópia profunda → novo Workflow → V1 Rascunho → Validation →
 *   Publication Readiness → Publicação → Versão publicada → Runtime.
 *
 * Depois de criado, Template e Workflow são TOTALMENTE independentes. O
 * Template NUNCA gera Runtime, nunca participa de execução, SLA de runtime,
 * Inbox, Notifications ou Tasks, e não há sincronização em nenhuma direção.
 */

import { useSyncExternalStore } from "react";
import {
  createWorkflowFromTemplateContent,
  publishedWorkflowVersion,
  type WorkflowDoc,
  type WorkflowFromTemplateOverrides,
  type WorkflowTemplateOrigin,
  type WorkflowValidationRecord,
  type WorkflowValidationStatus,
  type WorkflowVersionContent,
} from "@/lib/workflow-store";
import { validateWorkflow, type WorkflowValidation } from "@/lib/workflow-validation";

const STORAGE_KEY = "process-platform:template:v1";

/* ------------------------------------------------------------------ */
/* Modelo                                                              */
/* ------------------------------------------------------------------ */

export const TEMPLATE_STATUSES = ["rascunho", "ativo", "arquivado"] as const;
export type TemplateStatus = (typeof TEMPLATE_STATUSES)[number];

/**
 * Conteúdo do Template: snapshot congelado e independente. Estruturalmente
 * igual ao `WorkflowVersionContent` já existente — reaproveitado de propósito
 * para que a validação e a criação de Workflow funcionem sem adaptação.
 */
export type WorkflowTemplateContent = WorkflowVersionContent;

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  /** Categoria livre (texto), definida pelo autor do template. */
  category: string;
  tags: string[];
  status: TemplateStatus;
  createdAt: string;
  updatedAt: string;
  /* Rastreabilidade — NUNCA uma dependência operacional. */
  sourceWorkflowId?: string;
  sourceWorkflowVersion?: number;
  sourceProcessVersionId?: string;
  /** Snapshot congelado e independente. */
  content: WorkflowTemplateContent;
  /** Mesmo formato de validação já usado pelos Workflows. */
  validation?: WorkflowValidationRecord;
}

/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */

type StoreState = Record<string, WorkflowTemplate>;

let state: StoreState = {};
let hydrated = false;
let snapshotCache: WorkflowTemplate[] | null = null;
const listeners = new Set<() => void>();

function deepCopy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
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

function getSnapshot(): WorkflowTemplate[] {
  ensureHydrated();
  if (!snapshotCache) {
    snapshotCache = Object.values(state).sort((a, b) =>
      (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""),
    );
  }
  return snapshotCache;
}

const serverSnapshot: WorkflowTemplate[] = [];
function getServerSnapshot() {
  return serverSnapshot;
}

export function useWorkflowTemplates(): WorkflowTemplate[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useWorkflowTemplate(id: string): WorkflowTemplate | undefined {
  return useWorkflowTemplates().find((t) => t.id === id);
}

export function getWorkflowTemplate(id: string): WorkflowTemplate | undefined {
  ensureHydrated();
  return state[id];
}

function rid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function write(id: string, patch: Partial<Omit<WorkflowTemplate, "id">>) {
  const current = state[id];
  if (!current) return undefined;
  const next: WorkflowTemplate = {
    ...current,
    ...patch,
    id,
    updatedAt: new Date().toISOString(),
  };
  state = { ...state, [id]: next };
  persist();
  emit();
  return next;
}

/* ------------------------------------------------------------------ */
/* Validação — reaproveita integralmente o motor da Build 016          */
/* ------------------------------------------------------------------ */

/**
 * Monta uma representação compatível com `WorkflowDoc` a partir do conteúdo
 * do Template. Função de ADAPTAÇÃO de formato apenas: nenhuma regra de
 * validação é reimplementada aqui.
 */
export function templateContentAsWorkflowDoc(
  template: WorkflowTemplate,
): WorkflowDoc {
  const c = template.content;
  return {
    id: template.id,
    code: "TPL",
    name: template.name,
    description: c.description,
    processId: c.processId,
    processName: c.processName,
    processVersion: c.processVersion,
    objective: c.objective,
    version: "template",
    status: "em configuração",
    /* O template não tem dono operacional próprio: usa o responsável herdado
       do conteúdo para que a validação estrutural continue significativa. */
    owner: c.participants[0]?.name ?? "",
    area: c.participants[0]?.area ?? "",
    createdAt: template.createdAt,
    revisedAt: template.updatedAt,
    favorite: false,
    steps: c.steps,
    participants: c.participants,
    savedAt: template.updatedAt,
    ...(c.slaAmount !== undefined ? { slaAmount: c.slaAmount } : {}),
    ...(c.slaUnit ? { slaUnit: c.slaUnit } : {}),
    ...(c.taskSlaAmount !== undefined ? { taskSlaAmount: c.taskSlaAmount } : {}),
    ...(c.taskSlaUnit ? { taskSlaUnit: c.taskSlaUnit } : {}),
  };
}

/** Validação do Template — mesma função central usada pelos Workflows. */
export function validateTemplate(template: WorkflowTemplate): WorkflowValidation {
  return validateWorkflow(templateContentAsWorkflowDoc(template), {
    /* O processo de origem é apenas rastreabilidade histórica no Template. */
    processExists: true,
  });
}

function recordOf(validation: WorkflowValidation): WorkflowValidationRecord {
  return {
    status: validation.status as WorkflowValidationStatus,
    errors: validation.errors.length,
    warnings: validation.warnings.length,
    validatedAt: new Date().toISOString(),
  };
}

/* ------------------------------------------------------------------ */
/* Criação                                                             */
/* ------------------------------------------------------------------ */

export interface TemplateDraftOverrides {
  name?: string;
  description?: string;
  category?: string;
  tags?: string[];
}

export type CreateTemplateResult =
  | { ok: true; template: WorkflowTemplate }
  | { ok: false; reason: "no-published-version" };

/**
 * Cria um Template a partir de um Workflow. Somente uma versão PUBLICADA
 * pode originar um Template — o conteúdo congelado dessa versão é copiado
 * profundamente para dentro do Template.
 */
export function createTemplateFromWorkflow(
  doc: WorkflowDoc,
  overrides: TemplateDraftOverrides = {},
): CreateTemplateResult {
  ensureHydrated();
  const published = publishedWorkflowVersion(doc);
  if (!published?.content) return { ok: false, reason: "no-published-version" };

  const now = new Date().toISOString();
  const template: WorkflowTemplate = {
    id: rid("tpl"),
    name: overrides.name?.trim() || `Template · ${doc.name}`,
    description:
      overrides.description?.trim() ||
      `Modelo reutilizável derivado da versão ${published.number} de ${doc.name}.`,
    category: overrides.category?.trim() || "Geral",
    tags: overrides.tags ? [...overrides.tags] : [],
    status: "rascunho",
    createdAt: now,
    updatedAt: now,
    sourceWorkflowId: doc.id,
    sourceWorkflowVersion: published.number,
    ...(published.sourceProcessVersionId !== undefined
      ? { sourceProcessVersionId: published.sourceProcessVersionId }
      : {}),
    content: deepCopy(published.content),
  };

  state = { ...state, [template.id]: template };
  persist();
  emit();
  return { ok: true, template };
}

/* ------------------------------------------------------------------ */
/* Edição e ciclo de vida                                              */
/* ------------------------------------------------------------------ */

/** Campos editáveis de um Template (somente enquanto rascunho). */
export type TemplatePatch = Partial<
  Pick<
    WorkflowTemplate,
    "name" | "description" | "category" | "tags" | "content"
  >
>;

/** Só rascunhos podem ser alterados — trava no store, não apenas na UI. */
export function updateTemplate(
  id: string,
  patch: TemplatePatch,
): WorkflowTemplate | undefined {
  ensureHydrated();
  const current = state[id];
  if (!current) return undefined;
  if (current.status !== "rascunho") return undefined;
  return write(id, patch);
}

export function isTemplateEditable(template: WorkflowTemplate): boolean {
  return template.status === "rascunho";
}

export type ActivateTemplateResult =
  | { ok: true; template: WorkflowTemplate }
  | {
      ok: false;
      reason: "not-found" | "invalid-status" | "invalid";
      errors?: number;
    };

/**
 * Ativa um Template. A validação é sempre RECALCULADA aqui — nunca se confia
 * em um resultado em cache. Erros bloqueiam; avisos não.
 */
export function activateTemplate(id: string): ActivateTemplateResult {
  ensureHydrated();
  const current = state[id];
  if (!current) return { ok: false, reason: "not-found" };
  if (current.status !== "rascunho") return { ok: false, reason: "invalid-status" };

  const validation = validateTemplate(current);
  const record = recordOf(validation);
  if (record.errors > 0) {
    write(id, { validation: record });
    return { ok: false, reason: "invalid", errors: record.errors };
  }
  const next = write(id, { status: "ativo", validation: record });
  return next ? { ok: true, template: next } : { ok: false, reason: "not-found" };
}

export type ArchiveTemplateResult =
  | { ok: true; template: WorkflowTemplate }
  | { ok: false; reason: "not-found" | "invalid-status" };

/** Arquivar só a partir de "ativo". Permanece visível como histórico. */
export function archiveTemplate(id: string): ArchiveTemplateResult {
  ensureHydrated();
  const current = state[id];
  if (!current) return { ok: false, reason: "not-found" };
  if (current.status !== "ativo") return { ok: false, reason: "invalid-status" };
  const next = write(id, { status: "arquivado" });
  return next ? { ok: true, template: next } : { ok: false, reason: "not-found" };
}

/** Cópia profunda e independente como novo Template em rascunho. */
export function duplicateTemplate(id: string): WorkflowTemplate | undefined {
  ensureHydrated();
  const current = state[id];
  if (!current) return undefined;
  const now = new Date().toISOString();
  const copy: WorkflowTemplate = {
    ...deepCopy(current),
    id: rid("tpl"),
    name: `${current.name} (cópia)`,
    status: "rascunho",
    createdAt: now,
    updatedAt: now,
  };
  delete copy.validation;
  state = { ...state, [copy.id]: copy };
  persist();
  emit();
  return copy;
}

/* ------------------------------------------------------------------ */
/* Template → novo Workflow                                            */
/* ------------------------------------------------------------------ */

export type WorkflowFromTemplateResult =
  | { ok: true; doc: WorkflowDoc }
  | { ok: false; reason: "not-found" | "not-active" };

/**
 * Cria um novo Workflow a partir de um Template ATIVO. O conteúdo é copiado
 * profundamente de novo (independente da cópia guardada no Template), de modo
 * que Template e Workflow ficam totalmente desacoplados a partir daqui.
 */
export function createWorkflowFromTemplate(
  templateId: string,
  overrides: WorkflowFromTemplateOverrides = {},
): WorkflowFromTemplateResult {
  ensureHydrated();
  const template = state[templateId];
  if (!template) return { ok: false, reason: "not-found" };
  if (template.status !== "ativo") return { ok: false, reason: "not-active" };

  const origin: WorkflowTemplateOrigin = {
    ...(template.sourceProcessVersionId !== undefined
      ? { sourceProcessVersionId: template.sourceProcessVersionId }
      : {}),
    templateId: template.id,
    templateName: template.name,
    ...(template.sourceWorkflowId
      ? { sourceWorkflowId: template.sourceWorkflowId }
      : {}),
    ...(template.sourceWorkflowVersion !== undefined
      ? { sourceWorkflowVersion: template.sourceWorkflowVersion }
      : {}),
    createdAt: new Date().toISOString(),
  };

  const doc = createWorkflowFromTemplateContent(
    deepCopy(template.content),
    {
      name: overrides.name?.trim() || template.name,
      ...(overrides.description !== undefined
        ? { description: overrides.description }
        : {}),
      ...(overrides.area !== undefined ? { area: overrides.area } : {}),
      ...(overrides.owner !== undefined ? { owner: overrides.owner } : {}),
      ...(overrides.objective !== undefined
        ? { objective: overrides.objective }
        : {}),
    },
    origin,
  );
  return { ok: true, doc };
}
