import { expect, test } from "bun:test";
import { generateDiagramFromProcess } from "@/config/bpm-model";
import { validateBpmn } from "@/lib/bpm-validation";
import { deepFreeze, processFixture } from "./support/fixtures";

test("BPM validation is deterministic and does not mutate even an inconsistent diagram", () => {
  const process = processFixture();
  const diagram = generateDiagramFromProcess(process);
  diagram.edges.push({ id: "orphan-edge", kind: "sequence", source: "missing", target: "end" });
  const before = structuredClone({ process, diagram });
  deepFreeze(process);
  deepFreeze(diagram);
  const first = validateBpmn(diagram, process);
  expect(validateBpmn(diagram, process)).toEqual(first);
  expect({ process, diagram }).toEqual(before);
  expect(JSON.stringify(first)).toContain("orphan-edge");
});
