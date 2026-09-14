import { expect } from "bun:test";
import { isolatedTest } from "./support/isolated-test";
import { present } from "./support/fixtures";
import {
  createProcessDoc,
  addProcessParticipant,
  getProcessDoc,
  getWorkingProcessVersion,
  publishProcessVersion,
  duplicateProcessDoc,
  createProcessVersion,
  updateWorkingProcessDefinition,
  updateProcessStep,
  getProcessDocs,
} from "@/lib/process-store";
isolatedTest(
  "T09 duplicate remaps every definition identity and participant step reference",
  import.meta.url,
  () => {
    const source = createProcessDoc("Original");
    const definition = source.versions[0]!.definition;
    addProcessParticipant(source.id, {
      name: "Pessoa",
      stepIds: definition.steps.slice(0, 2).map((s) => s.id),
    });
    expect(publishProcessVersion(source.id).ok).toBe(true);
    const before = structuredClone(present(getProcessDoc(source.id)));
    const duplicate = present(duplicateProcessDoc(source.id, before.versions[0]!.id));
    const copied = present(getWorkingProcessVersion(duplicate));
    expect(duplicate.id).not.toBe(source.id);
    expect(duplicate.code).not.toBe(source.code);
    expect(duplicate.versions).toHaveLength(1);
    expect(copied.number).toBe(1);
    expect(duplicate.publishedVersionId).toBeUndefined();
    const old = before.versions[0]!.definition;
    for (const field of ["steps", "sections", "rules", "participants"] as const) {
      expect(copied.definition[field]).toHaveLength(old[field].length);
      for (const entry of copied.definition[field])
        expect(old[field].map((item) => item.id)).not.toContain(entry.id);
    }
    expect(copied.definition.participants[0]?.stepIds).toEqual(
      copied.definition.steps.slice(0, 2).map((s) => s.id),
    );
    expect(getProcessDoc(source.id)).toEqual(before);
    expect(copied.definition.sections).not.toBe(before.versions[0]!.definition.sections);
  },
);

isolatedTest(
  "duplication uses the explicitly selected version instead of a newer draft",
  import.meta.url,
  () => {
    const source = createProcessDoc("Fonte V1");
    const v1 = present(getWorkingProcessVersion(source));
    addProcessParticipant(source.id, { name: "Pessoa V1", stepIds: [v1.definition.steps[0]!.id] });
    expect(publishProcessVersion(source.id).ok).toBe(true);
    const result = createProcessVersion(source.id);
    if (!result.ok) throw new Error(result.reason);
    updateWorkingProcessDefinition(source.id, {
      name: "Exclusivo V2",
      description: "Conteúdo exclusivo V2",
    });
    updateProcessStep(source.id, v1.definition.steps[0]!.id, { name: "Etapa exclusiva V2" });
    const before = structuredClone(present(getProcessDoc(source.id)));
    for (const versionId of [v1.id, result.version.id]) {
      const selected = present(before.versions.find((v) => v.id === versionId));
      const duplicate = present(duplicateProcessDoc(source.id, versionId));
      const copied = present(getWorkingProcessVersion(duplicate));
      expect(copied.number).toBe(1);
      expect(duplicate.versions).toHaveLength(1);
      expect(duplicate.id).not.toBe(source.id);
      expect(duplicate.code).not.toBe(source.code);
      expect(copied.definition.name).toBe(selected.definition.name + " (cópia)");
      expect(copied.definition.description).toBe(selected.definition.description);
      expect(copied.definition.steps.map((s) => s.name)).toEqual(
        selected.definition.steps.map((s) => s.name),
      );
      expect(copied.definition.participants[0]?.stepIds).toEqual([copied.definition.steps[0]!.id]);
      expect(copied.definition.steps[0]!.id).not.toBe(selected.definition.steps[0]!.id);
    }
    expect(getProcessDoc(source.id)).toEqual(before);
  },
);

isolatedTest(
  "duplication rejects missing or foreign version IDs without fallback or writes",
  import.meta.url,
  () => {
    const source = createProcessDoc();
    const foreign = createProcessDoc();
    const before = structuredClone(getProcessDocs());
    const persisted = window.localStorage.getItem("process-platform:process:v1");
    expect(duplicateProcessDoc(source.id, "missing")).toBeUndefined();
    expect(duplicateProcessDoc(source.id, foreign.versions[0]!.id)).toBeUndefined();
    expect(duplicateProcessDoc("missing-process", source.versions[0]!.id)).toBeUndefined();
    expect(getProcessDocs()).toEqual(before);
    expect(window.localStorage.getItem("process-platform:process:v1")).toBe(persisted);
  },
);
