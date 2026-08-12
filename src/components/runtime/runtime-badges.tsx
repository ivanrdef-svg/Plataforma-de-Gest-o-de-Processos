import { Pill } from "@/components/ui/pill";
import {
  INSTANCE_STATE_TONE,
  TASK_STATE_TONE,
  type InstanceState,
  type TaskState,
} from "@/config/runtime-model";

/** Build 012 — selos de estado operacional, sobre o primitivo Pill existente. */

export function InstanceStateBadge({
  state,
  size = "sm",
}: {
  state: InstanceState;
  size?: "sm" | "default" | "md";
}) {
  return (
    <Pill tone={INSTANCE_STATE_TONE[state]} size={size} shape="full">
      {state}
    </Pill>
  );
}

export function TaskStateBadge({
  state,
  size = "sm",
}: {
  state: TaskState;
  size?: "sm" | "default" | "md";
}) {
  return (
    <Pill tone={TASK_STATE_TONE[state]} size={size} shape="full">
      {state}
    </Pill>
  );
}
