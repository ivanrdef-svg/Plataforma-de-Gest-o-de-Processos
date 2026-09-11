import {
  getPopSectionTraceability,
  getPopTraceabilitySummary,
} from "@/lib/pop-traceability";

const now = new Date().toISOString();
const section = (id: string) => ({ id, title: id, content: "", notes: "" }) as any;

const process: any = {
  id: "p1",
  steps: [
    { id: "s1", name: "Etapa 1" },
    { id: "s2", name: "Etapa 2" },
  ],
};

const mapping = (over: any) => ({
  id: "m" + Math.random(),
  popId: "pop1",
  popSectionId: "sec1",
  processId: "p1",
  processStepId: "s1",
  status: "confirmado",
  source: "manual",
  createdAt: now,
  updatedAt: now,
  ...over,
});

const bpmDiagram: any = {
  processId: "p1",
  nodes: [
    { id: "n1", stepId: "s1", name: "Nó 1" },
    { id: "n2", stepId: "s2", name: "Nó 2" },
  ],
};

const workflowDocs: any[] = [
  { id: "w1", name: "WF 1", processId: "p1", steps: [{ id: "ws1", processStepId: "s1", name: "WS 1" }] },
];
const instances: any[] = [
  { id: "i1", workflowId: "w1", tasks: [{ id: "t1", stepId: "ws1" }] },
  { id: "i2", workflowId: "w1", tasks: [{ id: "t2", stepId: "ws1" }] },
];

const base = { process, bpmDiagram, workflowDocs, instances };
const check = (label: string, cond: boolean, got: unknown) =>
  console.log(cond ? "PASS" : "FAIL", label, cond ? "" : JSON.stringify(got));

// 1 sem mapping
let r = getPopSectionTraceability({ section: section("sec1"), mappings: [], ...base });
check("nao-mapeada", r.mappingStatus === "nao-mapeada" && !r.processStep, r);

// 2 sugerido apenas
r = getPopSectionTraceability({
  section: section("sec1"),
  mappings: [mapping({ status: "sugerido", source: "ia" }), mapping({ status: "rejeitado" })],
  ...base,
});
check(
  "sugerido",
  r.mappingStatus === "sugerido" && !r.processStep && r.bpmNodes.length === 0 && r.workflowSteps.length === 0,
  r,
);

// 3 confirmado completo
r = getPopSectionTraceability({ section: section("sec1"), mappings: [mapping({})], ...base });
check(
  "confirmado completo",
  r.mappingStatus === "confirmado" &&
    r.processStep?.processStepId === "s1" &&
    r.processStep?.processStepOrder === 1 &&
    r.bpmNodes.length === 1 &&
    r.workflowSteps.length === 1 &&
    r.workflowSteps[0]!.instanceCount === 2,
  r,
);

// 4 step removido
r = getPopSectionTraceability({
  section: section("sec1"),
  mappings: [mapping({ processStepId: "sX" })],
  ...base,
});
check("step-inexistente", r.processStepInconsistency === "step-inexistente" && !r.processStep, r);

// 5 sem BpmNode
r = getPopSectionTraceability({
  section: section("sec1"),
  mappings: [mapping({ processStepId: "s2" })],
  ...base,
  bpmDiagram: { processId: "p1", nodes: [] } as any,
});
check("bpmNodes vazio", r.mappingStatus === "confirmado" && r.bpmNodes.length === 0 && !r.processStepInconsistency, r);

// 6 sem WorkflowStep
r = getPopSectionTraceability({
  section: section("sec1"),
  mappings: [mapping({ processStepId: "s2" })],
  ...base,
});
check("workflowSteps vazio", r.workflowSteps.length === 0 && r.bpmNodes.length === 1, r);

// summary
const all = getPopTraceabilitySummary({ id: "pop1" } as any, [section("sec1"), section("sec2")], {
  mappings: [mapping({})],
  ...base,
});
check("summary", all.length === 2 && all[0]!.mappingStatus === "confirmado" && all[1]!.mappingStatus === "nao-mapeada", all);
