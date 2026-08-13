import { useMemo } from "react";
import { Archive, GitBranch, Lock, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import {
  IMMUTABLE_VERSION_MESSAGE,
  VERSION_HINT,
  VERSION_TONE,
} from "@/config/workflow-version";
import {
  archiveWorkflowVersion,
  createWorkflowVersion,
  currentWorkflowVersion,
  isWorkflowEditable,
  publishedWorkflowVersion,
  workflowVersions,
  type WorkflowDoc,
} from "@/lib/workflow-store";
import { useWorkflowInstances } from "@/lib/runtime-store";
import { cn } from "@/lib/utils";

/**
 * Build 017 — histórico e administração das versões de um Workflow.
 *
 * Rascunho pode ser editado; versão publicada é imutável; alterações
 * posteriores acontecem sobre uma nova versão. Nada aqui altera o Lifecycle
 * Engine nem a Validação — são dimensões independentes.
 */

function formatWhen(iso?: string) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function newVersionMessage(reason: "draft-exists" | "no-published" | "not-found") {
  switch (reason) {
    case "draft-exists":
      return "Já existe uma versão em edição.";
    case "no-published":
      return "Publique a versão atual antes de criar uma nova.";
    default:
      return "Workflow não encontrado.";
  }
}

export function createVersionWithFeedback(doc: WorkflowDoc) {
  const result = createWorkflowVersion(doc.id);
  if (!result.ok) {
    toast.error("Nova versão não criada", {
      description: newVersionMessage(result.reason),
    });
    return;
  }
  toast.success(`Versão ${result.version.number} criada`, {
    description: "Cópia independente da versão anterior, pronta para edição.",
  });
}

export function WorkflowVersions({ doc }: { doc: WorkflowDoc }) {
  const versions = useMemo(() => workflowVersions(doc), [doc]);
  const current = currentWorkflowVersion(doc);
  const published = publishedWorkflowVersion(doc);
  const editable = isWorkflowEditable(doc);
  const instances = useWorkflowInstances().filter((i) => i.workflowId === doc.id);

  return (
    <div className="space-y-6">
      <section className="rounded-xl border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-sm font-medium">Versões da definição</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {current
                ? `${VERSION_HINT[current.status]}`
                : "Nenhuma versão registrada."}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-8"
            aria-label="Criar nova versão"
            disabled={editable}
            onClick={() => createVersionWithFeedback(doc)}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Nova versão
          </Button>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <Stat label="Versões" value={String(versions.length)} />
          <Stat
            label="Versão atual"
            value={current ? `V${current.number} · ${current.status}` : "—"}
          />
          <Stat
            label="Publicada vigente"
            value={published ? `V${published.number}` : "Nenhuma"}
          />
        </div>

        {!editable && (
          <p className="mt-4 inline-flex items-start gap-1.5 rounded-lg bg-muted px-3 py-2 text-[11px] text-muted-foreground">
            <Lock className="mt-px h-3.5 w-3.5 shrink-0" />
            {IMMUTABLE_VERSION_MESSAGE} Crie uma nova versão para alterar etapas,
            regras, aprovações, decisões, prazos ou responsáveis.
          </p>
        )}
      </section>

      <ol className="space-y-3">
        {[...versions].reverse().map((v) => {
          const isCurrent = v.number === current?.number;
          const executions = instances.filter(
            (i) => (i.workflowVersion ?? 1) === v.number,
          ).length;
          return (
            <li
              key={v.versionId}
              className={cn(
                "rounded-xl border bg-card p-4",
                isCurrent && "border-primary/40",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium">
                      <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
                      Versão {v.number}
                    </span>
                    <Pill tone={VERSION_TONE[v.status]} size="sm" shape="full">
                      {v.status}
                    </Pill>
                    {isCurrent && (
                      <Pill tone="bg-primary/10 text-primary" size="sm" shape="full">
                        atual
                      </Pill>
                    )}
                    {v.validation && (
                      <Pill tone="bg-muted text-muted-foreground" size="sm">
                        {v.validation.status}
                      </Pill>
                    )}
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">{v.summary}</p>
                  <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-muted-foreground">
                    <div className="flex gap-1">
                      <dt>Criada:</dt>
                      <dd>{formatWhen(v.createdAt)}</dd>
                    </div>
                    <div className="flex gap-1">
                      <dt>Publicada:</dt>
                      <dd>{formatWhen(v.publishedAt)}</dd>
                    </div>
                    {v.archivedAt && (
                      <div className="flex gap-1">
                        <dt>Arquivada:</dt>
                        <dd>{formatWhen(v.archivedAt)}</dd>
                      </div>
                    )}
                    <div className="flex gap-1">
                      <dt>Execuções:</dt>
                      <dd>{executions}</dd>
                    </div>
                  </dl>
                </div>
                {v.status === "publicada" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8"
                    aria-label={`Arquivar versão ${v.number}`}
                    onClick={() => {
                      const r = archiveWorkflowVersion(doc.id, v.number);
                      if (r.ok) {
                        toast.success(`Versão ${v.number} arquivada`, {
                          description:
                            "Novas execuções bloqueadas. As execuções existentes seguem normais.",
                        });
                      } else {
                        toast.error("Não foi possível arquivar esta versão.");
                      }
                    }}
                  >
                    <Archive className="mr-1.5 h-3.5 w-3.5" />
                    Arquivar
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 truncate text-xs font-medium capitalize">{value}</p>
    </div>
  );
}
