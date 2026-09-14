import { AlertTriangle, CheckCircle2, Info, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProcessDefinition } from "@/lib/process-store";

/**
 * Build 007 — painel "Consistência do Processo".
 * Validações simuladas que preparam o modelo para a futura geração de BPM.
 * Nenhuma regra bloqueia o usuário: o painel apenas orienta a modelagem.
 */

export type ConsistencySeverity = "erro" | "atencao" | "info";

export interface ConsistencyIssue {
  id: string;
  severity: ConsistencySeverity;
  title: string;
  detail: string;
}

const SEVERITY_META: Record<
  ConsistencySeverity,
  { label: string; icon: typeof AlertTriangle; tone: string }
> = {
  erro: {
    label: "Bloqueia o BPM",
    icon: AlertTriangle,
    tone: "text-rose-600 dark:text-rose-400",
  },
  atencao: {
    label: "Atenção",
    icon: Info,
    tone: "text-amber-600 dark:text-amber-400",
  },
  info: { label: "Sugestão", icon: Info, tone: "text-muted-foreground" },
};

export function analyzeProcess(doc: ProcessDefinition): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = [];
  const steps = doc.steps ?? [];
  const rules = doc.rules ?? [];

  if (steps.length === 0) {
    issues.push({
      id: "sem-etapas",
      severity: "erro",
      title: "Processo sem etapas",
      detail: "Sem etapas não é possível derivar um fluxo.",
    });
  }

  steps.forEach((step, i) => {
    const label = `${String(i + 1).padStart(2, "0")} ${step.name || "Etapa sem nome"}`;
    if (!step.owner.trim()) {
      issues.push({
        id: `owner-${step.id}`,
        severity: "erro",
        title: "Etapa sem responsável",
        detail: label,
      });
    }
    if (!step.inputs.trim()) {
      issues.push({
        id: `in-${step.id}`,
        severity: "atencao",
        title: "Entrada ausente",
        detail: label,
      });
    }
    if (!step.outputs.trim()) {
      issues.push({
        id: `out-${step.id}`,
        severity: "atencao",
        title: "Saída ausente",
        detail: label,
      });
    }
    if (!step.duration.trim()) {
      issues.push({
        id: `dur-${step.id}`,
        severity: "info",
        title: "Tempo não estimado",
        detail: label,
      });
    }
  });

  rules.forEach((rule) => {
    if (!rule.application.trim()) {
      issues.push({
        id: `rule-${rule.id}`,
        severity: "atencao",
        title: "Regra sem aplicação",
        detail: rule.name || "Regra sem nome",
      });
    }
  });

  const controls = doc.sections.find((s) => s.templateId === "controles");
  if (!controls || controls.content.trim().length < 24) {
    issues.push({
      id: "controle-inexistente",
      severity: "atencao",
      title: "Controle inexistente",
      detail: "Nenhum controle descrito para os riscos do processo.",
    });
  }

  const riscos = doc.sections.find((s) => s.templateId === "riscos");
  if (!riscos || riscos.content.trim().length < 24) {
    issues.push({
      id: "risco-ausente",
      severity: "info",
      title: "Riscos não mapeados",
      detail: "Descreva os riscos para habilitar controles e indicadores.",
    });
  }

  if (rules.length === 0) {
    issues.push({
      id: "sem-regras",
      severity: "info",
      title: "Nenhuma regra de negócio",
      detail: "Regras orientarão os gateways do modelo BPM.",
    });
  }

  return issues;
}

/** Percentual de prontidão do modelo para gerar o BPM. */
export function readinessScore(doc: ProcessDefinition) {
  const issues = analyzeProcess(doc);
  const blocking = issues.filter((i) => i.severity === "erro").length;
  const warnings = issues.filter((i) => i.severity === "atencao").length;
  const penalty = blocking * 14 + warnings * 5;
  const score = Math.max(20, Math.min(100, 100 - penalty));
  return { score, issues, blocking, warnings };
}

export function ProcessConsistencyPanel({ doc }: { doc: ProcessDefinition }) {
  const { score, issues, blocking } = readinessScore(doc);

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Consistência do Processo
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Validação contínua do modelo organizacional.
        </p>
      </div>

      <div className="rounded-xl border bg-card px-3.5 py-3">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            Prontidão para BPM
          </span>
          <span className="text-sm font-semibold tabular-nums">{score}%</span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              blocking > 0 ? "bg-amber-500/70" : "bg-primary",
            )}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      {issues.length === 0 ? (
        <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
          Nenhuma inconsistência encontrada.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {issues.slice(0, 8).map((issue) => {
            const meta = SEVERITY_META[issue.severity];
            const Icon = meta.icon;
            return (
              <li
                key={issue.id}
                className="flex items-start gap-2 rounded-lg border bg-background px-2.5 py-2"
              >
                <Icon className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", meta.tone)} />
                <div className="min-w-0">
                  <p className="text-[11px] font-medium">{issue.title}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {issue.detail}
                  </p>
                </div>
              </li>
            );
          })}
          {issues.length > 8 && (
            <li className="px-1 text-[11px] text-muted-foreground/80">
              +{issues.length - 8} outras observações
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
