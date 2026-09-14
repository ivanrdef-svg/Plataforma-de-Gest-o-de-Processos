import { getPublishedProcessVersion } from "@/lib/process-store";
import { expect } from "bun:test";
import { isolatedTest } from "./support/isolated-test";
import { publishedWorkflow } from "./support/workflow";
import { deepFreeze, present, processFixture } from "./support/fixtures";
import {
  createWorkflowVersion,
  getWorkflowDoc,
  updateWorkflowDoc,
  updateWorkflowStep,
  publishWorkflow,
} from "@/lib/workflow-store";
import { tryStartInstanceFromWorkflow } from "@/lib/runtime-store";
import { getRuntimeHistory, getExecutedWorkflowVersion } from "@/lib/runtime-history";
import { getPopSectionTraceability } from "@/lib/pop-traceability";

isolatedTest(
  "R01 historical steps and participants survive draft edits and V2 publication",
  import.meta.url,
  () => {
    const doc = publishedWorkflow();
    const started = tryStartInstanceFromWorkflow(doc);
    if (!started.ok) throw new Error(started.reason);
    const instance = started.instance;
    const before = structuredClone(getRuntimeHistory(instance, doc));
    expect(createWorkflowVersion(doc.id).ok).toBe(true);
    updateWorkflowDoc(doc.id, {
      participants: [{ id: "new", name: "Outro", role: "Executor", area: "Nova", stepIds: [] }],
    });
    updateWorkflowStep(doc.id, doc.steps[0]!.id, {
      name: "Nome V2",
      owner: "Outro",
      processStepId: "process-step-2",
    });
    expect(publishWorkflow(doc.id).ok).toBe(true);
    const current = present(getWorkflowDoc(doc.id));
    const inputs = deepFreeze({
      instance: structuredClone(instance),
      workflow: structuredClone(current),
    });
    expect(getRuntimeHistory(inputs.instance, inputs.workflow)).toEqual(before);
    expect(getExecutedWorkflowVersion(inputs.instance, inputs.workflow)?.versionId).toBe(
      instance.workflowVersionId,
    );
    expect(before.steps[0]).toMatchObject({
      name: "Receber",
      owner: "Analista",
      processStepId: "process-step-1",
    });
    expect(before.participants[0]?.name).toBe("Analista");
  },
);

isolatedTest(
  "R01 legacy and unresolved provenance retain tasks without inventing participants or associations",
  import.meta.url,
  () => {
    const doc = publishedWorkflow();
    const started = tryStartInstanceFromWorkflow(doc);
    if (!started.ok) throw new Error(started.reason);
    const instance = started.instance;
    const withoutVersion = { ...instance };
    delete withoutVersion.workflowVersionId;
    const cases = [
      withoutVersion,
      { ...instance, workflowVersionId: "missing" },
      { ...instance, workflowVersion: 999 },
    ];
    for (const legacy of cases) {
      const result = getRuntimeHistory(legacy, doc);
      expect(result.provenance).toBe("unknown");
      expect(result.participants).toEqual([]);
      expect(result.steps[0]?.name).toBe("Receber");
      expect(result.steps[0]?.processStepId).toBeUndefined();
    }
    expect(getRuntimeHistory(instance, undefined).provenance).toBe("unknown");
    expect(getRuntimeHistory(instance, { ...doc, id: "other" }).provenance).toBe("unknown");
    expect(getRuntimeHistory(instance, { ...doc, versions: [] }).provenance).toBe("unknown");
    const duplicate = { ...doc, versions: [...doc.versions!, ...doc.versions!] };
    expect(getRuntimeHistory(instance, duplicate).provenance).toBe("unknown");
    const missingContent = structuredClone(doc);
    delete present(missingContent.versions?.[0]).content;
    expect(getRuntimeHistory(instance, missingContent).provenance).toBe("unknown");
    const mutatedTask = structuredClone(instance);
    mutatedTask.tasks[0]!.name = "Nome registrado na tarefa";
    expect(getRuntimeHistory(mutatedTask, doc).steps[0]?.name).toBe("Nome registrado na tarefa");
  },
);

isolatedTest(
  "R01 traceability keeps executed associations when current steps move or disappear",
  import.meta.url,
  () => {
    const doc = publishedWorkflow();
    const started = tryStartInstanceFromWorkflow(doc);
    if (!started.ok) throw new Error(started.reason);
    expect(createWorkflowVersion(doc.id).ok).toBe(true);
    updateWorkflowStep(doc.id, doc.steps[0]!.id, {
      name: "Remapeado",
      processStepId: "process-step-2",
    });
    const current = present(getWorkflowDoc(doc.id));
    const section = { id: "section", title: "Seção", content: "", notes: "" };
    const mapping = {
      id: "mapping",
      popId: "pop",
      popSectionId: "section",
      processId: doc.processId,
      processStepId: "process-step-1",
      status: "confirmado" as const,
      source: "manual" as const,
      createdAt: "",
      updatedAt: "",
    };
    const input = {
      section,
      mappings: [mapping],
      process: { id: processFixture().id, versionId: present(getPublishedProcessVersion(processFixture())).id, definition: present(getPublishedProcessVersion(processFixture())).definition },
      workflowDocs: [structuredClone(current)],
      instances: [started.instance],
    };
    const trace = getPopSectionTraceability(deepFreeze(input));
    expect(trace.workflowSteps.filter((s) => s.instanceCount > 0)).toEqual([
      {
        workflowId: doc.id,
        workflowName: started.instance.workflowName,
        stepId: doc.steps[0]!.id,
        stepName: "Receber",
        instanceCount: 1,
        workflowVersionId: present(started.instance.workflowVersionId),
        workflowVersion: 1,
      },
    ]);
    const removed = structuredClone(current);
    removed.steps = [];
    removed.processId = "another-current-process";
    expect(getPopSectionTraceability({ ...input, workflowDocs: [removed] }).workflowSteps).toEqual(
      trace.workflowSteps,
    );
    const moved = getPopSectionTraceability({
      ...input,
      mappings: [{ ...mapping, processStepId: "process-step-2" }],
    });
    expect(moved.workflowSteps.find((s) => s.stepId === doc.steps[0]!.id)?.instanceCount).toBe(0);
    const legacy = { ...started.instance };
    delete legacy.workflowVersionId;
    expect(getPopSectionTraceability({ ...input, instances: [legacy] }).workflowSteps).toEqual([]);
    const duplicateTask = structuredClone(started.instance);
    duplicateTask.tasks.push(duplicateTask.tasks[0]!);
    const counted = getPopSectionTraceability({
      ...input,
      instances: [duplicateTask, { ...started.instance, id: "second" }],
    });
    expect(counted.workflowSteps[0]?.instanceCount).toBe(2);
  },
);
