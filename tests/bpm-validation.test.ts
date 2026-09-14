import { getPublishedProcessVersion } from "@/lib/process-store";
import { expect, test } from "bun:test";
import { generateDiagramFromProcess } from "@/config/bpm-model";
import { validateBpmn } from "@/lib/bpm-validation";
import { deepFreeze, processFixture } from "./support/fixtures";

test("BPM validation is deterministic and does not mutate even an inconsistent diagram", () => {
  const process = processFixture();
    const version = getPublishedProcessVersion(process)!;
  const diagram = generateDiagramFromProcess(process.id, version.id, version.definition);
  diagram.edges.push({ id: "orphan-edge", kind: "sequence", source: "missing", target: "end" });
  const before = structuredClone({ process, diagram });
  deepFreeze(process);
  deepFreeze(diagram);
  const first = validateBpmn(diagram, version.definition);
  expect(validateBpmn(diagram, version.definition)).toEqual(first);
  expect({ process, diagram }).toEqual(before);
  expect(JSON.stringify(first)).toContain("orphan-edge");
});
