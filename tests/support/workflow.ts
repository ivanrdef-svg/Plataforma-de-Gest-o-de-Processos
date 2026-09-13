import { expect } from "bun:test";
import { END_OF_WORKFLOW } from "@/config/execution-rules";
import {
  createWorkflowFromProcess,
  getWorkflowDoc,
  publishWorkflow,
  updateWorkflowDoc,
  updateWorkflowStep,
} from "@/lib/workflow-store";
import { present, processFixture } from "./fixtures";

export function configuredWorkflow() {
  const doc = createWorkflowFromProcess(processFixture());
  const [receive, approve, decide] = doc.steps.map((step) => step.id);
  if (!receive || !approve || !decide) throw new Error("Expected three fixture steps.");
  updateWorkflowDoc(doc.id, {
    slaAmount: 2,
    slaUnit: "dias",
    taskSlaAmount: 4,
    taskSlaUnit: "horas",
  });
  updateWorkflowStep(doc.id, receive, {
    kind: "tarefa",
    slaAmount: 2,
    slaUnit: "horas",
    precondition: "Documento recebido",
    expectedAction: "Registrar protocolo",
    outcomeTransitions: { concluído: approve, "não aplicável": END_OF_WORKFLOW },
  });
  updateWorkflowStep(doc.id, approve, {
    kind: "aprovação",
    approver: "Revisor",
    correctionStepId: receive,
    outcomeTransitions: { aprovado: decide, rejeitado: receive, "necessita correção": receive },
  });
  updateWorkflowStep(doc.id, decide, {
    kind: "decisão",
    decisionQuestion: "A documentação está completa?",
    decisionOptions: [
      { id: "finish", label: "Concluir", nextStepId: END_OF_WORKFLOW, note: "Arquivo completo" },
      { id: "return", label: "Revisar", nextStepId: receive, note: "Reabrir conferência" },
    ],
    outcomeTransitions: { concluído: END_OF_WORKFLOW },
  });
  return present(getWorkflowDoc(doc.id));
}

export function publishedWorkflow() {
  const doc = configuredWorkflow();
  expect(publishWorkflow(doc.id)).toEqual({ ok: true, version: 1 });
  return present(getWorkflowDoc(doc.id));
}
