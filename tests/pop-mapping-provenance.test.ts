import { expect } from "bun:test";
import { isolatedTest } from "./support/isolated-test";
import { processFixture, present } from "./support/fixtures";
import {
  createProcessVersion,
  getProcessDoc,
  getPublishedProcessVersion,
  getWorkingProcessVersion,
  publishProcessVersion,
  removeProcessStep,
} from "@/lib/process-store";
import { createPopDoc, getPopDoc, updatePopDoc } from "@/lib/pop-store";
import {
  confirmMapping,
  createManualMapping,
  getMapping,
  isMappingConsistent,
  recordAiSuggestion,
} from "@/lib/pop-process-step-mapping-store";

isolatedTest(
  "POP logical links and human mapping provenance survive a new ProcessVersion",
  import.meta.url,
  () => {
    const process = processFixture();
    window.localStorage.setItem(
      "process-platform:process:v1",
      JSON.stringify({ [process.id]: process }),
    );
    const published = present(getPublishedProcessVersion(present(getProcessDoc(process.id))));
    const pop = createPopDoc("POP vinculado");
    updatePopDoc(pop.id, { processId: process.id });
    const manual = createManualMapping({
      popId: pop.id,
      popSectionId: "manual-section",
      processId: process.id,
      processVersionId: published.id,
      processStepId: "process-step-1",
    });
    expect(manual.ok).toBe(true);
    if (!manual.ok) throw new Error(manual.reason);
    expect(manual.mapping.confirmedAgainstProcessVersionId).toBe(published.id);
    const suggestion = recordAiSuggestion({
      popId: pop.id,
      popSectionId: "ai-section",
      processId: process.id,
      processVersionId: published.id,
      processStepId: "process-step-2",
      confidence: 0.9,
      rationale: "Correspondência revisável",
    });
    if (!suggestion.ok) throw new Error(suggestion.reason);
    expect(suggestion.mapping.confirmedAgainstProcessVersionId).toBeUndefined();
    createProcessVersion(process.id);
    const draft = present(getWorkingProcessVersion(present(getProcessDoc(process.id))));
    const confirmed = confirmMapping(suggestion.mapping.id, draft.id);
    if (!confirmed.ok) throw new Error(confirmed.reason);
    expect(confirmed.mapping.confirmedAgainstProcessVersionId).toBe(draft.id);
    expect(confirmed.mapping.source).toBe("ia");
    const before = structuredClone([manual.mapping, confirmed.mapping]);
    removeProcessStep(process.id, "process-step-2");
    publishProcessVersion(process.id);
    expect(getPopDoc(pop.id)?.processId).toBe(process.id);
    expect([getMapping(manual.mapping.id), getMapping(confirmed.mapping.id)]).toEqual(before);
    expect(isMappingConsistent(confirmed.mapping, draft.id)).toBe(false);
    expect(isMappingConsistent(confirmed.mapping, published.id)).toBe(true);
  },
);

isolatedTest(
  "mapping confirmation rejects absent explicit versions and stale step targets without mutation",
  import.meta.url,
  () => {
    const process = processFixture();
    window.localStorage.setItem(
      "process-platform:process:v1",
      JSON.stringify({ [process.id]: process }),
    );
    const published = present(getPublishedProcessVersion(present(getProcessDoc(process.id))));
    const pop = createPopDoc();
    updatePopDoc(pop.id, { processId: process.id });
    const suggestion = recordAiSuggestion({
      popId: pop.id,
      popSectionId: "section",
      processId: process.id,
      processVersionId: published.id,
      processStepId: "process-step-2",
      confidence: 0.7,
      rationale: "Revisar",
    });
    if (!suggestion.ok) throw new Error(suggestion.reason);
    expect(confirmMapping(suggestion.mapping.id, "missing-version")).toEqual({
      ok: false,
      reason: "versao-inexistente",
    });
    createProcessVersion(process.id);
    const draft = present(getWorkingProcessVersion(present(getProcessDoc(process.id))));
    removeProcessStep(process.id, "process-step-2");
    expect(confirmMapping(suggestion.mapping.id, draft.id)).toEqual({
      ok: false,
      reason: "step-inexistente",
    });
    expect(getMapping(suggestion.mapping.id)).toEqual(suggestion.mapping);
  },
);
