import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  ChevronLeft,
  Copy,
  LayoutTemplate,
  Pencil,
  Play,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { WorkspaceLayout } from "@/components/workspace/workspace-layout";
import { WorkspaceMeta } from "@/components/workspace/workspace-meta";
import { EmptyState } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Pill } from "@/components/ui/pill";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  TEMPLATE_STATUS_LABEL,
  TEMPLATE_STATUS_TONE,
} from "@/config/template-model";
import {
  activateTemplate,
  archiveTemplate,
  duplicateTemplate,
  updateTemplate,
  useWorkflowTemplate,
  validateTemplate,
  type WorkflowTemplate,
} from "@/lib/template-store";
import { useWorkflowDocs } from "@/lib/workflow-store";
import { formatTemplateDate } from "@/routes/templates.index";

export const Route = createFileRoute("/templates/$templateId")({
  component: TemplateWorkspace,
  head: () => ({
    meta: [
      { title: "Template — Process Platform" },
      {
        name: "description",
        content:
          "Detalhes do template de workflow: origem, conteúdo resumido, validação e ações de ciclo de vida.",
      },
      { property: "og:title", content: "Template — Process Platform" },
      {
        property: "og:description",
        content:
          "Modelo reutilizável derivado de uma versão publicada de workflow.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function TemplateWorkspace() {
  const { templateId } = Route.useParams();
  const template = useWorkflowTemplate(templateId);
  const workflows = useWorkflowDocs();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);

  if (!template) {
    return (
      <div className="p-10">
          <EmptyState
            icon={<LayoutTemplate className="h-5 w-5" />}
            title="Template não encontrado"
            description="Volte ao Template Center para escolher outro modelo."
        />
      </div>
    );
  }

  const validation = validateTemplate(template);
  const sourceWorkflow = template.sourceWorkflowId
    ? workflows.find((w) => w.id === template.sourceWorkflowId)
    : undefined;
  const usage = workflows.filter(
    (w) => w.templateOrigin?.templateId === template.id,
  ).length;
  const content = template.content;
  const hasSla =
    content.slaAmount !== undefined ||
    content.taskSlaAmount !== undefined ||
    content.steps.some((s) => s.slaAmount !== undefined);

  const onActivate = () => {
    const result = activateTemplate(template.id);
    if (result.ok) {
      toast.success("Template ativado", {
        description: "Já pode ser usado para criar novos workflows.",
      });
      return;
    }
    if (result.reason === "invalid") {
      toast.error("Template inválido", {
        description: `${result.errors ?? 0} erro(s) de validação impedem a ativação.`,
      });
      return;
    }
    toast.error("Não foi possível ativar o template.");
  };

  const onArchive = () => {
    const result = archiveTemplate(template.id);
    if (result.ok) {
      toast.success("Template arquivado", {
        description: "Permanece visível como histórico, sem uso em novos workflows.",
      });
    } else {
      toast.error("Não foi possível arquivar o template.");
    }
  };

  const onDuplicate = () => {
    const copy = duplicateTemplate(template.id);
    if (!copy) {
      toast.error("Não foi possível duplicar o template.");
      return;
    }
    toast.success("Template duplicado", {
      description: "Uma cópia independente foi criada em rascunho.",
    });
    navigate({ to: "/templates/$templateId", params: { templateId: copy.id } });
  };

  return (
    <>
      <WorkspaceLayout
        title={template.name}
        subtitle={template.description}
        meta={
          <WorkspaceMeta
            items={[
              { label: "Tipo", value: "Workflow Template" },
              { label: "Categoria", value: template.category || "—" },
              {
                label: "Status",
                value: (
                  <Pill
                    tone={TEMPLATE_STATUS_TONE[template.status]}
                    size="sm"
                    shape="full"
                  >
                    {TEMPLATE_STATUS_LABEL[template.status]}
                  </Pill>
                ),
              },
              { label: "Etapas", value: String(content.steps.length) },
              { label: "Usos", value: `${usage} workflow(s)` },
              { label: "Atualizado", value: formatTemplateDate(template.updatedAt) },
            ]}
          />
        }
        actions={
          <>
            {template.status === "rascunho" && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8"
                  onClick={() => setEditing(true)}
                >
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                  Editar
                </Button>
                <Button size="sm" className="h-8" onClick={onActivate}>
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                  Ativar
                </Button>
              </>
            )}
            {template.status === "ativo" && (
              <>
                <Button
                  size="sm"
                  className="h-8"
                  onClick={() =>
                    toast("Usar Template", {
                      description:
                        "O fluxo de criação de workflow a partir do template chega na próxima etapa.",
                    })
                  }
                >
                  <Play className="mr-1.5 h-3.5 w-3.5" />
                  Usar Template
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8"
                  onClick={onArchive}
                >
                  <Archive className="mr-1.5 h-3.5 w-3.5" />
                  Arquivar
                </Button>
              </>
            )}
            <Button
              size="sm"
              variant="outline"
              className="h-8"
              onClick={onDuplicate}
            >
              <Copy className="mr-1.5 h-3.5 w-3.5" />
              Duplicar Template
            </Button>
            <Button asChild variant="ghost" size="sm" className="gap-1.5">
              <Link to="/templates">
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Template Center</span>
              </Link>
            </Button>
          </>
        }
      >
        <div className="space-y-6">
          {template.status === "arquivado" && (
            <p className="inline-flex items-start gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
              <Archive className="mt-px h-3.5 w-3.5 shrink-0" />
              Template arquivado — não pode originar novos workflows. A duplicação
              continua disponível e gera um rascunho independente.
            </p>
          )}

          <section className="rounded-xl border bg-card p-5">
            <h2 className="text-sm font-medium">Descrição</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {template.description || "Sem descrição."}
            </p>
            {template.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {template.tags.map((tag) => (
                  <Pill
                    key={tag}
                    tone="bg-primary/10 text-primary"
                    size="sm"
                    shape="full"
                  >
                    {tag}
                  </Pill>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-xl border bg-card p-5">
            <h2 className="text-sm font-medium">Origem</h2>
            {template.sourceWorkflowId ? (
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <p className="text-xs text-muted-foreground">
                  Workflow de origem:{" "}
                  <span className="font-medium text-foreground">
                    {sourceWorkflow?.name ?? "não encontrado"}
                  </span>{" "}
                  · versão V{template.sourceWorkflowVersion ?? "—"}
                </p>
                {sourceWorkflow ? (
                  <Button asChild size="sm" variant="ghost" className="h-8">
                    <Link
                      to="/workflow/$workflowId"
                      params={{ workflowId: sourceWorkflow.id }}
                    >
                      Abrir workflow de origem
                    </Link>
                  </Button>
                ) : (
                  <span className="text-[11px] text-muted-foreground">
                    O workflow de origem não está mais disponível.
                  </span>
                )}
              </div>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">
                Este template não registra um workflow de origem.
              </p>
            )}
          </section>

          <section>
            <h2 className="text-sm font-medium">Conteúdo resumido</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Stat label="Etapas" value={String(content.steps.length)} />
              <Stat
                label="Participantes"
                value={String(content.participants.length)}
              />
              <Stat label="SLA" value={hasSla ? "Configurado" : "Não configurado"} />
            </div>
          </section>

          <section className="rounded-xl border bg-card p-5">
            <h2 className="text-sm font-medium">Validação</h2>
            <p className="mt-1 text-xs text-muted-foreground">{validation.summary}</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <IssueGroup
                title="Erros"
                emptyLabel="Nenhum erro encontrado."
                issues={validation.errors.map((i) => i.title)}
                tone="error"
              />
              <IssueGroup
                title="Avisos"
                emptyLabel="Nenhum aviso encontrado."
                issues={validation.warnings.map((i) => i.title)}
                tone="warning"
              />
            </div>
          </section>

          <section className="rounded-xl border bg-surface/40 p-5">
            <h2 className="text-sm font-medium">Histórico</h2>
            <p className="mt-2 text-xs text-muted-foreground">
              Criado em {formatTemplateDate(template.createdAt)} · Atualizado em{" "}
              {formatTemplateDate(template.updatedAt)}
            </p>
          </section>
        </div>
      </WorkspaceLayout>

      <TemplateEditDialog
        template={template}
        open={editing}
        onOpenChange={setEditing}
      />
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card px-4 py-3">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function IssueGroup({
  title,
  issues,
  emptyLabel,
  tone,
}: {
  title: string;
  issues: string[];
  emptyLabel: string;
  tone: "error" | "warning";
}) {
  const Icon = tone === "error" ? XCircle : AlertTriangle;
  return (
    <div className="rounded-lg border bg-surface/40 p-3">
      <span className="inline-flex items-center gap-1.5 text-xs font-medium">
        <Icon
          className={
            tone === "error"
              ? "h-3.5 w-3.5 text-destructive"
              : "h-3.5 w-3.5 text-amber-500"
          }
        />
        {title}
        <span className="text-muted-foreground">{issues.length}</span>
      </span>
      {issues.length === 0 ? (
        <p className="mt-2 text-[11px] text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {issues.map((issue) => (
            <li key={issue} className="text-[11px] text-muted-foreground">
              {issue}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TemplateEditDialog({
  template,
  open,
  onOpenChange,
}: {
  template: WorkflowTemplate;
  open: boolean;
  onOpenChange: (value: boolean) => void;
}) {
  const [name, setName] = useState(template.name);
  const [description, setDescription] = useState(template.description);
  const [category, setCategory] = useState(template.category);
  const [tags, setTags] = useState(template.tags.join(", "));

  const save = () => {
    const updated = updateTemplate(template.id, {
      name: name.trim() || template.name,
      description: description.trim(),
      category: category.trim() || "Geral",
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    });
    if (!updated) {
      toast.error("Somente templates em rascunho podem ser editados.");
      return;
    }
    toast.success("Template atualizado");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar template</DialogTitle>
          <DialogDescription>
            Apenas os metadados do template são editáveis. O conteúdo é um snapshot
            congelado da versão publicada de origem.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="tpl-name">Nome</Label>
            <Input
              id="tpl-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tpl-desc">Descrição</Label>
            <Textarea
              id="tpl-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tpl-cat">Categoria</Label>
            <Input
              id="tpl-cat"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tpl-tags">Tags (separadas por vírgula)</Label>
            <Input
              id="tpl-tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={save}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
