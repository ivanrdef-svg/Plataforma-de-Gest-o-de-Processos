import { AlertTriangle, Clock, Timer } from "lucide-react";
import { Pill } from "@/components/ui/pill";
import { Progress } from "@/components/ui/progress";
import {
  NO_SLA_LABEL,
  OVERDUE_LABEL,
  SLA_STATUS_TONE,
  specLabel,
  type SlaSpec,
  type SlaStatus,
} from "@/config/sla-model";
import { formatRemaining, type SlaComputation } from "@/lib/sla";
import { formatDateTime } from "@/lib/runtime-store";

/** Build 014 — selos temporais, sobre o primitivo Pill já existente. */

type Size = "sm" | "default" | "md";

export function SlaStatusBadge({
  status,
  size = "sm",
}: {
  status: SlaStatus;
  size?: Size;
}) {
  if (status === "não aplicável") {
    return (
      <Pill tone={SLA_STATUS_TONE[status]} size={size} shape="full">
        {NO_SLA_LABEL}
      </Pill>
    );
  }
  return (
    <Pill tone={SLA_STATUS_TONE[status]} size={size} shape="full">
      {status}
    </Pill>
  );
}

/** Condição de atraso — nunca substitui o estado operacional da tarefa. */
export function OverdueFlag({ size = "sm" }: { size?: Size }) {
  return (
    <Pill tone={SLA_STATUS_TONE["vencido"]} size={size} shape="full">
      <AlertTriangle className="mr-1 h-3 w-3" />
      {OVERDUE_LABEL}
    </Pill>
  );
}

/** Tempo restante / excedido, calculado a partir dos timestamps reais. */
export function SlaCountdown({
  sla,
  dueAt,
  className,
}: {
  sla: SlaComputation;
  dueAt?: string | undefined;
  className?: string;
}) {
  if (!sla.applicable) {
    return (
      <span className={className ?? "text-[11px] text-muted-foreground"}>
        {NO_SLA_LABEL}
      </span>
    );
  }
  const late = sla.late || sla.status === "concluído fora do prazo";
  return (
    <span
      className={
        className ??
        `inline-flex items-center gap-1 text-[11px] ${
          late
            ? "text-destructive"
            : sla.status === "próximo do vencimento"
              ? "text-amber-700 dark:text-amber-400"
              : "text-muted-foreground"
        }`
      }
    >
      <Clock className="h-3 w-3" />
      {formatRemaining(sla)}
      {dueAt ? ` · limite ${formatDateTime(dueAt)}` : ""}
    </span>
  );
}

/** Prazo declarado na definição (ex.: "24 horas"). */
export function SlaSpecLabel({ spec }: { spec: SlaSpec | undefined }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
      <Timer className="h-3 w-3" />
      {specLabel(spec)}
    </span>
  );
}

/** Barra de consumo do prazo. */
export function SlaProgress({ sla }: { sla: SlaComputation }) {
  if (!sla.applicable) return null;
  return (
    <Progress
      value={Math.min(100, sla.percent)}
      className={`h-1.5 ${sla.late ? "[&>div]:bg-destructive" : ""}`}
    />
  );
}
