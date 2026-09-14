import { expect } from "bun:test";
import { isolatedTest } from "./support/isolated-test";
import { processFixture, present } from "./support/fixtures";
import {
  getAuthoringProcessVersion,
  getPublishedProcessVersion,
  type ProcessVersion,
} from "@/lib/process-store";
import {
  addManualNode,
  addEdge,
  ensureDiagram,
  pendingProcessChanges,
  syncDiagramWithProcess,
} from "@/lib/bpm-store";

isolatedTest(
  "BPM stays process-level and records only an explicitly synchronized version",
  import.meta.url,
  () => {
    const process = processFixture();
    const published = present(getPublishedProcessVersion(process));
    const draft: ProcessVersion = {
      ...structuredClone(published),
      id: "pv2",
      number: 2,
      status: "rascunho",
      basedOnVersionId: published.id,
    };
    draft.definition.steps.push({
      ...draft.definition.steps[0]!,
      id: "new-v2-step",
      name: "Etapa V2",
    });
    process.versions.push(draft);
    process.workingVersionId = draft.id;
    const authoring = present(getAuthoringProcessVersion(process));
    expect(authoring.id).toBe(draft.id);
    expect(getPublishedProcessVersion(process)?.id).toBe(published.id);
    const original = ensureDiagram(process.id, authoring.id, authoring.definition);
    expect(original.syncedFromProcessVersionId).toBe(draft.id);
    expect(original.nodes.some((n) => n.stepId === "new-v2-step")).toBe(true);
    const manual = present(addManualNode(process.id, "annotation", { x: 500, y: 100 }));
    const edge = present(addEdge(process.id, original.nodes[0]!.id, manual.id));
    const edited = ensureDiagram(process.id, authoring.id, authoring.definition);
    const before = structuredClone(edited);
    // Selecting an archived/published source only reads the same diagram; no auto-sync.
    expect(ensureDiagram(process.id, published.id, published.definition)).toBe(edited);
    expect(
      pendingProcessChanges(process.id, published.id, published.definition, edited).count,
    ).toBe(0);
    expect(edited).toEqual(before);
    const historicalSync = syncDiagramWithProcess(process.id, published.id, published.definition);
    expect(historicalSync.processId).toBe(process.id);
    expect(historicalSync.syncedFromProcessVersionId).toBe(published.id);
    expect(historicalSync.nodes).toEqual(before.nodes);
    expect(historicalSync.edges).toEqual(before.edges);
    expect(historicalSync.edges).toContainEqual(edge);
    expect(edited.syncedFromProcessVersionId).toBe(draft.id);
    const persisted = JSON.parse(window.localStorage.getItem("process-platform:bpm:v1")!);
    expect(Object.keys(persisted)).toEqual([process.id]);
    expect(persisted[process.id].syncedFromProcessVersionId).toBe(published.id);
  },
);
