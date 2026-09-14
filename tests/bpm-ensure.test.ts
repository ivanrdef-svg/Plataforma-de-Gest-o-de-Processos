import { getPublishedProcessVersion } from "@/lib/process-store";
import { isolatedTest } from "./support/isolated-test";
import { expect } from "bun:test";
import { ensureDiagram, updateBpmNode } from "@/lib/bpm-store";
import { processFixture, present } from "./support/fixtures";

isolatedTest(
  "ensureDiagram keeps the existing edited drawing when the Process changes",
  import.meta.url,
  () => {
    const process = processFixture();
    const version = getPublishedProcessVersion(process)!;
    const original = ensureDiagram(process.id, version.id, version.definition);
    const node = present(original.nodes.find((item) => item.stepId === "process-step-1"));
    updateBpmNode(process.id, node.id, {
      name: "Nome editorial",
      x: 777,
      notes: "Anotação preservada",
    });
    const edited = ensureDiagram(process.id, version.id, version.definition);
    const expected = structuredClone(edited);
    version.definition.steps[0]!.name = "Nome do Processo alterado";
    version.definition.steps.push({ ...version.definition.steps[0]!, id: "new-process-step" });
    expect(ensureDiagram(process.id, version.id, version.definition)).toBe(edited);
    expect(ensureDiagram(process.id, version.id, version.definition)).toEqual(expected);
  },
);
