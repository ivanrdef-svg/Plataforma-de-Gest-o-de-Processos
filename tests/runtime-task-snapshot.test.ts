import { isolatedTest } from "./support/isolated-test";
import { expect } from "bun:test";
import { END_OF_WORKFLOW } from "@/config/execution-rules";
import { getWorkflowInstance, tryStartInstanceFromWorkflow } from "@/lib/runtime-store";
import {
  createWorkflowVersion,
  getWorkflowDoc,
  publishedWorkflowVersion,
  updateWorkflowStep,
} from "@/lib/workflow-store";
import { publishedWorkflow } from "./support/workflow";
import { present } from "./support/fixtures";

isolatedTest(
  "Runtime materializes rules, destinations and SLA that later draft edits cannot change",
  import.meta.url,
  () => {
    const doc = publishedWorkflow();
    // Start while current content and published version agree; R09 is outside this characterization.
    const started = tryStartInstanceFromWorkflow(doc);
    expect(started.ok).toBe(true);
    if (!started.ok) throw new Error("Valid published workflow did not start.");
    const instance = started.instance;
    const [receive, approve, decide] = instance.tasks.map((task) => present(task));
    if (!receive || !approve || !decide) throw new Error("Expected all materialized tasks.");
    expect(receive).toMatchObject({
      kind: "tarefa",
      precondition: "Documento recebido",
      expectedAction: "Registrar protocolo",
      slaAmount: 2,
      slaUnit: "horas",
      dueAt: "2026-01-15T14:00:00.000Z",
      nextByOutcome: { concluído: approve.stepId, "não aplicável": END_OF_WORKFLOW },
    });
    expect(approve).toMatchObject({
      kind: "aprovação",
      approver: "Revisor",
      correctionStepId: receive.stepId,
      slaAmount: 4,
      slaUnit: "horas",
      nextByOutcome: {
        aprovado: decide.stepId,
        rejeitado: receive.stepId,
        "necessita correção": receive.stepId,
      },
    });
    expect(decide).toMatchObject({
      kind: "decisão",
      question: "A documentação está completa?",
      options: [
        { id: "finish", label: "Concluir", nextStepId: END_OF_WORKFLOW, note: "Arquivo completo" },
        { id: "return", label: "Revisar", nextStepId: receive.stepId, note: "Reabrir conferência" },
      ],
    });
    expect(decide.options).not.toBe(doc.steps[2]?.decisionOptions);
    const frozen = present(publishedWorkflowVersion(doc)?.content);
    expect(decide.options).not.toBe(frozen.steps[2]?.decisionOptions);
    expect(decide.options?.[0]).not.toBe(frozen.steps[2]?.decisionOptions?.[0]);
    expect(approve.nextByOutcome).not.toBe(frozen.steps[1]?.outcomeTransitions);
    const before = structuredClone(instance.tasks);
    expect(createWorkflowVersion(doc.id).ok).toBe(true);
    const draft = present(getWorkflowDoc(doc.id));
    updateWorkflowStep(doc.id, receive.stepId, { slaAmount: 90, expectedAction: "Alterado" });
    updateWorkflowStep(doc.id, approve.stepId, {
      approver: "Outra pessoa",
      outcomeTransitions: { aprovado: END_OF_WORKFLOW },
    });
    present(draft.steps[2]?.decisionOptions)[0]!.label = "Outra decisão";
    expect(present(getWorkflowInstance(instance.id)).tasks).toEqual(before);
  },
);
