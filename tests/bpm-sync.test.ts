import { getPublishedProcessVersion } from "@/lib/process-store";
import { isolatedTest } from "./support/isolated-test";
import { expect } from "bun:test";
import {
  addManualNode,
  ensureDiagram,
  syncDiagramWithProcess,
  updateBpmNode,
} from "@/lib/bpm-store";
import { present, processFixture } from "./support/fixtures";

isolatedTest(
  "additive BPM sync keeps existing nodes, edges and manual elements",
  import.meta.url,
  () => {
    const process = processFixture();
    const version = getPublishedProcessVersion(process)!;
    ensureDiagram(process.id, version.id, version.definition);
    const manual = present(addManualNode(process.id, "annotation", { x: 500, y: 300 }));
    updateBpmNode(process.id, manual.id, { name: "Nota manual", notes: "Não descartar" });
    const before = structuredClone(ensureDiagram(process.id, version.id, version.definition));
    const expanded = structuredClone(process);
    expanded.versions[0]!.definition.steps.push({ ...expanded.versions[0]!.definition.steps[0]!, id: "process-step-4", name: "Arquivar" });
    const synced = syncDiagramWithProcess(expanded.id, expanded.versions[0]!.id, expanded.versions[0]!.definition);
    for (const node of before.nodes)
      expect(synced.nodes.find((item) => item.id === node.id)).toEqual(node);
    for (const edge of before.edges)
      expect(synced.edges.find((item) => item.id === edge.id)).toEqual(edge);
    expect(synced.nodes.filter((node) => node.stepId === "process-step-4")).toHaveLength(1);
    expect(synced.nodes.find((node) => node.id === manual.id)?.notes).toBe("Não descartar");
    expect(syncDiagramWithProcess(expanded.id, expanded.versions[0]!.id, expanded.versions[0]!.definition)).toEqual(synced);
  },
);
