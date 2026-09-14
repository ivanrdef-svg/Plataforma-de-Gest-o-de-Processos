import { expect, setSystemTime } from "bun:test";
import { isolatedTest } from "./support/isolated-test";
import { present, processFixture } from "./support/fixtures";
import { getPublishedProcessVersion, type ProcessVersion } from "@/lib/process-store";
import {
  createWorkflowFromProcess,
  createWorkflowVersion,
  getWorkflowDoc,
  publishWorkflow,
  publishedWorkflowVersion,
  syncWorkflowWithProcess,
  createWorkflowFromTemplateContent,
  updateWorkflowDoc,
} from "@/lib/workflow-store";
import {
  activateTemplate,
  createTemplateFromWorkflow,
  createWorkflowFromTemplate,
} from "@/lib/template-store";

isolatedTest(
  "Workflow creation requires published ProcessVersion and ignores a newer draft",
  import.meta.url,
  () => {
    const process = processFixture();
    const original = present(getPublishedProcessVersion(process));
    const draft: ProcessVersion = {
      ...structuredClone(original),
      id: "pv2",
      number: 2,
      status: "rascunho",
    };
    draft.definition.name = "Draft must not become official";
    draft.definition.steps = [];
    process.versions.push(draft);
    process.workingVersionId = draft.id;
    const created = createWorkflowFromProcess(process);
    if (!created.ok) throw new Error(created.reason);
    expect(created.doc.workingSourceProcessVersionId).toBe(original.id);
    expect(created.doc.processName).toBe(original.definition.name);
    expect(created.doc.steps).toHaveLength(3);
    const unpublished = { ...process, versions: [draft] };
    delete unpublished.publishedVersionId;
    expect(createWorkflowFromProcess(unpublished)).toEqual({
      ok: false,
      reason: "no-published-process-version",
    });
  },
);

isolatedTest(
  "unknown legacy provenance stays absent across publication, draft and Template",
  import.meta.url,
  () => {
    const created = createWorkflowFromProcess(processFixture());
    if (!created.ok) throw new Error(created.reason);
    expect(publishWorkflow(created.doc.id).ok).toBe(true);
    const content = present(
      publishedWorkflowVersion(present(getWorkflowDoc(created.doc.id)))?.content,
    );
    setSystemTime(new Date("2026-01-15T12:02:00.000Z"));
    const legacy = createWorkflowFromTemplateContent(content, {
      owner: "Analista",
      area: "Contabilidade",
    });
    expect(legacy).not.toHaveProperty("workingSourceProcessVersionId");
    expect(publishWorkflow(legacy.id).ok).toBe(true);
    expect(publishedWorkflowVersion(present(getWorkflowDoc(legacy.id)))).not.toHaveProperty(
      "sourceProcessVersionId",
    );
    // A newer draft's provenance must not contaminate its published base or Template.
    expect(createWorkflowVersion(legacy.id).ok).toBe(true);
    updateWorkflowDoc(legacy.id, { workingSourceProcessVersionId: "explicit-draft-source" });
    const doc = present(getWorkflowDoc(legacy.id));
    const base = present(doc.versions?.find((v) => v.number === 1));
    const template = createTemplateFromWorkflow(doc);
    if (!template.ok) throw new Error(template.reason);
    expect(template.template).not.toHaveProperty("sourceProcessVersionId");
    expect(base).not.toHaveProperty("sourceProcessVersionId");
  },
);

isolatedTest(
  "Workflow publication freezes explicit Process provenance through PV2 and WV2",
  import.meta.url,
  () => {
    const process = processFixture();
    const pv1 = present(getPublishedProcessVersion(process));
    const created = createWorkflowFromProcess(process);
    if (!created.ok) throw new Error(created.reason);
    const id = created.doc.id;
    expect(publishWorkflow(id).ok).toBe(true);
    const wv1 = structuredClone(present(publishedWorkflowVersion(present(getWorkflowDoc(id)))));
    expect(wv1.sourceProcessVersionId).toBe(pv1.id);
    const pv2: ProcessVersion = {
      ...structuredClone(pv1),
      id: "pv2",
      number: 2,
      status: "publicada",
    };
    pv2.definition.steps[0]!.name = "Nome PV2";
    process.versions.push(pv2);
    process.publishedVersionId = pv2.id;
    expect(createWorkflowVersion(id).ok).toBe(true);
    expect(present(getWorkflowDoc(id)).workingSourceProcessVersionId).toBe(pv1.id);
    const synced = present(syncWorkflowWithProcess(id, process.id, pv2));
    expect(synced.workingSourceProcessVersionId).toBe(pv2.id);
    expect(synced.steps[0]?.id).toBe(wv1.content?.steps[0]?.id);
    expect(publishedWorkflowVersion(synced)).toEqual(wv1);
    expect(publishWorkflow(id).ok).toBe(true);
    const final = present(getWorkflowDoc(id));
    expect(final.versions?.find((v) => v.number === 1)).toEqual(wv1);
    expect(publishedWorkflowVersion(final)?.sourceProcessVersionId).toBe(pv2.id);
    expect(publishedWorkflowVersion(final)?.content?.steps[0]?.name).toBe("Nome PV2");
  },
);

isolatedTest(
  "Template captures published Workflow provenance and reused Workflow inherits it",
  import.meta.url,
  () => {
    const process = processFixture();
    const pv1 = present(getPublishedProcessVersion(process));
    const created = createWorkflowFromProcess(process);
    if (!created.ok) throw new Error(created.reason);
    expect(publishWorkflow(created.doc.id).ok).toBe(true);
    expect(createWorkflowVersion(created.doc.id).ok).toBe(true);
    const pv2: ProcessVersion = {
      ...structuredClone(pv1),
      id: "pv2",
      number: 2,
      status: "publicada",
    };
    syncWorkflowWithProcess(created.doc.id, process.id, pv2);
    const template = createTemplateFromWorkflow(present(getWorkflowDoc(created.doc.id)));
    if (!template.ok) throw new Error(template.reason);
    expect(template.template.sourceProcessVersionId).toBe(pv1.id);
    expect(activateTemplate(template.template.id).ok).toBe(true);
    const before = structuredClone(template.template.content);
    setSystemTime(new Date("2026-01-15T12:01:00.000Z"));
    const reused = createWorkflowFromTemplate(template.template.id, {
      owner: "Analista",
      area: "Contabilidade",
    });
    if (!reused.ok) throw new Error(reused.reason);
    expect(reused.doc.workingSourceProcessVersionId).toBe(pv1.id);
    expect(reused.doc.templateOrigin?.sourceProcessVersionId).toBe(pv1.id);
    expect(publishWorkflow(reused.doc.id).ok).toBe(true);
    expect(
      publishedWorkflowVersion(present(getWorkflowDoc(reused.doc.id)))?.sourceProcessVersionId,
    ).toBe(pv1.id);
    expect(template.template.content).toEqual(before);
    expect(reused.doc.steps).not.toBe(template.template.content.steps);
  },
);
