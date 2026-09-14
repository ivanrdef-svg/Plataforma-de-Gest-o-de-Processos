import { getPublishedProcessVersion } from "@/lib/process-store";
import { expect } from "bun:test";
import { isolatedTest } from "./support/isolated-test";
import { processFixture, present } from "./support/fixtures";
import { publishedWorkflow } from "./support/workflow";
import {
  createWorkflowFromProcess,
  createWorkflowVersion,
  getWorkflowDoc,
  publishedWorkflowVersion,
  syncWorkflowWithProcess,
  updateWorkflowStep,
  type WorkflowStep,
} from "@/lib/workflow-store";

isolatedTest(
  "R06 process sync updates only Process-owned fields and preserves every executable field",
  import.meta.url,
  () => {
    const process = processFixture();
    const sourceVersion = present(getPublishedProcessVersion(process));
    const definition = sourceVersion.definition;
    const created = createWorkflowFromProcess(process);
    if (!created.ok) throw new Error(created.reason);
    const doc = created.doc;
    const first = doc.steps[0]!;
    const target = doc.steps[1]!.id;
    const configured: Partial<WorkflowStep> = {
      role: "Aprovador",
      dependsOn: "Dependência manual",
      precondition: "Pré-condição manual",
      condition: "Condição manual",
      deadline: "Prazo manual",
      expectedAction: "Ação manual",
      kind: "decisão",
      approver: "Aprovador manual",
      decisionQuestion: "Autorizar?",
      decisionOptions: [{ id: "yes", label: "Sim", nextStepId: target, note: "Confirmado" }],
      outcomeTransitions: { aprovado: target },
      correctionStepId: target,
      conditionTargetStepId: target,
      slaAmount: 7,
      slaUnit: "horas",
    };
    updateWorkflowStep(doc.id, first.id, configured);
    const before = structuredClone(present(getWorkflowDoc(doc.id)));
    Object.assign(definition.steps[0]!, {
      name: "Novo nome",
      description: "Nova descrição",
      owner: "Novo dono",
      type: "consulta",
      inputs: "Nova entrada",
      outputs: "Nova saída",
      duration: "9 horas",
    });
    definition.name = "Processo atualizado";
    sourceVersion.number = 2;
    const synced = present(syncWorkflowWithProcess(doc.id, process.id, sourceVersion));
    expect(synced.steps[0]).toEqual({
      ...before.steps[0]!,
      processStepId: definition.steps[0]!.id,
      name: "Novo nome",
      description: "Nova descrição",
      owner: "Novo dono",
      type: "consulta",
      inputs: "Nova entrada",
      outputs: "Nova saída",
      duration: "9 horas",
    });
    expect(synced.processName).toBe("Processo atualizado");
    expect(synced.processVersion).toBe("V2");
    expect(synced.participants).toEqual(before.participants);
    expect(synced.steps.map((s) => s.id)).toEqual(before.steps.map((s) => s.id));
    expect(syncWorkflowWithProcess(doc.id, process.id, sourceVersion)).toEqual(synced);
  },
);

isolatedTest(
  "R06 decision options and transitions retain their Workflow step targets",
  import.meta.url,
  () => {
    const process = processFixture();
    const sourceVersion = present(getPublishedProcessVersion(process));
    const definition = sourceVersion.definition;
    const created = createWorkflowFromProcess(process);
    if (!created.ok) throw new Error(created.reason);
    const doc = created.doc;
    const target = doc.steps[1]!.id;
    const config = {
      kind: "decisão" as const,
      decisionQuestion: "Qual caminho?",
      decisionOptions: [{ id: "route", label: "Seguir", nextStepId: target, note: "Manter" }],
      outcomeTransitions: { concluído: target },
    };
    updateWorkflowStep(doc.id, doc.steps[0]!.id, config);
    expect(present(syncWorkflowWithProcess(doc.id, process.id, sourceVersion)).steps[0]).toMatchObject(config);
  },
);

isolatedTest("R06 approval and correction target survive sync", import.meta.url, () => {
  const process = processFixture();
    const sourceVersion = present(getPublishedProcessVersion(process));
    const definition = sourceVersion.definition;
  const created = createWorkflowFromProcess(process);
    if (!created.ok) throw new Error(created.reason);
    const doc = created.doc;
  const config = {
    kind: "aprovação" as const,
    approver: "Revisor escolhido",
    correctionStepId: doc.steps[0]!.id,
  };
  updateWorkflowStep(doc.id, doc.steps[1]!.id, config);
  expect(present(syncWorkflowWithProcess(doc.id, process.id, sourceVersion)).steps[1]).toMatchObject(config);
});

