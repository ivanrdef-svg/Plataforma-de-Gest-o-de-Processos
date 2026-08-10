/**
 * Build 010 — store do Enterprise Governance Engine.
 *
 * Mesmo padrão dos stores existentes (knowledge / pop / process / relationship
 * / lifecycle): persistência temporária em localStorage com `useSyncExternalStore`.
 *
 * Ativos ainda sem governança registrada recebem uma configuração simulada
 * determinística, coerente com o Lifecycle Engine (estado atual do ativo) e com
 * o Relationship Engine (riscos, controles e normas já vinculados ao objeto).
 * Nenhum dado existente é alterado ou removido por esta camada.
 */

import { useMemo, useSyncExternalStore } from "react";
import {
  PERIODICITY_DAYS,
  reviewSituationFor,
  type ApprovalStatus,
  type ComplianceKind,
  type ComplianceStatus,
  type ControlStatus,
  type ControlType,
  type CriticalityLevel,
  type GovernanceEventKind,
  type ResponsibilityRole,
  type ResponsibilityScope,
  type ReviewPeriodicity,
  type RiskStatus,
} from "@/config/governance-model";
import { getRelationships } from "@/lib/relationship-store";
import { getLifecycle, type LifecycleObjectKind } from "@/lib/lifecycle-store";

const STORAGE_KEY = "process-platform:governance:v1";

export type GovernanceObjectKind = LifecycleObjectKind;

export interface Responsibility {
  id: string;
  role: ResponsibilityRole;
  name: string;
  scope: ResponsibilityScope;
  detail: string;
}

export interface GovernanceReview {
  lastAt: string;
  nextAt: string;
  periodicity: ReviewPeriodicity;
  reviewer: string;
}

export interface GovernanceApproval {
  approver: string;
  status: ApprovalStatus;
  approvedAt: string;
  nextAt: string;
}

export interface ComplianceRequirement {
  id: string;
  name: string;
  kind: ComplianceKind;
  requirement: string;
  status: ComplianceStatus;
  /** Id do objeto correspondente no Relationship Engine, quando existir. */
  objectId?: string;
}

export interface GovernanceRisk {
  id: string;
  name: string;
  criticality: CriticalityLevel;
  description: string;
  status: RiskStatus;
  control: string;
  objectId?: string;
}

export interface GovernanceControl {
  id: string;
  name: string;
  type: ControlType;
  owner: string;
  periodicity: ReviewPeriodicity;
  status: ControlStatus;
  risk: string;
  objectId?: string;
}

export interface GovernanceEvent {
  id: string;
  at: string;
  kind: GovernanceEventKind;
  user: string;
  title: string;
  note: string;
}

export interface GovernanceRecord {
  objectId: string;
  kind: GovernanceObjectKind;
  name: string;
  criticality: CriticalityLevel;
  responsibilities: Responsibility[];
  review: GovernanceReview;
  approval: GovernanceApproval;
  compliance: ComplianceRequirement[];
  risks: GovernanceRisk[];
  controls: GovernanceControl[];
  events: GovernanceEvent[];
  updatedAt: string;
  /** true enquanto a governança for apenas simulada. */
  seeded?: boolean;
}

export interface GovernanceSeed {
  objectId: string;
  kind: GovernanceObjectKind;
  name: string;
  owner?: string;
  /** `status` legado do módulo — usado pelo Lifecycle Engine. */
  status?: string;
  updatedAt?: string;
}

type StoreState = Record<string, GovernanceRecord>;

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
  persist();
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

/* ------------------------------------------------------------------ */
/* Semente determinística                                              */
/* ------------------------------------------------------------------ */

function hash(value: string) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

const PEOPLE = [
  "Marina Alves",
  "Camila Torres",
  "Rafael Lima",
  "Bruno Carvalho",
  "Helena Duarte",
  "Diego Moraes",
];

const AREAS = ["Operações", "Compliance", "Financeiro", "Tecnologia", "Jurídico"];

const CARGOS = [
  "Gerente de Processos",
  "Analista de Compliance",
  "Coordenador Operacional",
  "Diretor de Operações",
];

const PERIODICITIES: ReviewPeriodicity[] = [
  "Trimestral",
  "Semestral",
  "Anual",
  "Mensal",
];

const CRITICALITIES: CriticalityLevel[] = ["baixa", "média", "alta", "crítica"];

