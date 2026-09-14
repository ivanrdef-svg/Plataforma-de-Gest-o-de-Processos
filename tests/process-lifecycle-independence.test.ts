import { expect } from "bun:test";
import { isolatedTest } from "./support/isolated-test";
import { present } from "./support/fixtures";
import {
  createProcessDoc,
  getProcessDoc,
  getWorkingProcessVersion,
  publishProcessVersion,
  createProcessVersion,
} from "@/lib/process-store";
import { applyLifecycleAction, getLifecycle } from "@/lib/lifecycle-store";
import { createPopDoc, linkPopToProcess, getPopDoc } from "@/lib/pop-store";
isolatedTest(
  "T11 Lifecycle actions never publish, archive or reopen Process versions",
  import.meta.url,
  () => {
    const doc = createProcessDoc();
    const seed = {
      objectId: doc.id,
      kind: "processo" as const,
      name: "Processo",
      status: "aprovado",
    };
    const before = structuredClone(doc);
    expect(applyLifecycleAction(seed, "publicar").state).toBe("publicado");
    expect(getProcessDoc(doc.id)).toEqual(before);
    expect(getWorkingProcessVersion(present(getProcessDoc(doc.id)))?.status).toBe("rascunho");
    expect(publishProcessVersion(doc.id).ok).toBe(true);
    const published = structuredClone(present(getProcessDoc(doc.id)));
    expect(applyLifecycleAction(seed, "arquivar").state).toBe("arquivado");
    expect(applyLifecycleAction(seed, "restaurar").state).toBe("em elaboração");
    expect(getProcessDoc(doc.id)).toEqual(published);
    expect(getLifecycle(seed).state).toBe("em elaboração");
  },
);
isolatedTest(
  "T12 POP logical process link survives Process version changes",
  import.meta.url,
  () => {
    const doc = createProcessDoc();
    const pop = createPopDoc("POP");
    expect(linkPopToProcess(pop.id, doc.id)?.processId).toBe(doc.id);
    expect(publishProcessVersion(doc.id).ok).toBe(true);
    expect(createProcessVersion(doc.id).ok).toBe(true);
    expect(publishProcessVersion(doc.id).ok).toBe(true);
    expect(getPopDoc(pop.id)?.processId).toBe(doc.id);
  },
);
