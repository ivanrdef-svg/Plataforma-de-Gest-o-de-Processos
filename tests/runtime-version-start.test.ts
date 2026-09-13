import { expect } from "bun:test";
import { isolatedTest } from "./support/isolated-test";
import { configuredWorkflow, publishedWorkflow } from "./support/workflow";
import { present } from "./support/fixtures";
import {
  createWorkflowVersion,
  getWorkflowDoc,
  publishedWorkflowVersion,
  updateWorkflowDoc,
  updateWorkflowStep,
} from "@/lib/workflow-store";
import { tryStartInstanceFromWorkflow, startInstanceFromWorkflow } from "@/lib/runtime-store";
import { validateWorkflow } from "@/lib/workflow-validation";

isolatedTest(
  "R09 validates and executes V1 despite an invalid divergent draft",
  import.meta.url,
  () => {
    const original = publishedWorkflow();
    const version = structuredClone(present(publishedWorkflowVersion(original)));
    expect(createWorkflowVersion(original.id).ok).toBe(true);
    updateWorkflowDoc(original.id, { owner: "", slaAmount: -5, participants: [] });
    updateWorkflowStep(original.id, original.steps[0]!.id, {
      name: "",
      processStepId: "",
      slaAmount: -1,
    });
    const draft = present(getWorkflowDoc(original.id));
    expect(validateWorkflow(draft).canStart).toBe(false);
    const before = structuredClone(draft);
    const result = tryStartInstanceFromWorkflow(draft);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.reason);
    expect(result.validation.canStart).toBe(true);
    expect(result.instance.workflowVersionId).toBe(version.versionId);
    expect(result.instance.workflowVersion).toBe(1);
    expect(result.instance.version).toBe("V1");
    expect(result.instance.tasks[0]).toMatchObject({
      name: "Receber",
      slaAmount: 2,
      expectedAction: "Registrar protocolo",
    });
    expect(result.instance.slaAmount).toBe(2);
    expect(getWorkflowDoc(original.id)).toEqual(before);
  },
);

isolatedTest(
  "R09 rejects invalid published content even when the draft is valid",
  import.meta.url,
  () => {
    const doc = structuredClone(publishedWorkflow());
    const published = present(doc.versions?.find((v) => v.status === "publicada"));
    present(published.content).steps = [];
    expect(validateWorkflow(doc).canStart).toBe(true);
    const before = window.localStorage.getItem("process-platform:runtime:v1");
    const result = tryStartInstanceFromWorkflow(doc);
    expect(result.ok).toBe(false);
    if (result.ok || result.reason !== "validation")
      throw new Error("Expected published validation failure");
    expect(
      result.validation.errors.some((e) => e.title === "Workflow sem etapas executáveis"),
    ).toBe(true);
    expect(window.localStorage.getItem("process-platform:runtime:v1")).toBe(before);
  },
);

isolatedTest(
  "R09 never starts a missing published snapshot through either public entry",
  import.meta.url,
  () => {
    const doc = structuredClone(publishedWorkflow());
    delete present(doc.versions?.find((v) => v.status === "publicada")).content;
    const before = window.localStorage.getItem("process-platform:runtime:v1");
    expect(tryStartInstanceFromWorkflow(doc)).toEqual({
      ok: false,
      reason: "no-published-version",
    });
    expect(() => startInstanceFromWorkflow(doc)).toThrow();
    expect(window.localStorage.getItem("process-platform:runtime:v1")).toBe(before);
  },
);

isolatedTest("R09 preserves archive and no-publication guards", import.meta.url, () => {
  const draft = configuredWorkflow();
  expect(tryStartInstanceFromWorkflow(draft)).toEqual({
    ok: false,
    reason: "no-published-version",
  });
  expect(() => startInstanceFromWorkflow(draft)).toThrow();
  const archived = { ...draft, status: "arquivado" as const };
  expect(tryStartInstanceFromWorkflow(archived)).toEqual({ ok: false, reason: "arquivado" });
  expect(() => startInstanceFromWorkflow(archived)).toThrow();
  expect(window.localStorage.getItem("process-platform:runtime:v1")).toBeNull();
});

isolatedTest(
  "R09 reads one published source and does not inherit absent SLA from draft",
  import.meta.url,
  () => {
    const doc = structuredClone(publishedWorkflow());
    const version = present(doc.versions?.find((v) => v.status === "publicada"));
    const source = present(version.content);
    delete source.slaAmount;
    delete source.slaUnit;
    delete source.taskSlaAmount;
    delete source.taskSlaUnit;
    let reads = 0;
    Object.defineProperty(version, "content", {
      get() {
        reads += 1;
        return source;
      },
    });
    const result = tryStartInstanceFromWorkflow(doc);
    if (!result.ok) throw new Error(result.reason);
    expect(reads).toBe(1);
    expect(result.instance.slaAmount).toBeUndefined();
    expect(result.instance.tasks[1]?.slaAmount).toBeUndefined();
    expect(result.instance.tasks[0]?.slaAmount).toBe(2);
  },
);