const COMPLIANCE_SEED: Array<{
  name: string;
  kind: ComplianceKind;
  requirement: string;
  status: ComplianceStatus;
}> = [
  {
    name: "Política de Segurança da Informação",
    kind: "Política",
    requirement: "Classificação e tratamento da informação.",
    status: "conforme",
  },
  {
    name: "LGPD — Lei 13.709/2018",
    kind: "Regulamento",
    requirement: "Base legal e minimização de dados pessoais.",
    status: "em análise",
  },
  {
    name: "ISO 9001:2015",
    kind: "Framework",
    requirement: "Controle de documentos e registros (7.5).",
    status: "conforme",
  },
  {
    name: "Código de Conduta",
    kind: "Norma",
    requirement: "Segregação de funções e conflito de interesses.",
    status: "pendente",
  },
  {
    name: "COSO ERM",
    kind: "Framework",
    requirement: "Avaliação e resposta a riscos operacionais.",
    status: "em análise",
  },
  {
    name: "Matriz de Alçadas",
    kind: "Requisito",
    requirement: "Aprovação por nível de autoridade definido.",
    status: "conforme",
  },
  {
    name: "Política de Crédito",
    kind: "Política",
    requirement: "Limites e critérios de concessão.",
    status: "não aplicável",
  },
];

const RISK_SEED: Array<{
  name: string;
  criticality: CriticalityLevel;
  description: string;
  status: RiskStatus;
  control: string;
}> = [
  {
    name: "Falha de cadastro na origem",
    criticality: "alta",
    description: "Informação incorreta registrada no início do fluxo.",
    status: "em tratamento",
    control: "Dupla checagem de cadastro",
  },
  {
    name: "Vazamento de dados sensíveis",
    criticality: "crítica",
    description: "Exposição indevida de dados pessoais durante a execução.",
    status: "identificado",
    control: "Revisão periódica de acessos",
  },
  {
    name: "Execução fora do procedimento",
    criticality: "média",
    description: "Atividade realizada sem seguir o POP vigente.",
    status: "em tratamento",
    control: "Auditoria amostral mensal",
  },
  {
    name: "Documento desatualizado em uso",
    criticality: "alta",
    description: "Versão obsoleta utilizada pela operação.",
    status: "mitigado",
    control: "Alerta de revisão vencida",
  },
  {
    name: "Dependência de pessoa-chave",
    criticality: "média",
    description: "Conhecimento concentrado em um único responsável.",
    status: "aceito",
    control: "Matriz de backup de responsáveis",
  },
];

const CONTROL_SEED: Array<{
  name: string;
  type: ControlType;
  status: ControlStatus;
  risk: string;
}> = [
  {
    name: "Dupla checagem de cadastro",
    type: "Preventivo",
    status: "ativo",
    risk: "Falha de cadastro na origem",
  },
  {
    name: "Revisão periódica de acessos",
    type: "Detectivo",
    status: "ativo",
    risk: "Vazamento de dados sensíveis",
  },
  {
    name: "Auditoria amostral mensal",
    type: "Detectivo",
    status: "em implantação",
    risk: "Execução fora do procedimento",
  },
  {
    name: "Alerta de revisão vencida",
    type: "Automatizado",
    status: "ativo",
    risk: "Documento desatualizado em uso",
  },
  {
    name: "Matriz de backup de responsáveis",
    type: "Corretivo",
    status: "em implantação",
    risk: "Dependência de pessoa-chave",
  },
];

