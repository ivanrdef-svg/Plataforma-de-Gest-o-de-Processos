import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Check,
  Circle,
  Lock,
  ShieldCheck,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  IMMUTABLE_PUBLICATION_MESSAGE,
  IMPACT_DESCRIPTION,
  IMPACT_LEVELS,
  IMPACT_TONE,
  NOT_INFORMED,
  READINESS_TONE,
  type ImpactLevel,
} from "@/config/publication-model";
import { VERSION_TONE } from "@/config/workflow-version";
import {
  publicationReadiness,
  type ChecklistItem,
} from "@/lib/publication-readiness";
import { validateWorkflow } from "@/lib/workflow-validation";
import {
  isWorkflowEditable,
  publishWorkflow,
  setWorkflowChangeSummary,
  setWorkflowImpactLevel,
  type WorkflowDoc,
} from "@/lib/workflow-store";
import { cn } from "@/lib/utils";

/**
 * Build 018 — Publication Governance.
 *
 * A aba Validação responde "existem erros?"; esta aba transforma esse
 * resultado em uma decisão operacional de publicação: prontidão derivada,
 * checklist, contexto declarado (resumo e impacto) e confirmação explícita.
 */

const TAB_LABEL: Record<ChecklistItem["tab"], string> = {
  etapas: "Etapas",
  regras: "Regras",
  resumo: "Resumo",
  validacao: "Validação",
  versoes: "Versões",
};

/** Leva o usuário ao contexto de correção já existente (aba do workspace). */
function goToTab(label: string) {
  if (typeof document === "undefined") return;
  const tabs = Array.from(document.querySelectorAll<HTMLElement>('[role="tab"]'));
  tabs.find((t) => t.textContent?.trim() === label)?.click();
}

