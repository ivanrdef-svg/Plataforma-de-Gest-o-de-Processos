import { isolatedTest } from "./support/isolated-test";
import { expect } from "bun:test";
import { createTemplateFromWorkflow, updateTemplate } from "@/lib/template-store";
import {
  createWorkflowVersion,
  getWorkflowDoc,
  publishedWorkflowVersion,
  updateWorkflowStep,
} from "@/lib/workflow-store";
import { publishedWorkflow } from "./support/workflow";
import { present } from "./support/fixtures";

isolatedTest(
  "Template copies the published version independently even when a newer draft exists",
  import.meta.url,
  () => {
    const doc = publishedWorkflow();
    const published = present(publishedWorkflowVersion(doc));
    const before = structuredClone(present(published.content));
    expect(createWorkflowVersion(doc.id).ok).toBe(true);
    updateWorkflowStep(doc.id, doc.steps[0]!.id, { name: "Somente no rascunho" });
    const result = createTemplateFromWorkflow(present(getWorkflowDoc(doc.id)));
    if (!result.ok) throw new Error(result.reason);
    const template = result.template;
    expect(template.sourceWorkflowVersion).toBe(1);
    expect(template.content).toEqual(before);
    expect(template.content).not.toBe(published.content);
    expect(template.content.steps[2]?.decisionOptions).not.toBe(
      published.content?.steps[2]?.decisionOptions,
    );
    expect(template.content.participants[0]?.stepIds).not.toBe(
      published.content?.participants[0]?.stepIds,
    );
    const edited = structuredClone(template.content);
    edited.steps[0]!.name = "Somente no Template";
    expect(updateTemplate(template.id, { content: edited })?.content.steps[0]?.name).toBe(
      "Somente no Template",
    );
    expect(published.content).toEqual(before);
  },
);