isolatedTest(
  "R06 condition target survives sync and removed Process type does not linger",
  import.meta.url,
  () => {
    const process = processFixture();
    const sourceVersion = present(getPublishedProcessVersion(process));
    const definition = sourceVersion.definition;
    const created = createWorkflowFromProcess(process);
    if (!created.ok) throw new Error(created.reason);
    const doc = created.doc;
    const config = { condition: "Se completo", conditionTargetStepId: doc.steps[1]!.id };
    updateWorkflowStep(doc.id, doc.steps[0]!.id, config);
    delete definition.steps[0]!.type;
    const synced = present(syncWorkflowWithProcess(doc.id, process.id, sourceVersion));
    expect(synced.steps[0]).toMatchObject(config);
    expect(synced.steps[0]).not.toHaveProperty("type");
  },
);

isolatedTest(
  "R06 new steps preserve existing IDs and config and retain sync initialization defaults",
  import.meta.url,
  () => {
    const process = processFixture();
    const sourceVersion = present(getPublishedProcessVersion(process));
    const definition = sourceVersion.definition;
    const created = createWorkflowFromProcess(process);
    if (!created.ok) throw new Error(created.reason);
    const doc = created.doc;
    updateWorkflowStep(doc.id, doc.steps[0]!.id, { kind: "aprovação", approver: "Manual" });
    const before = structuredClone(present(getWorkflowDoc(doc.id)));
    definition.steps.push({
      ...definition.steps[0]!,
      id: "new-process-step",
      type: "aprovacao",
      preconditions: "Documento recebido",
      execution: "condicional",
    });
    const synced = present(syncWorkflowWithProcess(doc.id, process.id, sourceVersion));
    expect(synced.steps.slice(0, 3)).toEqual(before.steps);
    const added = present(synced.steps[3]);
    expect(before.steps.map((s) => s.id)).not.toContain(added.id);
    expect(added).toMatchObject({
      processStepId: "new-process-step",
      role: "Aprovador",
      dependsOn: "Concluir",
      precondition: "Documento recebido",
      deadline: "1 hora",
      condition: "",
      expectedAction: "",
    });
    expect(synced.participants).toEqual(before.participants);
    expect(syncWorkflowWithProcess(doc.id, process.id, sourceVersion)).toEqual(synced);
  },
);

isolatedTest(
  "R06 empty configured fields survive while empty dependsOn keeps its existing fallback",
  import.meta.url,
  () => {
    const process = processFixture();
    const sourceVersion = present(getPublishedProcessVersion(process));
    const definition = sourceVersion.definition;
    const created = createWorkflowFromProcess(process);
    if (!created.ok) throw new Error(created.reason);
    const doc = created.doc;
    updateWorkflowStep(doc.id, doc.steps[1]!.id, {
      precondition: "",
      deadline: "",
      expectedAction: "",
      condition: "",
      dependsOn: "",
    });
    definition.steps[1]!.preconditions = "Novo default";
    definition.steps[1]!.duration = "8 horas";
    definition.steps[1]!.dependsOn = "Dependência do Processo";
    expect(present(syncWorkflowWithProcess(doc.id, process.id, sourceVersion)).steps[1]).toMatchObject({
      precondition: "",
      deadline: "",
      expectedAction: "",
      condition: "",
      dependsOn: "Dependência do Processo",
    });
  },
);

isolatedTest(
  "R06 sync requires an editable draft and never changes the published snapshot",
  import.meta.url,
  () => {
    const doc = publishedWorkflow();
    const published = structuredClone(present(publishedWorkflowVersion(doc)));
    const process = processFixture();
    const sourceVersion = present(getPublishedProcessVersion(process));
    const definition = sourceVersion.definition;
    definition.steps[0]!.name = "Nome atualizado";
    expect(syncWorkflowWithProcess(doc.id, process.id, sourceVersion)).toBeUndefined();
    expect(publishedWorkflowVersion(present(getWorkflowDoc(doc.id)))).toEqual(published);
    expect(createWorkflowVersion(doc.id).ok).toBe(true);
    expect(present(syncWorkflowWithProcess(doc.id, process.id, sourceVersion)).steps[0]?.name).toBe(
      "Nome atualizado",
    );
    expect(publishedWorkflowVersion(present(getWorkflowDoc(doc.id)))).toEqual(published);
  },
);
