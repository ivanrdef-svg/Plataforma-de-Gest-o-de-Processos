import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  Info,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import {
  VALIDATION_TONE,
  readinessLabel,
  validateWorkflow,
  type ValidationIssue,
  type WorkflowValidation,
} from "@/lib/workflow-validation";
import {
  isWorkflowEditable,
  publishWorkflow,
  recordWorkflowValidation,
  type WorkflowDoc,
} from "@/lib/workflow-store";

/**
 * Build 016 — resultado da validação da definição e controle de publicação.
 * A validação é sempre derivada da definição; o registro é apenas memória.
 */
export function WorkflowValidationTab({ doc }: { doc: WorkflowDoc }) {
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const validation = useMemo<WorkflowValidation>(() => validateWorkflow(doc), [doc]);

  const revalidate = () => {
    recordWorkflowValidation(doc.id, {
      status: validation.status,
      errors: validation.errors.length,
      warnings: validation.warnings.length,
    });
    setCheckedAt(new Date().toLocaleTimeString("pt-BR"));
    if (validation.errors.length > 0) {
      toast.error("Validação concluída com erros", {
        description: validation.summary,
      });
    } else {
      toast.success("Validação concluída", { description: validation.summary });
    }
  };

  const publish = () => {
    const result = publishWorkflow(doc.id, {
      status: validation.status,
      errors: validation.errors.length,
      warnings: validation.warnings.length,
    });
    if (result.ok) {
      toast.success("Workflow publicado", {
        description: "A definição está disponível para execução.",
      });
    } else if (result.reason === "immutable") {
      toast.error("Versão já publicada", {
        description: "Crie uma nova versão para publicar alterações.",
      });
    } else {
      toast.error("Publicação bloqueada", {
        description: "Corrija os erros de validação antes de publicar.",
      });
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-sm font-medium">Status de validação</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {readinessLabel(validation, "publicação")} · {validation.summary}
            </p>
            {(checkedAt || doc.validation) && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                Última verificação:{" "}
                {checkedAt ??
                  new Date(doc.validation!.validatedAt).toLocaleString("pt-BR")}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Pill tone={VALIDATION_TONE[validation.status]} size="sm" shape="full">
              {validation.status}
            </Pill>
            <Button size="sm" variant="ghost" className="h-8" onClick={revalidate}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Validar
            </Button>
            <Button
              size="sm"
              className="h-8"
              disabled={!validation.canPublish || !isWorkflowEditable(doc)}
              onClick={publish}
            >
              <BadgeCheck className="mr-1.5 h-3.5 w-3.5" />
              Publicar
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <Stat label="Erros" value={validation.errors.length} tone="destructive" />
          <Stat label="Avisos" value={validation.warnings.length} tone="warning" />
          <Stat
            label="Etapas avaliadas"
            value={doc.steps.length}
            tone="neutral"
          />
        </div>

        {!validation.canPublish && (
          <p className="mt-4 inline-flex items-start gap-1.5 rounded-lg bg-destructive/10 px-3 py-2 text-[11px] text-destructive">
            <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0" />
            Enquanto houver erros, a publicação e o início de novas execuções ficam
            bloqueados. Execuções já em andamento não são afetadas.
          </p>
        )}
      </section>

      <IssueGroup
        title="Erros"
        emptyLabel="Nenhum erro encontrado."
        issues={validation.errors}
      />
      <IssueGroup
        title="Avisos"
        emptyLabel="Nenhum aviso encontrado."
        issues={validation.warnings}
      />

      <section className="rounded-xl border bg-surface/40 p-5">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium">
          <Info className="h-3.5 w-3.5 text-muted-foreground" />
          Informações
        </span>
        <ul className="mt-2 space-y-1">
          {validation.infos.map((info) => (
            <li key={info} className="text-xs text-muted-foreground">
              {info}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "destructive" | "warning" | "neutral";
}) {
  const color =
    tone === "destructive"
      ? "text-destructive"
      : tone === "warning"
        ? "text-amber-600 dark:text-amber-400"
        : "";
  return (
    <div className="rounded-lg border bg-surface/40 px-3 py-2">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <p className={`text-lg font-semibold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

function IssueGroup({
  title,
  issues,
  emptyLabel,
}: {
  title: string;
  issues: ValidationIssue[];
  emptyLabel: string;
}) {
  const isError = title === "Erros";
  return (
    <section className="rounded-xl border bg-card p-5">
      <div className="flex items-center gap-2">
        {isError ? (
          <XCircle className="h-3.5 w-3.5 text-destructive" />
        ) : (
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
        )}
        <h3 className="text-sm font-medium">
          {title}
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {issues.length}
          </span>
        </h3>
      </div>
      {issues.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {issues.map((issue) => (
            <li key={issue.id} className="rounded-lg border bg-surface/40 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium">{issue.title}</span>
                <Pill
                  tone={
                    issue.severity === "erro"
                      ? "bg-destructive/10 text-destructive"
                      : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                  }
                  size="sm"
                  shape="full"
                >
                  {issue.severity}
                </Pill>
                <span className="text-[11px] text-muted-foreground">
                  {issue.location}
                </span>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {issue.description}
              </p>
              <dl className="mt-2 grid gap-1 text-[11px] text-muted-foreground sm:grid-cols-2">
                <div>
                  <dt className="uppercase tracking-wider">Impacto</dt>
                  <dd className="text-foreground/80">{issue.impact}</dd>
                </div>
                <div>
                  <dt className="uppercase tracking-wider">Como corrigir</dt>
                  <dd className="text-foreground/80">{issue.action}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
