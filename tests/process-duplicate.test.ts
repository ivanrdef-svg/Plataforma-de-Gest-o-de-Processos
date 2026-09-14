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
    const duplicate = present(duplicateProcessDoc(source.id));
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
