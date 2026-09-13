import { expect } from "bun:test";
import { isolatedTest } from "./support/isolated-test";
import { processFixture, present } from "./support/fixtures";
import {
  createWorkflowFromProcess,
  getWorkflowDoc,
  publishWorkflow,
  syncWorkflowWithProcess,
  updateWorkflowStep,
} from "@/lib/workflow-store";
import { validateWorkflow } from "@/lib/workflow-validation";
import { END_OF_WORKFLOW } from "@/config/execution-rules";

for (const field of ["correctionStepId", "conditionTargetStepId"] as const) {
  isolatedTest(
    "stale sync target blocks publication and validation: " + field,
    import.meta.url,
    () => {
      const process = processFixture();
      const doc = createWorkflowFromProcess(process);
      const source = doc.steps[0]!;
      const target = doc.steps[1]!;
      updateWorkflowStep(doc.id, source.id, {
        [field]: target.id,
        ...(field === "conditionTargetStepId" ? { condition: "Se aprovado" } : {}),
      });
      expect(validateWorkflow(present(getWorkflowDoc(doc.id))).canPublish).toBe(true);
      process.steps = process.steps.filter((s) => s.id !== target.processStepId);
      const synced = present(syncWorkflowWithProcess(doc.id, process));
      const before = structuredClone(synced);
      expect(synced.steps.some((s) => s.id === target.id)).toBe(false);
      expect(synced.steps.find((s) => s.id === source.id)?.[field]).toBe(target.id);
      const result = validateWorkflow(synced);
      expect(result.canPublish).toBe(false);
      expect(result.canStart).toBe(false);
      expect(
        result.errors.some(
          (e) => e.description.includes("etapa inexistente") && e.description.includes(target.id),
        ),
      ).toBe(true);
      expect(synced).toEqual(before);
      expect(publishWorkflow(doc.id)).toMatchObject({ ok: false, reason: "invalid" });
      expect(present(getWorkflowDoc(doc.id)).steps.find((s) => s.id === source.id)?.[field]).toBe(
        target.id,
      );
    },
  );
}

isolatedTest(
  "retained decision options are validated even after changing step kind",
  import.meta.url,
  () => {
    const process = processFixture();
    const doc = createWorkflowFromProcess(process);
    const target = doc.steps[1]!;
    updateWorkflowStep(doc.id, doc.steps[0]!.id, {
      kind: "tarefa",
      decisionOptions: [
        { id: "retained", label: "Opção preservada", nextStepId: target.id, note: "" },
      ],
    });
    process.steps = process.steps.filter((s) => s.id !== target.processStepId);
    const synced = present(syncWorkflowWithProcess(doc.id, process));
    const validation = validateWorkflow(synced);
    expect(validation.canPublish).toBe(false);
    expect(validation.errors.some((e) => e.id === "retained-destino-inexistente")).toBe(true);
    expect(synced.steps[0]?.decisionOptions?.[0]?.nextStepId).toBe(target.id);
  },
);

isolatedTest(
  "existing and empty correction/condition targets remain valid without changing end transitions",
  import.meta.url,
  () => {
    const doc = createWorkflowFromProcess(processFixture());
    const source = doc.steps[0]!;
    const target = doc.steps[1]!.id;
    updateWorkflowStep(doc.id, source.id, {
      correctionStepId: target,
      conditionTargetStepId: target,
      condition: "Se completo",
      outcomeTransitions: { concluído: END_OF_WORKFLOW },
    });
    expect(validateWorkflow(present(getWorkflowDoc(doc.id))).canStart).toBe(true);
    updateWorkflowStep(doc.id, source.id, {
      correctionStepId: "",
      conditionTargetStepId: "",
      condition: "",
    });
    expect(validateWorkflow(present(getWorkflowDoc(doc.id))).canStart).toBe(true);
  },
);
