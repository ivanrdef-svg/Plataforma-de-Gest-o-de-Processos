import { expect } from "bun:test";
import { isolatedTest } from "./support/isolated-test";
import { legacyProcessFixture, present } from "./support/fixtures";
import {
  normalizeProcessDoc,
  createProcessDoc,
  getProcessDoc,
  getWorkingProcessVersion,
  getPublishedProcessVersion,
  getAuthoringProcessVersion,
  getProcessVersion,
  createProcessVersion,
  publishProcessVersion,
  updateWorkingProcessDefinition,
  updateProcessDoc,
  updateProcessStep,
  moveProcessStep,
  addProcessStep,
  removeProcessStep,
  updateProcessSection,
  addProcessRule,
  updateProcessRule,
  removeProcessRule,
  addProcessParticipant,
  updateProcessParticipant,
  removeProcessParticipant,
  toggleParticipantStep,
  ensureProcessModel,
} from "@/lib/process-store";

isolatedTest(
  "normalization supplies missing legacy arrays and removes accidental flat mirrors",
  import.meta.url,
  () => {
    const legacy = legacyProcessFixture();
    delete legacy.rules;
    delete legacy.participants;
    const migrated = normalizeProcessDoc(legacy);
    expect(migrated.versions[0]?.definition.rules).toEqual([]);
    expect(migrated.versions[0]?.definition.participants).toEqual([]);
    const withMirrors = { ...migrated, name: "Obsolete", steps: [], status: "rascunho" };
    expect(normalizeProcessDoc(withMirrors)).toEqual(migrated);
    expect(withMirrors.name).toBe("Obsolete");
  },
);

for (const status of ["publicado", "arquivado", "em revisão"]) {
  isolatedTest(
    "T01 legacy normalization persists only canonical version content: " + status,
    import.meta.url,
    () => {
      const legacy = legacyProcessFixture();
      legacy.status = status;
      legacy.favorite = true;
      legacy.sections = [{ id: "section-original", title: "Seção", content: "Texto", notes: "" }];
      legacy.rules = [
        {
          id: "rule-original",
          name: "Regra",
          description: "Conferir",
          application: "",
          impact: "",
          criticality: "média",
        },
      ];
      legacy.participants = [
        {
          id: "participant-original",
          name: "Pessoa",
          role: "Executor",
          area: "Área",
          stepIds: [legacy.steps[0]!.id],
        },
      ];
      const before = structuredClone(legacy);
      const migrated = normalizeProcessDoc(legacy);
      expect(normalizeProcessDoc(migrated)).toEqual(migrated);
      expect(legacy).toEqual(before);
      expect(migrated.versions[0]?.definition).toMatchObject({
        steps: legacy.steps,
        sections: legacy.sections,
        rules: legacy.rules,
        participants: legacy.participants,
      });
      expect(migrated).toMatchObject({
        id: legacy.id,
        code: legacy.code,
        favorite: true,
        legacyLifecycleSeedStatus: status,
      });
      expect(migrated.versions[0]?.status).toBe(status === "publicado" ? "publicada" : "rascunho");
      window.localStorage.setItem(
        "process-platform:process:v1",
        JSON.stringify({ [legacy.id]: legacy }),
      );
      expect(getProcessDoc(legacy.id)).toEqual(migrated);
      const stored = JSON.parse(window.localStorage.getItem("process-platform:process:v1")!)[
        legacy.id
      ];
      for (const field of [
        "name",
        "category",
        "owner",
        "area",
        "description",
        "tags",
        "keywords",
        "steps",
        "sections",
        "rules",
        "participants",
        "status",
        "version",
        "revisedAt",
      ]) {
        expect(stored).not.toHaveProperty(field);
      }
      expect(stored.versions[0].definition.participants[0].stepIds).toEqual(
        legacy.participants[0]!.stepIds,
      );
      expect(
        status === "publicado" ? migrated.workingVersionId : migrated.publishedVersionId,
      ).toBeUndefined();
    },
  );
}

