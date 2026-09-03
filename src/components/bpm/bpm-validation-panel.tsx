import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import type { BpmIssue } from "@/config/bpm-model";
import type { BpmValidation } from "@/lib/bpm-validation";
import { cn } from "@/lib/utils";

/**
 * Build 021 — Painel de validação do BPMN.
 *
 * Puramente apresentacional: recebe o resultado já calculado por
 * `validateBpmn` no `BpmDesigner` e não conhece nenhuma regra.
 */

export function BpmIssueRow({
  issue,
  onSelectNode,
  onSelectEdge,
  compact,
}: {
  issue: BpmIssue;
  onSelectNode?: ((nodeId: string) => void) | undefined;
  onSelectEdge?: ((edgeId: string) => void) | undefined;
  compact?: boolean | undefined;
}) {
  const isError = issue.severity === "erro";
  const Icon = isError ? XCircle : AlertTriangle;

  return (
    <li className="flex items-start gap-2 rounded-md border bg-background px-2 py-1.5">
      <Icon
        aria-hidden
        className={cn(
          "mt-[2px] h-3.5 w-3.5 shrink-0",
          isError ? "text-destructive" : "text-amber-600 dark:text-amber-400",
        )}
      />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-[11px] leading-snug">
          <span
            className={cn(
              "mr-1 font-medium",
              isError ? "text-destructive" : "text-amber-700 dark:text-amber-400",
            )}
          >
            {isError ? "Erro:" : "Atenção:"}
          </span>
          {issue.message}
        </p>
        {!compact && (issue.nodeId || issue.edgeId) && (
          <div className="flex flex-wrap gap-1">
            {issue.nodeId && onSelectNode && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-6 px-2 text-[10px]"
                onClick={() => onSelectNode(issue.nodeId as string)}
              >
                Ver elemento
              </Button>
            )}
            {issue.edgeId && onSelectEdge && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-6 px-2 text-[10px]"
                onClick={() => onSelectEdge(issue.edgeId as string)}
              >
                Ver conexão
              </Button>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

export function BpmValidationPanel({
  validation,
  onSelectNode,
  onSelectEdge,
}: {
  validation: BpmValidation;
  onSelectNode: (nodeId: string) => void;
  onSelectEdge: (edgeId: string) => void;
}) {
  const clean = !validation.errors.length && !validation.warnings.length;

  return (
    <section
      aria-label="Validação do modelo BPMN"
      className="rounded-xl border bg-card px-3 py-2.5"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-xs font-medium">Validação do modelo</h3>
        <p className="text-[11px] text-muted-foreground">{validation.summary}</p>
      </div>

      <div className="mt-2 max-h-48 space-y-1.5 overflow-y-auto pr-1">
        {clean && (
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <CheckCircle2 aria-hidden className="h-3.5 w-3.5 text-emerald-600" />
            Nenhum erro ou atenção no diagrama.
          </p>
        )}

        {!!validation.errors.length && (
          <ul className="space-y-1.5">
            {validation.errors.map((issue) => (
              <BpmIssueRow
                key={issue.id}
                issue={issue}
                onSelectNode={onSelectNode}
                onSelectEdge={onSelectEdge}
              />
            ))}
          </ul>
        )}

        {!!validation.warnings.length && (
          <ul className="space-y-1.5">
            {validation.warnings.map((issue) => (
              <BpmIssueRow
                key={issue.id}
                issue={issue}
                onSelectNode={onSelectNode}
                onSelectEdge={onSelectEdge}
              />
            ))}
          </ul>
        )}

        {!!validation.infos.length && (
          <ul className="space-y-1 pt-1">
            {validation.infos.map((info) => (
              <li
                key={info}
                className="flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground"
              >
                <Info aria-hidden className="mt-[2px] h-3 w-3 shrink-0" />
                {info}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export function BpmValidationStatusPills({ validation }: { validation: BpmValidation }) {
  const statusLabel =
    validation.status === "inválido"
      ? "Modelo requer correções"
      : validation.status === "válido com avisos"
        ? "Modelo válido com atenções"
        : "Modelo BPMN válido";

  const tone =
    validation.status === "inválido"
      ? "bg-destructive/10 text-destructive"
      : validation.status === "válido com avisos"
        ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
        : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";

  const Icon =
    validation.status === "inválido"
      ? XCircle
      : validation.status === "válido com avisos"
        ? AlertTriangle
        : CheckCircle2;

  return (
    <div className="flex items-center gap-1.5">
      <Pill tone={tone} shape="full" size="md" icon={Icon} gap="gap-1.5">
        {statusLabel}
      </Pill>
      <Pill tone="bg-muted text-muted-foreground" shape="full" size="md" title="Erros no diagrama">
        {validation.errors.length} erro(s)
      </Pill>
      <Pill tone="bg-muted text-muted-foreground" shape="full" size="md" title="Avisos no diagrama">
        {validation.warnings.length} aviso(s)
      </Pill>
    </div>
  );
}
