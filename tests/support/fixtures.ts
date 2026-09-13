import type { ProcessDoc } from "@/lib/process-store";
import type { PopDraftProposal } from "@/config/pop-draft-proposal-model";

export function processFixture(): ProcessDoc {
  return {
    id: "process-fixture",
    code: "PROC-TEST",
    name: "Conferência documental",
    category: "Operações",
    status: "rascunho",
    version: "1.0",
    owner: "Analista",
    area: "Contabilidade",
    createdAt: "15/01/2026",
    revisedAt: "15/01/2026",
    savedAt: "2026-01-15T12:00:00.000Z",
    description: "Receber, conferir e concluir um documento.",
    tags: [],
    keywords: [],
    favorite: false,
    sections: [],
    steps: ["Receber", "Conferir", "Concluir"].map((name, index) => ({
      id: "process-step-" + (index + 1),
      name,
      description: "Executar " + name.toLowerCase(),
      owner: "Analista",
      inputs: "Documento",
      outputs: "Registro",
      duration: "1 hora",
      notes: "",
      type: "atividade",
    })),
    rules: [],
    participants: [],
  };
}

export function proposalFixture(): PopDraftProposal {
  return {
    id: "proposal-fixture",
    sourceDocumentId: "source-fixture",
    status: "proposto",
    createdAt: "2026-01-15T12:00:00.000Z",
    proposedSections: [
      {
        id: "section-fixture",
        title: "Procedimento proposto",
        content: "Texto original da proposta.",
        origin: "documento",
        confidence: "média",
        provenance: { sourceDocumentId: "source-fixture", sourceElementIds: ["element-001"] },
      },
    ],
    findings: [
      {
        id: "finding-fixture",
        type: "ambiguidade",
        description: "Revisar o prazo.",
        relatedSectionId: "section-fixture",
        sourceElementIds: ["element-001"],
      },
    ],
    aiMeta: { provider: "fixture", model: "fixture-only", processedAt: "2026-01-15T12:00:00.000Z" },
  };
}

export function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

export function present<T>(value: T | null | undefined): T {
  if (value === undefined || value === null) throw new Error("Fixture/result unexpectedly absent.");
  return value;
}
