import { isolatedTest } from "./support/isolated-test";
import { expect, setSystemTime } from "bun:test";
import {
  activateTemplate,
  createTemplateFromWorkflow,
  createWorkflowFromTemplate,
} from "@/lib/template-store";
import { getWorkflowDoc, publishedWorkflowVersion, updateWorkflowStep } from "@/lib/workflow-store";
import { publishedWorkflow } from "./support/workflow";
import { present } from "./support/fixtures";

isolatedTest(
  "reusing an active Template creates independent mutable workflow content",
  import.meta.url,
  () => {
    const source = publishedWorkflow();
    const created = createTemplateFromWorkflow(source);
    if (!created.ok) throw new Error(created.reason);
    expect(activateTemplate(created.template.id).ok).toBe(true);
    const templateBefore = structuredClone(created.template.content);
    const sourceBefore = structuredClone(publishedWorkflowVersion(source));
    // The existing workflow ID generator uses milliseconds; this is a second creation.
    setSystemTime(new Date("2026-01-15T12:01:00.000Z"));
    const reused = createWorkflowFromTemplate(created.template.id, {
      name: "Workflow reutilizado",
    });
    if (!reused.ok) throw new Error(reused.reason);
    expect(reused.doc.id).not.toBe(source.id);
    expect(reused.doc.templateOrigin?.templateId).toBe(created.template.id);
    expect(reused.doc.steps).toEqual(templateBefore.steps);
    expect(reused.doc.steps[2]?.decisionOptions).not.toBe(
      created.template.content.steps[2]?.decisionOptions,
    );
    expect(reused.doc.participants[0]?.stepIds).not.toBe(
      created.template.content.participants[0]?.stepIds,
    );
    updateWorkflowStep(reused.doc.id, reused.doc.steps[0]!.id, { name: "Etapa personalizada" });
    reused.doc.steps[2]!.decisionOptions![0]!.label = "Opção personalizada";
    reused.doc.participants[0]!.stepIds.push("new-only");
    expect(present(getWorkflowDoc(reused.doc.id)).steps[0]?.name).toBe("Etapa personalizada");
    expect(created.template.content).toEqual(templateBefore);
    expect(publishedWorkflowVersion(present(getWorkflowDoc(source.id)))).toEqual(sourceBefore);
  },
);
