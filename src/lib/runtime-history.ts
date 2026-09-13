import type { WorkflowDoc, WorkflowVersion } from "@/lib/workflow-store";
import type { WorkflowInstance } from "@/lib/runtime-store";

/** Pure lookup of recorded provenance. Never migrate or infer a historical version. */
export function getExecutedWorkflowVersion(
  instance: WorkflowInstance,
  workflow: WorkflowDoc | undefined,
): WorkflowVersion | undefined {
  if (!instance.workflowVersionId || !workflow || workflow.id !== instance.workflowId)
    return undefined;
  const matches =
    workflow.versions?.filter((v) => v.versionId === instance.workflowVersionId) ?? [];
  if (matches.length !== 1) return undefined;
  const version = matches[0]!;
  if (!version.content || version.status === "rascunho") return undefined;
  if (instance.workflowVersion !== undefined && instance.workflowVersion !== version.number)
    return undefined;
  return version;
}

/** Tasks own materialized labels; version content supplies only missing history. */
export function getRuntimeHistory(instance: WorkflowInstance, workflow: WorkflowDoc | undefined) {
  const version = getExecutedWorkflowVersion(instance, workflow);
  const tasks = [...instance.tasks].sort((a, b) => a.order - b.order);
  return {
    provenance: version ? ("recorded" as const) : ("unknown" as const),
    participants: version?.content?.participants ?? [],
    steps: tasks.map((task) => ({
      id: task.stepId,
      name: task.name,
      owner: task.owner,
      duration: task.deadline,
      // processStepId is not materialized on RuntimeTask.
      processStepId: version?.content?.steps.find((step) => step.id === task.stepId)?.processStepId,
    })),
  };
}
