import { useState } from "react";
import {
  CalendarClock,
  Gavel,
  PenLine,
  Send,
  ShieldAlert,
  ShieldCheck,
  UserCog,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ApprovalBadge,
  ComplianceBadge,
  ControlStatusBadge,
  CriticalityBadge,
  ResponsibilityBadge,
  ReviewSituationBadge,
  RiskStatusBadge,
} from "@/components/governance/governance-badges";
import { GovernanceTimeline } from "@/components/governance/governance-timeline";
import { LifecycleBadge } from "@/components/lifecycle/lifecycle-badge";
import {
  COMPLIANCE_STATUSES,
  CRITICALITY_LEVELS,
  criticalityStyle,
  RESPONSIBILITY_ROLES,
  reviewSituationFor,
  type ComplianceStatus,
  type CriticalityLevel,
} from "@/config/governance-model";
import {
  addGovernanceNote,
  governanceHealth,
  registerApproval,
  registerReview,
  requestApproval,
  requestReview,
  setComplianceStatus,
  setCriticality,
  setResponsibility,
  useGovernance,
  type GovernanceSeed,
} from "@/lib/governance-store";
import { useLifecycle, type LifecycleSeed } from "@/lib/lifecycle-store";
import { cn } from "@/lib/utils";

/**
 * Build 010 — aba "Governança" dos Workspaces.
 *
 * Não duplica a estrutura de Workspace: é apenas o conteúdo de uma aba do
 * `WorkspaceLayout` já existente. Consome o Lifecycle Engine (estado do ativo)
 * e o Relationship Engine (riscos, controles e normas vinculados).
 */

function formatDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime()) || !iso) return "—";
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function Block({
  icon: Icon,
  title,
  description,
  action,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-card">
      <header className="flex items-start justify-between gap-3 border-b px-4 py-3">
        <div className="flex items-start gap-2">
          <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <h3 className="text-sm font-medium">{title}</h3>
            {description && (
              <p className="mt-0.5 text-[11px] text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        {action}
      </header>
      <div className="px-4 py-3">{children}</div>
    </section>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <div className="mt-0.5 text-sm">{value}</div>
    </div>
  );
}

export function GovernanceTab({
  seed,
  lifecycleSeed,
}: {
  seed: GovernanceSeed;
  lifecycleSeed: LifecycleSeed;
}) {
  const record = useGovernance(seed);
  const lifecycle = useLifecycle(lifecycleSeed);
  const health = governanceHealth(record);
  const situation = reviewSituationFor(record.review.nextAt);
  const [note, setNote] = useState("");
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [roleValue, setRoleValue] = useState("");

  const criticality = criticalityStyle(record.criticality);

  return (
    <div className="space-y-6">
      {/* Visão rápida: o que precisa da minha atenção? */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Criticidade",
            value: <CriticalityBadge level={record.criticality} />,
            hint: criticality.description,
          },
          {
            label: "Revisão",
            value: <ReviewSituationBadge situation={situation} />,
            hint: `Próxima em ${formatDate(record.review.nextAt)}`,
          },
          {
            label: "Aprovação",
            value: <ApprovalBadge status={record.approval.status} />,
            hint: record.approval.approver,
          },
          {
            label: "Estado do ativo",
            value: <LifecycleBadge state={lifecycle.state} />,
            hint: "Definido pelo ciclo de vida",
          },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border bg-card px-4 py-3">
            <p className="text-[11px] text-muted-foreground">{item.label}</p>
            <div className="mt-1.5">{item.value}</div>
            <p className="mt-1.5 truncate text-[11px] text-muted-foreground">{item.hint}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-card px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] text-muted-foreground">Saúde da governança</p>
          <span className="text-sm font-semibold tracking-tight">{health.score}%</span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              health.score >= 75
                ? "bg-emerald-500"
                : health.score >= 45
                  ? "bg-amber-500"
                  : "bg-red-500",
            )}
            style={{ width: `${health.score}%` }}
          />
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          {health.pendingCompliance} pendência(s) de conformidade · {health.criticalRisks}{" "}
          risco(s) de alta criticidade
        </p>
      </div>

      {/* Ações contextuais */}
      <Block
        icon={Send}
        title="Ações de governança"
        description="Comportamento simulado nesta Build — a execução caberá ao Workflow."
      >
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              className="h-8 text-xs"
              onClick={() => {
                requestReview(seed, note);
                setNote("");
                toast.success("Revisão solicitada", {
                  description: `Enviada a ${record.review.reviewer}.`,
                });
              }}
            >
              <CalendarClock className="mr-1.5 h-3.5 w-3.5" />
              Solicitar revisão
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={() => {
                registerReview(seed, note);
                setNote("");
                toast.success("Revisão registrada");
              }}
            >
              <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
              Registrar revisão
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={() => {
                requestApproval(seed, note);
                setNote("");
                toast.success("Aprovação solicitada", {
                  description: `Enviada a ${record.approval.approver}.`,
                });
              }}
            >
              <Gavel className="mr-1.5 h-3.5 w-3.5" />
              Solicitar aprovação
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={() => {
                registerApproval(seed, note);
                setNote("");
                toast.success("Aprovação registrada");
              }}
            >
              <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
              Registrar aprovação
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={() => {
                if (!note.trim()) {
                  toast.info("Escreva uma observação antes de registrar.");
                  return;
                }
                addGovernanceNote(seed, note);
                setNote("");
                toast.success("Observação registrada");
              }}
            >
              <PenLine className="mr-1.5 h-3.5 w-3.5" />
              Registrar observação
            </Button>
          </div>
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Observação para a auditoria (opcional)"
            className="min-h-[64px] text-xs"
          />
        </div>
      </Block>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Responsabilidades */}
        <Block
          icon={UserCog}
          title="Responsabilidades"
          description="Quem responde por este ativo — pessoa, cargo ou área."
        >
          <ul className="divide-y">
            {record.responsibilities.map((item) => {
              const editing = editingRole === item.role;
              return (
                <li key={item.id} className="flex items-center gap-3 py-2 first:pt-0">
                  <div className="w-[104px] shrink-0">
                    <ResponsibilityBadge role={item.role} />
                  </div>
                  <div className="min-w-0 flex-1">
                    {editing ? (
                      <div className="flex gap-2">
                        <Input
                          autoFocus
                          value={roleValue}
                          onChange={(e) => setRoleValue(e.target.value)}
                          className="h-7 text-xs"
                          aria-label={`Responsável ${item.role}`}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              setResponsibility(seed, item.role, roleValue);
                              setEditingRole(null);
                              toast.success(`${item.role} atualizado`);
                            }
                            if (e.key === "Escape") setEditingRole(null);
                          }}
                        />
                        <Button
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => {
                            setResponsibility(seed, item.role, roleValue);
                            setEditingRole(null);
                            toast.success(`${item.role} atualizado`);
                          }}
                        >
                          Salvar
                        </Button>
                      </div>
                    ) : (
                      <>
                        <p className="truncate text-sm">{item.name}</p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {item.scope} · {item.detail}
                        </p>
                      </>
                    )}
                  </div>
                  {!editing && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 shrink-0 text-[11px]"
                      onClick={() => {
                        setEditingRole(item.role);
                        setRoleValue(item.name);
                      }}
                    >
                      Alterar
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-[11px] text-muted-foreground">
            {RESPONSIBILITY_ROLES.Owner.description}
          </p>
        </Block>

        {/* Criticidade + revisão + aprovação */}
        <div className="space-y-6">
          <Block
            icon={ShieldAlert}
            title="Criticidade"
            description="Classificação de impacto do ativo na organização."
          >
            <div className="flex flex-wrap gap-2">
              {CRITICALITY_LEVELS.map((level: CriticalityLevel) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => {
                    setCriticality(seed, level);
                    toast.success(`Criticidade: ${level}`);
                  }}
                  className={cn(
                    "rounded-full border px-3 py-1 text-[11px] font-medium capitalize transition-colors",
                    record.criticality === level
                      ? "border-transparent " + criticalityStyle(level).tone
                      : "text-muted-foreground hover:bg-muted/60",
                  )}
                  aria-pressed={record.criticality === level}
                >
                  {level}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              {criticality.description}
            </p>
          </Block>

          <Block icon={CalendarClock} title="Revisão">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Última revisão" value={formatDate(record.review.lastAt)} />
              <Field label="Próxima revisão" value={formatDate(record.review.nextAt)} />
              <Field label="Periodicidade" value={record.review.periodicity} />
              <Field label="Responsável" value={record.review.reviewer} />
            </div>
            <div className="mt-3">
              <ReviewSituationBadge situation={situation} />
            </div>
          </Block>

          <Block icon={Gavel} title="Aprovação">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Aprovador atual" value={record.approval.approver} />
              <Field
                label="Status"
                value={<ApprovalBadge status={record.approval.status} />}
              />
              <Field label="Data da aprovação" value={formatDate(record.approval.approvedAt)} />
              <Field label="Próxima aprovação" value={formatDate(record.approval.nextAt)} />
            </div>
          </Block>
        </div>
      </div>

      {/* Conformidade */}
      <Block
        icon={ShieldCheck}
        title="Conformidade"
        description="Normas, políticas, regulamentos, requisitos e frameworks aplicáveis."
      >
        <ul className="divide-y">
          {record.compliance.map((item) => (
            <li key={item.id} className="flex items-center gap-3 py-2.5 first:pt-0">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{item.name}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {item.kind} · {item.requirement}
                </p>
              </div>
              <ComplianceBadge status={item.status} />
              <Select
                value={item.status}
                onValueChange={(value) =>
                  setComplianceStatus(seed, item.id, value as ComplianceStatus)
                }
              >
                <SelectTrigger
                  className="h-7 w-[132px] shrink-0 text-[11px]"
                  aria-label={`Status de ${item.name}`}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMPLIANCE_STATUSES.map((status) => (
                    <SelectItem key={status} value={status} className="text-xs capitalize">
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </li>
          ))}
        </ul>
      </Block>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Riscos */}
        <Block
          icon={ShieldAlert}
          title="Riscos relacionados"
          description="Preparação da experiência; o Risk Engine virá em Build futura."
        >
          <ul className="space-y-3">
            {record.risks.map((risk) => (
              <li key={risk.id} className="rounded-lg border bg-background p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 flex-1 truncate text-sm font-medium">{risk.name}</p>
                  <CriticalityBadge level={risk.criticality} size="sm" />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{risk.description}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <RiskStatusBadge status={risk.status} />
                  <span className="text-[11px] text-muted-foreground">
                    Controle: {risk.control}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </Block>

        {/* Controles */}
        <Block
          icon={ShieldCheck}
          title="Controles relacionados"
          description="Controles internos vinculados aos riscos deste ativo."
        >
          <ul className="space-y-3">
            {record.controls.map((control) => (
              <li key={control.id} className="rounded-lg border bg-background p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 flex-1 truncate text-sm font-medium">
                    {control.name}
                  </p>
                  <ControlStatusBadge status={control.status} />
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {control.type} · {control.owner} · {control.periodicity}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Risco: {control.risk}
                </p>
              </li>
            ))}
          </ul>
        </Block>
      </div>

      <Separator />

      {/* Auditoria */}
      <div>
        <h3 className="mb-1 text-sm font-semibold">Auditoria de governança</h3>
        <p className="mb-5 text-xs text-muted-foreground">
          Criação, revisões, aprovações e alterações de responsável, criticidade e
          conformidade.
        </p>
        <GovernanceTimeline events={record.events} />
      </div>
    </div>
  );
}

/** Resumo compacto de governança para o painel lateral do Workspace. */
export function GovernancePanel({ seed }: { seed: GovernanceSeed }) {
  const record = useGovernance(seed);
  const health = governanceHealth(record);
  const situation = reviewSituationFor(record.review.nextAt);
  const owner = record.responsibilities.find((r) => r.role === "Owner");

  return (
    <section className="space-y-3">
      <header className="flex items-center gap-2">
        <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Governança
        </h3>
      </header>
      <div className="space-y-2 rounded-lg border bg-background p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <CriticalityBadge level={record.criticality} size="sm" />
          <ReviewSituationBadge situation={situation} />
        </div>
        <p className="text-[11px] text-muted-foreground">
          Owner: <span className="text-foreground">{owner?.name ?? "—"}</span>
        </p>
        <p className="text-[11px] text-muted-foreground">
          Aprovador: <span className="text-foreground">{record.approval.approver}</span>
        </p>
        <p className="text-[11px] text-muted-foreground">
          Saúde da governança: {health.score}%
        </p>
      </div>
    </section>
  );
}
