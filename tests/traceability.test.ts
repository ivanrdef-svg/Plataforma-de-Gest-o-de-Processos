import { getPublishedProcessVersion } from "@/lib/process-store";
import { expect, test } from "bun:test";
import { generateDiagramFromProcess } from "@/config/bpm-model";
import type { PopProcessStepMapping } from "@/config/pop-process-step-mapping-model";
import { getPopSectionTraceability, type PopTraceabilityInput } from "@/lib/pop-traceability";
import { deepFreeze, processFixture } from "./support/fixtures";

function inputFor(status: PopProcessStepMapping["status"]): PopTraceabilityInput {
  const process = processFixture();
    const version = getPublishedProcessVersion(process)!;
  return {
    section: {
      id: "section-fixture",
      title: "Procedimento",
      content: "Receber documento",
      notes: "",
    },
    mappings: [
      {
        id: "mapping-fixture",
        popId: "pop-fixture",
        popSectionId: "section-fixture",
        processId: process.id,
        processStepId: "process-step-1",
        status,
        source: "manual",
        createdAt: "2026-01-15T12:00:00.000Z",
        updatedAt: "2026-01-15T12:00:00.000Z",
      },
    ],
    process: { id: process.id, versionId: version.id, definition: version.definition },
    bpmDiagram: generateDiagramFromProcess(process.id, version.id, version.definition),
    workflowDocs: [],
    instances: [],
  };
}

for (const status of ["sugerido", "rejeitado"] as const) {
  test(status + " mapping does not create an operational relation", () => {
    const input = inputFor(status);
    const before = structuredClone(input);
    const result = getPopSectionTraceability(deepFreeze(input));
    expect(result.mappingStatus).toBe(status);
    expect(result.processStep).toBeUndefined();
    expect(result.bpmNodes).toEqual([]);
    expect(result.workflowSteps).toEqual([]);
    expect(input).toEqual(before);
  });
}

test("confirmed mapping derives the real Process/BPM relation purely", () => {
  const input = inputFor("confirmado");
  const before = structuredClone(input);
  const first = getPopSectionTraceability(deepFreeze(input));
  expect(first.processStep).toEqual({
    processStepId: "process-step-1",
    processStepName: "Receber",
    processStepOrder: 1,
  });
  expect(first.mappingStatus).toBe("confirmado");
  expect(first.bpmNodes.map((node) => node.nodeId)).toEqual(["task-process-step-1"]);
  expect(first.processStepInconsistency).toBeUndefined();
  expect(getPopSectionTraceability(input)).toEqual(first);
  expect(input).toEqual(before);
});