export function WorkflowPublicationTab({ doc }: { doc: WorkflowDoc }) {
  const readiness = useMemo(
    () => publicationReadiness(doc, validateWorkflow(doc)),
    [doc],
  );
  const editable = isWorkflowEditable(doc);
  const version = readiness.version;
  const [open, setOpen] = useState(false);

  const changeSummary = version?.changeSummary ?? "";
  const impactLevel = version?.impactLevel;
  const publication = version?.publication;

  const confirmPublish = () => {
    const result = publishWorkflow(doc.id);
    setOpen(false);
    if (result.ok) {
      toast.success(`Versão ${result.version} publicada`, {
        description: "A versão está congelada e disponível para novas execuções.",
      });
      return;
    }
    if (result.reason === "immutable") {
      toast.error("Versão já publicada", {
        description: "Crie uma nova versão para publicar alterações.",
      });
    } else if (result.reason === "invalid") {
      toast.error("Publicação bloqueada", {
        description: `${result.errors ?? 0} erro(s) de validação impedem a publicação.`,
      });
    } else {
      toast.error("Não foi possível publicar esta versão.");
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Prontidão ------------------------------------------------ */}
      <section className="rounded-xl border bg-card p-5" aria-labelledby="readiness-title">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 id="readiness-title" className="text-sm font-medium">
              Prontidão para publicação
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">{readiness.hint}</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Pill tone={READINESS_TONE[readiness.state]} size="sm" shape="full">
              {readiness.state}
            </Pill>
            {version && (
              <Pill tone={VERSION_TONE[version.status]} size="sm" shape="full">
                V{version.number} · {version.status}
              </Pill>
            )}
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <Stat label="Erros" value={readiness.errors} tone="destructive" />
          <Stat label="Avisos" value={readiness.warnings} tone="warning" />
          <Stat label="Etapas" value={doc.steps.length} tone="neutral" />
        </div>

        <dl className="mt-4 grid gap-2 text-[11px] text-muted-foreground sm:grid-cols-3">
          <div>
            <dt className="uppercase tracking-wider">Responsável</dt>
            <dd className="text-foreground/80">{doc.owner || NOT_INFORMED}</dd>
          </div>
          <div>
            <dt className="uppercase tracking-wider">Área</dt>
            <dd className="text-foreground/80">{doc.area || NOT_INFORMED}</dd>
          </div>
          <div>
            <dt className="uppercase tracking-wider">Processo de origem</dt>
            <dd className="text-foreground/80">{doc.processName || NOT_INFORMED}</dd>
          </div>
        </dl>
      </section>

      {/* 2. Checklist ------------------------------------------------ */}
      <section className="rounded-xl border bg-card p-5" aria-labelledby="checklist-title">
        <h3 id="checklist-title" className="text-sm font-medium">
          Checklist de publicação
        </h3>
        <ul className="mt-3 space-y-2">
          {readiness.checklist.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-lg border bg-surface/40 p-3"
            >
              <div className="flex min-w-0 gap-2">
                <ChecklistIcon status={item.status} />
                <div className="min-w-0">
                  <p className="text-xs font-medium">{item.label}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {item.detail}
                  </p>
                </div>
              </div>
              {item.status !== "ok" && item.status !== "neutro" && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 shrink-0 text-[11px]"
                  aria-label={`Abrir a aba ${TAB_LABEL[item.tab]} para corrigir ${item.label}`}
                  onClick={() => goToTab(TAB_LABEL[item.tab])}
                >
                  {TAB_LABEL[item.tab]}
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* 3/4. Contexto declarado ------------------------------------- */}
      <section className="rounded-xl border bg-card p-5" aria-labelledby="context-title">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 id="context-title" className="text-sm font-medium">
              Contexto da versão
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Registro humano do que mudou. Preservado na versão publicada e
              somente leitura depois disso.
            </p>
          </div>
          {!editable && (
            <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Lock className="h-3.5 w-3.5" />
              Versão imutável
            </span>
          )}
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="change-summary"
              className="text-[11px] uppercase tracking-wider text-muted-foreground"
            >
              Resumo das alterações
            </label>
            {editable ? (
              <Textarea
                id="change-summary"
                value={changeSummary}
                rows={3}
                className="mt-1.5 text-sm"
                placeholder="Ex.: Atualização do fluxo de aprovação para incluir análise jurídica."
                onChange={(e) => setWorkflowChangeSummary(doc.id, e.target.value)}
              />
            ) : (
              <p className="mt-1.5 text-sm text-foreground/80">
                {changeSummary || publication?.changeSummary || NOT_INFORMED}
              </p>
            )}
          </div>

          <div>
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Nível de impacto
            </span>
            {editable ? (
              <div
                className="mt-1.5 grid gap-2 sm:grid-cols-3"
                role="radiogroup"
                aria-label="Nível de impacto da versão"
              >
                {IMPACT_LEVELS.map((level) => (
                  <button
                    key={level}
                    type="button"
                    role="radio"
                    aria-checked={impactLevel === level}
                    onClick={() => setWorkflowImpactLevel(doc.id, level)}
                    className={cn(
                      "rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      impactLevel === level
                        ? "border-primary/50 bg-primary/5"
                        : "hover:border-primary/30",
                    )}
                  >
                    <span className="text-xs font-medium capitalize">{level}</span>
                    <span className="mt-1 block text-[11px] leading-relaxed text-muted-foreground">
                      {IMPACT_DESCRIPTION[level]}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-1.5 text-sm capitalize text-foreground/80">
                {impactLevel ?? publication?.impactLevel ?? NOT_INFORMED}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* 5/6. Resumo e ação ------------------------------------------ */}
      <section className="rounded-xl border bg-card p-5" aria-labelledby="summary-title">
        <h3 id="summary-title" className="text-sm font-medium">
          Resumo da publicação
        </h3>
        <dl className="mt-3 grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Workflow" value={doc.name} />
          <Field label="Versão" value={version ? `V${version.number}` : NOT_INFORMED} />
          <Field label="Status" value={readiness.state} />
          <Field label="Validação" value={readiness.validation.status} />
          <Field label="Avisos" value={String(readiness.warnings)} />
          <Field
            label="Impacto"
            value={impactLevel ?? publication?.impactLevel ?? NOT_INFORMED}
          />
          <div className="sm:col-span-2 lg:col-span-3">
            <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Alterações
            </dt>
            <dd className="mt-0.5 text-foreground/80">
              {changeSummary || publication?.changeSummary || NOT_INFORMED}
            </dd>
          </div>
        </dl>

        {readiness.warnings > 0 && readiness.canPublish && (
          <p className="mt-4 inline-flex items-start gap-1.5 rounded-lg bg-amber-500/10 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-400">
            <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
            Esta versão está tecnicamente válida, mas possui {readiness.warnings}{" "}
            aviso(s). A publicação é permitida mediante confirmação.
          </p>
        )}
        {!readiness.canPublish && (
          <p className="mt-4 inline-flex items-start gap-1.5 rounded-lg bg-destructive/10 px-3 py-2 text-[11px] text-destructive">
            <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0" />
            {readiness.errors} erro(s) de validação impedem a publicação desta
            versão.
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            className="h-8"
            disabled={!editable || !readiness.canPublish}
            aria-label="Publicar versão"
            onClick={() => setOpen(true)}
          >
            <BadgeCheck className="mr-1.5 h-3.5 w-3.5" />
            Publicar versão
          </Button>
          {!editable && (
            <span className="text-[11px] text-muted-foreground">
              Esta versão já foi publicada ou arquivada. Crie uma nova versão para
              publicar alterações.
            </span>
          )}
        </div>
      </section>

      {/* Trilha da publicação (após publicar) ------------------------ */}
      {publication && (
        <section className="rounded-xl border bg-surface/40 p-5">
          <h3 className="text-sm font-medium">Registro da publicação</h3>
          <dl className="mt-3 grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Versão" value={`V${publication.version}`} />
            <Field
              label="Publicada em"
              value={new Date(publication.publishedAt).toLocaleString("pt-BR")}
            />
            <Field label="Validação" value={publication.validationStatus} />
            <Field label="Avisos" value={String(publication.warnings)} />
            <Field label="Impacto" value={publication.impactLevel ?? NOT_INFORMED} />
            <Field
              label="Resumo"
              value={publication.changeSummary || NOT_INFORMED}
            />
          </dl>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Responsável pela publicação não identificado — não há autenticação
            nesta versão do produto.
          </p>
        </section>
      )}

      {/* 10. Confirmação --------------------------------------------- */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Publicar a versão {version ? version.number : ""} deste Workflow
            </DialogTitle>
            <DialogDescription>
              Você está prestes a publicar a versão{" "}
              {version ? version.number : "atual"} de “{doc.name}”.
            </DialogDescription>
          </DialogHeader>

          <dl className="grid gap-3 text-xs sm:grid-cols-2">
            <Field label="Versão" value={version ? `V${version.number}` : "—"} />
            <Field label="Status" value={readiness.state} />
            <Field label="Impacto" value={impactLevel ?? NOT_INFORMED} />
            <Field label="Avisos" value={String(readiness.warnings)} />
            <div className="sm:col-span-2">
              <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Resumo das alterações
              </dt>
              <dd className="mt-0.5 text-foreground/80">
                {changeSummary || NOT_INFORMED}
              </dd>
            </div>
          </dl>

          {readiness.warnings > 0 && (
            <p className="inline-flex items-start gap-1.5 rounded-lg bg-amber-500/10 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-400">
              <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
              Esta versão possui avisos de validação.
            </p>
          )}

          <p className="text-[11px] text-muted-foreground">
            {IMMUTABLE_PUBLICATION_MESSAGE}
          </p>

          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={confirmPublish}>
              <BadgeCheck className="mr-1.5 h-3.5 w-3.5" />
              Publicar versão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ChecklistIcon({ status }: { status: ChecklistItem["status"] }) {
  if (status === "ok")
    return (
      <Check
        className="mt-px h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400"
        aria-label="Conforme"
      />
    );
  if (status === "erro")
    return (
      <X className="mt-px h-3.5 w-3.5 shrink-0 text-destructive" aria-label="Com erros" />
    );
  if (status === "atenção")
    return (
      <AlertTriangle
        className="mt-px h-3.5 w-3.5 shrink-0 text-amber-500"
        aria-label="Com avisos"
      />
    );
  return (
    <Circle
      className="mt-px h-3.5 w-3.5 shrink-0 text-muted-foreground"
      aria-label="Não aplicável"
    />
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 truncate capitalize text-foreground/80" title={value}>
        {value}
      </dd>
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
      <p className={cn("text-lg font-semibold tabular-nums", color)}>{value}</p>
    </div>
  );
}

/** Pill de impacto reutilizada por outras superfícies (Versões). */
export function ImpactPill({ level }: { level?: ImpactLevel }) {
  if (!level) return null;
  return (
    <Pill tone={IMPACT_TONE[level]} size="sm" shape="full">
      impacto {level}
    </Pill>
  );
}
