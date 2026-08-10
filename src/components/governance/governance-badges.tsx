import { Pill } from "@/components/ui/pill";
import {
  APPROVAL_STATUS,
  COMPLIANCE_STATUS,
  CONTROL_STATUS_TONE,
  criticalityStyle,
  RESPONSIBILITY_ROLES,
  REVIEW_SITUATION,
  RISK_STATUS_TONE,
  type ApprovalStatus,
  type ComplianceStatus,
  type ControlStatus,
  type CriticalityLevel,
  type ResponsibilityRole,
  type ReviewSituation,
  type RiskStatus,
} from "@/config/governance-model";
import { cn } from "@/lib/utils";

/**
 * Build 010 — selos de governança.
 *
 * Todos reutilizam o primitivo `Pill` já consolidado no projeto: nenhuma
 * variante visual nova é introduzida.
 */

export function CriticalityBadge({
  level,
  size = "default",
  className,
}: {
  level: CriticalityLevel;
  size?: "sm" | "default";
  className?: string;
}) {
  const style = criticalityStyle(level);
  return (
    <Pill
      tone={style.tone}
      shape="full"
      size={size === "sm" ? "default" : "md"}
      title={style.description}
      className={cn("capitalize", className)}
    >
      {level}
    </Pill>
  );
}

export function ComplianceBadge({ status }: { status: ComplianceStatus }) {
  const style = COMPLIANCE_STATUS[status];
  return (
    <Pill tone={style.tone} shape="full" icon={style.icon} gap="gap-1.5">
      {style.label}
    </Pill>
  );
}

export function ReviewSituationBadge({ situation }: { situation: ReviewSituation }) {
  const style = REVIEW_SITUATION[situation];
  return (
    <Pill tone={style.tone} shape="full" size="md" icon={style.icon} gap="gap-1.5">
      {style.label}
    </Pill>
  );
}

export function ApprovalBadge({ status }: { status: ApprovalStatus }) {
  const style = APPROVAL_STATUS[status];
  return (
    <Pill tone={style.tone} shape="full" size="md" icon={style.icon} gap="gap-1.5">
      {style.label}
    </Pill>
  );
}

export function RiskStatusBadge({ status }: { status: RiskStatus }) {
  return (
    <Pill tone={RISK_STATUS_TONE[status]} shape="full" className="capitalize">
      {status}
    </Pill>
  );
}

export function ControlStatusBadge({ status }: { status: ControlStatus }) {
  return (
    <Pill tone={CONTROL_STATUS_TONE[status]} shape="full" className="capitalize">
      {status}
    </Pill>
  );
}

export function ResponsibilityBadge({ role }: { role: ResponsibilityRole }) {
  const style = RESPONSIBILITY_ROLES[role];
  return (
    <Pill tone={style.tone} shape="full" icon={style.icon} gap="gap-1.5" title={style.description}>
      {role}
    </Pill>
  );
}
