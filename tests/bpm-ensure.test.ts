import { isolatedTest } from "./support/isolated-test";
import { expect } from "bun:test";
import { ensureDiagram, updateBpmNode } from "@/lib/bpm-store";
import { processFixture, present } from "./support/fixtures";

isolatedTest(
  "ensureDiagram keeps the existing edited drawing when the Process changes",
  import.meta.url,
  () => {
    const process = processFixture();
    const original = ensureDiagram(process);
    const node = present(original.nodes.find((item) => item.stepId === "process-step-1"));
    updateBpmNode(process.id, node.id, {
      name: "Nome editorial",
      x: 777,
      notes: "Anotação preservada",
    });
    const edited = ensureDiagram(process);
    const expected = structuredClone(edited);
    process.steps[0]!.name = "Nome do Processo alterado";
    process.steps.push({ ...process.steps[0]!, id: "new-process-step" });
    expect(ensureDiagram(process)).toBe(edited);
    expect(ensureDiagram(process)).toEqual(expected);
  },
);