function isoDaysFromNow(days: number) {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

function pick<T>(list: T[], index: number): T {
  return list[index % list.length]!;
}

function seedResponsibilities(seed: GovernanceSeed, base: number): Responsibility[] {
  const owner = seed.owner?.trim() || pick(PEOPLE, base);
  const items: Array<Omit<Responsibility, "id">> = [
    { role: "Owner", name: owner, scope: "Pessoa", detail: pick(AREAS, base) },
    {
      role: "Co-owner",
      name: pick(PEOPLE, base + 3),
      scope: "Pessoa",
      detail: pick(AREAS, base + 1),
    },
    {
      role: "Revisor",
      name: pick(CARGOS, base + 1),
      scope: "Cargo",
      detail: "Revisão técnica do conteúdo",
    },
    {
      role: "Aprovador",
      name: pick(CARGOS, base + 3),
      scope: "Cargo",
      detail: "Autoridade formal de aprovação",
    },
    {
      role: "Executor",
      name: pick(AREAS, base + 2),
      scope: "Área",
      detail: "Aplicação no dia a dia",
    },
    {
      role: "Consultado",
      name: "Compliance",
      scope: "Área",
      detail: "Consulta prévia a mudanças relevantes",
    },
    {
      role: "Informado",
      name: pick(AREAS, base + 4),
      scope: "Área",
      detail: "Comunicação de publicações",
    },
  ];
  return items.map((item, i) => ({ ...item, id: `${seed.objectId}-resp-${i}` }));
}

/** Riscos, controles e normas já vinculados no Relationship Engine. */
function relatedByType(objectId: string, type: string) {
  return getRelationships(objectId).filter((r) => r.targetType === type);
}

function buildSeedRecord(seed: GovernanceSeed): GovernanceRecord {
  const base = hash(seed.objectId);
  const lifecycle = getLifecycle(seed);
  const criticality = pick(CRITICALITIES, base >> 2);
  const periodicity = pick(PERIODICITIES, base);
  const cycle = PERIODICITY_DAYS[periodicity];
  const lastAt = isoDaysFromNow(-((base % cycle) + 5));
  const nextAt = new Date(Date.parse(lastAt) + cycle * 86_400_000).toISOString();

  const responsibilities = seedResponsibilities(seed, base);
  const approver =
    responsibilities.find((r) => r.role === "Aprovador")?.name ?? pick(CARGOS, base);

  const approvalStatus: ApprovalStatus =
    lifecycle.state === "publicado" || lifecycle.state === "aprovado"
      ? "aprovada"
      : lifecycle.state === "aguardando aprovação"
        ? "aguardando aprovação"
        : lifecycle.state === "obsoleto" || lifecycle.state === "arquivado"
          ? "expirada"
          : "não iniciada";

  // Conformidade: prioriza normas já relacionadas ao objeto.
  const relatedNorms = [
    ...relatedByType(seed.objectId, "Norma"),
    ...relatedByType(seed.objectId, "Documento"),
  ].slice(0, 2);

  const compliance: ComplianceRequirement[] = [
    ...relatedNorms.map((rel, i) => ({
      id: `${seed.objectId}-cmp-rel-${i}`,
      name: rel.targetName,
      kind: (rel.targetType === "Norma" ? "Norma" : "Requisito") as ComplianceKind,
      requirement: rel.description,
      status: (i === 0 ? "conforme" : "em análise") as ComplianceStatus,
      objectId: rel.targetId,
    })),
    ...[0, 1, 2].map((offset) => {
      const item = pick(COMPLIANCE_SEED, base + offset * 2);
      return {
        id: `${seed.objectId}-cmp-${offset}`,
        name: item.name,
        kind: item.kind,
        requirement: item.requirement,
        status: item.status,
      };
    }),
  ].filter(
    (item, index, all) => all.findIndex((other) => other.name === item.name) === index,
  );

  const relatedRisks = relatedByType(seed.objectId, "Risco").slice(0, 1);
  const risks: GovernanceRisk[] = [
    ...relatedRisks.map((rel, i) => {
      const item = pick(RISK_SEED, base + i);
      return {
        id: `${seed.objectId}-risk-rel-${i}`,
        name: rel.targetName,
        criticality: item.criticality,
        description: rel.description,
        status: item.status,
        control: item.control,
        objectId: rel.targetId,
      };
    }),
    ...[0, 1, 2].map((offset) => {
      const item = pick(RISK_SEED, base + offset * 3 + 1);
      return {
        id: `${seed.objectId}-risk-${offset}`,
        name: item.name,
        criticality: item.criticality,
        description: item.description,
        status: item.status,
        control: item.control,
      };
    }),
  ].filter(
    (item, index, all) => all.findIndex((other) => other.name === item.name) === index,
  );

  const controls: GovernanceControl[] = [0, 1, 2].map((offset) => {
    const item = pick(CONTROL_SEED, base + offset * 2);
    return {
      id: `${seed.objectId}-ctrl-${offset}`,
      name: item.name,
      type: item.type,
      owner: pick(PEOPLE, base + offset + 2),
      periodicity: pick(PERIODICITIES, base + offset),
      status: item.status,
      risk: item.risk,
    };
  }).filter(
    (item, index, all) => all.findIndex((other) => other.name === item.name) === index,
  );

  const events: GovernanceEvent[] = [
    {
      id: `${seed.objectId}-gov-0`,
      at: isoDaysFromNow(-((base % 90) + 40)),
      kind: "criação",
      user: responsibilities[0]!.name,
      title: "Governança iniciada",
      note: "Ativo incluído no modelo de governança corporativa.",
    },
    {
      id: `${seed.objectId}-gov-1`,
      at: isoDaysFromNow(-((base % 60) + 25)),
      kind: "responsável",
      user: "Compliance",
      title: `Owner definido: ${responsibilities[0]!.name}`,
      note: "Responsabilidades distribuídas conforme a matriz da área.",
    },
    {
      id: `${seed.objectId}-gov-2`,
      at: isoDaysFromNow(-((base % 40) + 12)),
      kind: "criticidade",
      user: "Compliance",
      title: `Criticidade classificada como ${criticality}`,
      note: "Classificação baseada em impacto operacional e regulatório.",
    },
    {
      id: `${seed.objectId}-gov-3`,
      at: lastAt,
      kind: "revisão",
      user: responsibilities[2]!.name,
      title: "Revisão periódica registrada",
      note: `Ciclo ${periodicity.toLowerCase()} concluído sem apontamentos críticos.`,
    },
    ...(approvalStatus === "aprovada"
      ? [
          {
            id: `${seed.objectId}-gov-4`,
            at: isoDaysFromNow(-((base % 20) + 3)),
            kind: "aprovação" as GovernanceEventKind,
            user: approver,
            title: "Aprovação formal concedida",
            note: "Ativo aprovado pela autoridade competente.",
          },
        ]
      : []),
  ];

  return {
    objectId: seed.objectId,
    kind: seed.kind,
    name: seed.name,
    criticality,
    responsibilities,
    review: {
      lastAt,
      nextAt,
      periodicity,
      reviewer: responsibilities[2]!.name,
    },
    approval: {
      approver,
      status: approvalStatus,
      approvedAt: approvalStatus === "aprovada" ? isoDaysFromNow(-((base % 20) + 3)) : "",
      nextAt: isoDaysFromNow(cycle - (base % 30)),
    },
    compliance,
    risks,
    controls,
    events,
    updatedAt: events[events.length - 1]?.at ?? new Date().toISOString(),
    seeded: true,
  };
}

/* ------------------------------------------------------------------ */
/* Leitura                                                             */
/* ------------------------------------------------------------------ */

export function getGovernance(seed: GovernanceSeed): GovernanceRecord {
  ensureHydrated();
  const existing = state[seed.objectId];
  if (existing) {
    const name = seed.name || existing.name;
    return name !== existing.name ? { ...existing, name } : existing;
  }
  return buildSeedRecord(seed);
}

export function useGovernance(seed: GovernanceSeed): GovernanceRecord {
  useSyncExternalStore(subscribe, getVersion, () => 0);
  return useMemo(
    () => getGovernance(seed),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [seed.objectId, seed.kind, seed.name, seed.owner, seed.status, seed.updatedAt, version],
  );
}

export function responsibleFor(
  record: GovernanceRecord,
  role: ResponsibilityRole,
): Responsibility | undefined {
  return record.responsibilities.find((item) => item.role === role);
}

export interface GovernanceHealth {
  reviewSituation: ReturnType<typeof reviewSituationFor>;
  pendingCompliance: number;
  criticalRisks: number;
  awaitingApproval: boolean;
  /** Índice 0–100 de saúde da governança. */
  score: number;
}

export function governanceHealth(record: GovernanceRecord): GovernanceHealth {
  const reviewSituation = reviewSituationFor(record.review.nextAt);
  const pendingCompliance = record.compliance.filter(
    (item) => item.status === "pendente" || item.status === "em análise",
  ).length;
  const criticalRisks = record.risks.filter(
    (risk) => risk.criticality === "crítica" || risk.criticality === "alta",
  ).length;
  const awaitingApproval = record.approval.status === "aguardando aprovação";

  let score = 100;
  if (reviewSituation === "vencida") score -= 35;
  else if (reviewSituation === "próxima do vencimento") score -= 15;
  score -= pendingCompliance * 8;
  score -= criticalRisks * 6;
  if (record.approval.status !== "aprovada") score -= 10;

  return {
    reviewSituation,
    pendingCompliance,
    criticalRisks,
    awaitingApproval,
    score: Math.max(0, Math.min(100, score)),
  };
}

/* ------------------------------------------------------------------ */
/* Escrita (comportamento simulado nesta Build)                        */
/* ------------------------------------------------------------------ */

const CURRENT_USER = "Você";

function commit(record: GovernanceRecord, event: Omit<GovernanceEvent, "id" | "at">) {
  const at = new Date().toISOString();
  const updated: GovernanceRecord = {
    ...record,
    events: [
      ...record.events,
      { ...event, id: `${record.objectId}-gov-${Date.now()}`, at },
    ],
    updatedAt: at,
    seeded: false,
  };
  state = { ...state, [record.objectId]: updated };
  emit();
  return updated;
}

export function setCriticality(seed: GovernanceSeed, level: CriticalityLevel) {
  const record = getGovernance(seed);
  if (record.criticality === level) return record;
  return commit(
    { ...record, criticality: level },
    {
      kind: "criticidade",
      user: CURRENT_USER,
      title: `Criticidade alterada para ${level}`,
      note: "Classificação revista manualmente no Workspace.",
    },
  );
}

export function setResponsibility(
  seed: GovernanceSeed,
  role: ResponsibilityRole,
  name: string,
) {
  const record = getGovernance(seed);
  const value = name.trim();
  if (!value) return record;
  const responsibilities = record.responsibilities.map((item) =>
    item.role === role ? { ...item, name: value } : item,
  );
  return commit(
    { ...record, responsibilities },
    {
      kind: "responsável",
      user: CURRENT_USER,
      title: `${role} atualizado: ${value}`,
      note: "Responsabilidade redefinida na camada de governança.",
    },
  );
}

export function setComplianceStatus(
  seed: GovernanceSeed,
  requirementId: string,
  status: ComplianceStatus,
) {
  const record = getGovernance(seed);
  const target = record.compliance.find((item) => item.id === requirementId);
  if (!target || target.status === status) return record;
  const compliance = record.compliance.map((item) =>
    item.id === requirementId ? { ...item, status } : item,
  );
  return commit(
    { ...record, compliance },
    {
      kind: "conformidade",
      user: CURRENT_USER,
      title: `${target.name} · ${status}`,
      note: "Status de conformidade atualizado.",
    },
  );
}

export function registerReview(seed: GovernanceSeed, note?: string) {
  const record = getGovernance(seed);
  const lastAt = new Date().toISOString();
  const nextAt = isoDaysFromNow(PERIODICITY_DAYS[record.review.periodicity]);
  return commit(
    { ...record, review: { ...record.review, lastAt, nextAt } },
    {
      kind: "revisão",
      user: CURRENT_USER,
      title: "Revisão registrada",
      note: note?.trim() || "Revisão periódica concluída pelo responsável.",
    },
  );
}

export function requestReview(seed: GovernanceSeed, note?: string) {
  const record = getGovernance(seed);
  return commit(record, {
    kind: "revisão",
    user: CURRENT_USER,
    title: `Revisão solicitada a ${record.review.reviewer}`,
    note: note?.trim() || "Solicitação registrada na governança do ativo.",
  });
}

export function requestApproval(seed: GovernanceSeed, note?: string) {
  const record = getGovernance(seed);
  return commit(
    { ...record, approval: { ...record.approval, status: "aguardando aprovação" } },
    {
      kind: "aprovação",
      user: CURRENT_USER,
      title: `Aprovação solicitada a ${record.approval.approver}`,
      note: note?.trim() || "Solicitação registrada; execução ficará a cargo do Workflow.",
    },
  );
}

export function registerApproval(seed: GovernanceSeed, note?: string) {
  const record = getGovernance(seed);
  const approvedAt = new Date().toISOString();
  return commit(
    {
      ...record,
      approval: { ...record.approval, status: "aprovada", approvedAt },
    },
    {
      kind: "aprovação",
      user: CURRENT_USER,
      title: "Aprovação registrada",
      note: note?.trim() || "Aprovação formal registrada na governança.",
    },
  );
}

export function addGovernanceNote(seed: GovernanceSeed, note: string) {
  const text = note.trim();
  if (!text) return getGovernance(seed);
  return commit(getGovernance(seed), {
    kind: "observação",
    user: CURRENT_USER,
    title: "Observação registrada",
    note: text,
  });
}
