import { isolatedTest } from "./support/isolated-test";
import { expect } from "bun:test";
import { getWorkflowDoc, publishWorkflow, publishedWorkflowVersion } from "@/lib/workflow-store";
import { configuredWorkflow } from "./support/workflow";
import { present } from "./support/fixtures";

isolatedTest(
  "publication stores an independent deep snapshot, including nested rules and participants",
  import.meta.url,
  () => {
    const draft = configuredWorkflow();
    const originalSteps = structuredClone(draft.steps);
    expect(publishWorkflow(draft.id)).toEqual({ ok: true, version: 1 });
    const published = present(publishedWorkflowVersion(present(getWorkflowDoc(draft.id))));
    const content = present(published.content);
    expect(published.status).toBe("publicada");
    expect(content.steps).toEqual(originalSteps);
    expect(content.steps).not.toBe(draft.steps);
    expect(content.steps[2]?.decisionOptions).not.toBe(draft.steps[2]?.decisionOptions);
    expect(content.steps[2]?.decisionOptions?.[0]).not.toBe(draft.steps[2]?.decisionOptions?.[0]);
    expect(content.steps[1]?.outcomeTransitions).not.toBe(draft.steps[1]?.outcomeTransitions);
    expect(content.participants[0]?.stepIds).not.toBe(draft.participants[0]?.stepIds);
    present(draft.steps[2]?.decisionOptions)[0]!.label = "Changed retained draft";
    present(draft.participants[0]).stepIds.push("not-in-snapshot");
    expect(content.steps).toEqual(originalSteps);
    expect(content.participants[0]?.stepIds).not.toContain("not-in-snapshot");
  },
);
