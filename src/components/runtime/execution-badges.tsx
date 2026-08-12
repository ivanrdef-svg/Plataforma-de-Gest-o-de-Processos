import { Pill } from "@/components/ui/pill";
import {
  APPROVAL_STATE_TONE,
  EXECUTION_KIND_TONE,
  OUTCOME_TONE,
  ruleType,
  type ApprovalState,
  type ExecutionKind,
  type RuleTypeId,
  type TaskOutcome,
} from "@/config/execution-rules";

/** Build 013 — selos das regras de execução, sobre o primitivo Pill existente. */

type Size = "sm" | "default" | "md";

export function ExecutionKindBadge({
  kind,
  size = "sm",
}: {
  kind: ExecutionKind;
  size?: Size;
}) {
  return (
    <Pill tone={EXECUTION_KIND_TONE[kind]} size={size} shape="full">
      {kind}
    </Pill>
  );
}

export function OutcomeBadge({
  outcome,
  size = "sm",
}: {
  outcome: TaskOutcome;
  size?: Size;
}) {
  return (
    <Pill tone={OUTCOME_TONE[outcome]} size={size} shape="full">
      {outcome}
    </Pill>
  );
}

export function ApprovalStateBadge({
  state,
  size = "sm",
}: {
  state: ApprovalState;
  size?: Size;
}) {
  return (
    <Pill tone={APPROVAL_STATE_TONE[state]} size={size} shape="full">
      aprovação {state}
    </Pill>
  );
}

export function RuleTypeBadge({ id, size = "sm" }: { id: RuleTypeId; size?: Size }) {
  const type = ruleType(id);
  return (
    <Pill tone={type.tone} size={size} shape="full">
      {type.label}
    </Pill>
  );
}
