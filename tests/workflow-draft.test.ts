import { isolatedTest } from "./support/isolated-test";
import { expect } from "bun:test";
import {
  createWorkflowVersion,
  getWorkflowDoc,
  publishedWorkflowVersion,
  updateWorkflowStep,
  workflowVersions,
} from "@/lib/workflow-store";
import { publishedWorkflow } from "./support/workflow";
import { present } from "./support/fixtures";

isolatedTest(
  "editing a new draft preserves the published version and its nested content",
  import.meta.url,
  () => {
    const doc = publishedWorkflow();
    const version = present(publishedWorkflowVersion(doc));
    const before = structuredClone(version);
    expect(createWorkflowVersion(doc.id).ok).toBe(true);
    const draft = present(getWorkflowDoc(doc.id));
    const step = present(draft.steps[2]);
    updateWorkflowStep(doc.id, step.id, {
      name: "Concluir na V2",
      decisionQuestion: "Novo critério?",
    });
    present(step.decisionOptions)[0]!.label = "Rascunho";
    present(draft.participants[0]).stepIds.push("draft-only");
    const updated = present(getWorkflowDoc(doc.id));
    expect(updated.steps[2]?.name).toBe("Concluir na V2");
    expect(updated.currentVersionNumber).toBe(2);
    expect(workflowVersions(updated).map((item) => item.status)).toEqual(["publicada", "rascunho"]);
    expect(publishedWorkflowVersion(updated)).toEqual(before);
  },
);