isolatedTest(
  "T02-T08 process publication, independent V2, one draft, stable IDs and historical rollback",
  import.meta.url,
  () => {
    const doc = createProcessDoc("Processo inicial");
    const v1draft = present(getWorkingProcessVersion(doc));
    expect(v1draft.number).toBe(1);
    expect(doc.publishedVersionId).toBeUndefined();
    expect(getAuthoringProcessVersion(doc)?.id).toBe(v1draft.id);
    const initial = structuredClone(v1draft.definition);
    const stepId = initial.steps[0]!.id;
    expect(publishProcessVersion(doc.id).ok).toBe(true);
    const published = present(getPublishedProcessVersion(present(getProcessDoc(doc.id))));
    expect(published.definition).toEqual(initial);
    expect(getWorkingProcessVersion(present(getProcessDoc(doc.id)))).toBeUndefined();
    const v2result = createProcessVersion(doc.id);
    if (!v2result.ok) throw new Error(v2result.reason);
    expect(v2result.version.number).toBe(2);
    expect(v2result.version.basedOnVersionId).toBe(published.id);
    expect(v2result.version.definition.steps).not.toBe(published.definition.steps);
    expect(v2result.version.definition.sections).not.toBe(published.definition.sections);
    expect(createProcessVersion(doc.id)).toEqual({ ok: false, reason: "draft-exists" });
    updateWorkingProcessDefinition(doc.id, { name: "Nome V2", tags: ["V2"] });
    updateProcessStep(doc.id, stepId, { name: "Etapa V2" });
    moveProcessStep(doc.id, stepId, 1);
    expect(getWorkingProcessVersion(present(getProcessDoc(doc.id)))?.definition.steps[1]?.id).toBe(
      stepId,
    );
    addProcessStep(doc.id);
    const v2edited = present(getWorkingProcessVersion(present(getProcessDoc(doc.id))));
    expect(v2edited.definition.steps).toHaveLength(initial.steps.length + 1);
    expect(initial.steps.map((s) => s.id)).not.toContain(v2edited.definition.steps.at(-1)!.id);
    removeProcessStep(doc.id, stepId);
    updateProcessSection(doc.id, initial.sections[0]!.id, { content: "Texto V2" });
    addProcessRule(doc.id);
    addProcessParticipant(doc.id, { name: "Participante V2", stepIds: [initial.steps[1]!.id] });
    expect(getProcessVersion(present(getProcessDoc(doc.id)), published.id)?.definition).toEqual(
      initial,
    );
    expect(publishProcessVersion(doc.id).ok).toBe(true);
    const v2published = present(getPublishedProcessVersion(present(getProcessDoc(doc.id))));
    expect(v2published.number).toBe(2);
    expect(getProcessVersion(present(getProcessDoc(doc.id)), published.id)?.status).toBe(
      "arquivada",
    );
    const restore = createProcessVersion(doc.id, published.id);
    if (!restore.ok) throw new Error(restore.reason);
    expect(restore.version).toMatchObject({
      number: 3,
      status: "rascunho",
      basedOnVersionId: published.id,
    });
    expect(restore.version.definition).toEqual(initial);
    expect(getPublishedProcessVersion(present(getProcessDoc(doc.id)))?.id).toBe(v2published.id);
    expect(getAuthoringProcessVersion(present(getProcessDoc(doc.id)))?.id).toBe(restore.version.id);
  },
);

isolatedTest(
  "T10 every definition mutator refuses a published-only process",
  import.meta.url,
  () => {
    const doc = createProcessDoc();
    addProcessParticipant(doc.id, {
      name: "Pessoa",
      stepIds: [doc.versions[0]!.definition.steps[0]!.id],
    });
    expect(publishProcessVersion(doc.id).ok).toBe(true);
    const before = structuredClone(present(getProcessDoc(doc.id)));
    const def = before.versions[0]!.definition;
    const step = def.steps[0]!.id,
      section = def.sections[0]!.id,
      rule = def.rules[0]!.id,
      participant = def.participants[0]!.id;
    const attempts = [
      () => updateWorkingProcessDefinition(doc.id, { name: "Proibido" }),
      () => updateProcessStep(doc.id, step, { name: "Proibido" }),
      () => addProcessStep(doc.id),
      () => removeProcessStep(doc.id, step),
      () => moveProcessStep(doc.id, step, 1),
      () => updateProcessSection(doc.id, section, { content: "Proibido" }),
      () => addProcessRule(doc.id),
      () => updateProcessRule(doc.id, rule, { name: "Proibido" }),
      () => removeProcessRule(doc.id, rule),
      () => addProcessParticipant(doc.id),
      () => updateProcessParticipant(doc.id, participant, { name: "Proibido" }),
      () => removeProcessParticipant(doc.id, participant),
      () => toggleParticipantStep(doc.id, participant, step),
      () => ensureProcessModel(doc.id),
    ];
    for (const attempt of attempts) expect(attempt()).toBeUndefined();
    expect(getProcessDoc(doc.id)).toEqual(before);
    expect(() => {
      present(
        getPublishedProcessVersion(present(getProcessDoc(doc.id))),
      ).definition.steps[0]!.name = "Mutation";
    }).toThrow();
    expect(getProcessDoc(doc.id)).toEqual(before);
    expect(updateProcessDoc(doc.id, { favorite: true })?.favorite).toBe(true);
    expect(getPublishedProcessVersion(present(getProcessDoc(doc.id)))?.definition).toEqual(def);
  },
);

isolatedTest(
  "version creation rejects absent and foreign bases without side effects",
  import.meta.url,
  () => {
    expect(createProcessVersion("missing")).toEqual({ ok: false, reason: "process-not-found" });
    const first = createProcessDoc("Primeiro");
    const second = createProcessDoc("Segundo");
    expect(publishProcessVersion(first.id).ok).toBe(true);
    expect(createProcessVersion(first.id, second.versions[0]!.id)).toEqual({
      ok: false,
      reason: "version-not-owned-by-process",
    });
    expect(createProcessVersion(first.id, "missing")).toEqual({
      ok: false,
      reason: "version-not-found",
    });
    expect(publishProcessVersion(first.id)).toEqual({ ok: false, reason: "no-draft" });
  },
);

// Compile-time guard: definition/publication fields never belong to the container write API.
if (false) {
  // @ts-expect-error name belongs to a definition
  updateProcessDoc("id", { name: "invalid" });
  // @ts-expect-error steps belong to a definition
  updateProcessDoc("id", { steps: [] });
  // @ts-expect-error publication belongs to a version
  updateProcessDoc("id", { status: "publicado" });
}
