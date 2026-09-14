import type {
  ProcessCategory,
  ProcessSection,
  ProcessStep,
  ProcessRule,
  ProcessParticipant,
} from "./process-store";

export interface ProcessDefinition {
  name: string;
  category: ProcessCategory;
  owner: string;
  area: string;
  description: string;
  tags: string[];
  keywords: string[];
  sections: ProcessSection[];
  steps: ProcessStep[];
  rules: ProcessRule[];
  participants: ProcessParticipant[];
}
export type ProcessVersionStatus = "rascunho" | "publicada" | "arquivada";
export interface ProcessVersion {
  id: string;
  number: number;
  status: ProcessVersionStatus;
  basedOnVersionId?: string;
  definition: ProcessDefinition;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  archivedAt?: string;
}
export interface ProcessDoc {
  id: string;
  code: string;
  favorite: boolean;
  createdAt: string;
  savedAt: string;
  workingVersionId?: string;
  publishedVersionId?: string;
  /** Migration seed only. Never an authority for publication or future Lifecycle writes. */
  legacyLifecycleSeedStatus?: string;
  versions: ProcessVersion[];
}
export interface LegacyProcessDoc extends Omit<ProcessDefinition, "rules" | "participants"> {
  id: string;
  code: string;
  favorite: boolean;
  createdAt: string;
  savedAt: string;
  revisedAt?: string;
  status: string;
  version: string;
  rules?: ProcessRule[];
  participants?: ProcessParticipant[];
}
export function getProcessVersion(doc: ProcessDoc, versionId: string): ProcessVersion | undefined {
  return doc.versions.find((version) => version.id === versionId);
}
export function getWorkingProcessVersion(doc: ProcessDoc): ProcessVersion | undefined {
  const version = doc.workingVersionId ? getProcessVersion(doc, doc.workingVersionId) : undefined;
  return version?.status === "rascunho" ? version : undefined;
}
export function getPublishedProcessVersion(doc: ProcessDoc): ProcessVersion | undefined {
  const version = doc.publishedVersionId
    ? getProcessVersion(doc, doc.publishedVersionId)
    : undefined;
  return version?.status === "publicada" ? version : undefined;
}
export function getAuthoringProcessVersion(doc: ProcessDoc): ProcessVersion | undefined {
  return getWorkingProcessVersion(doc) ?? getPublishedProcessVersion(doc);
}

/** Deterministic migration; explicit whitelist removes every legacy flat mirror. */
export function normalizeProcessDoc(input: ProcessDoc | LegacyProcessDoc): ProcessDoc {
  if ("versions" in input) {
    return {
      id: input.id,
      code: input.code,
      favorite: input.favorite,
      createdAt: input.createdAt,
      savedAt: input.savedAt,
      ...(input.workingVersionId ? { workingVersionId: input.workingVersionId } : {}),
      ...(input.publishedVersionId ? { publishedVersionId: input.publishedVersionId } : {}),
      ...(input.legacyLifecycleSeedStatus !== undefined
        ? { legacyLifecycleSeedStatus: input.legacyLifecycleSeedStatus }
        : {}),
      versions: structuredClone(input.versions),
    };
  }
  const versionId = input.id + "-pv1";
  const at = input.savedAt || input.createdAt;
  const published = input.status === "publicado";
  return {
    id: input.id,
    code: input.code,
    favorite: input.favorite,
    createdAt: input.createdAt,
    savedAt: input.savedAt,
    legacyLifecycleSeedStatus: input.status,
    ...(published ? { publishedVersionId: versionId } : { workingVersionId: versionId }),
    versions: [
      {
        id: versionId,
        number: 1,
        status: published ? "publicada" : "rascunho",
        createdAt: at,
        updatedAt: at,
        ...(published ? { publishedAt: at } : {}),
        definition: structuredClone({
          name: input.name,
          category: input.category,
          owner: input.owner,
          area: input.area,
          description: input.description,
          tags: input.tags,
          keywords: input.keywords,
          sections: input.sections,
          steps: input.steps,
          rules: input.rules ?? [],
          participants: input.participants ?? [],
        }),
      },
    ],
  };
}
