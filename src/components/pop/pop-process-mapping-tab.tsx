/**
 * Build 029 — Etapa 3: UI de mapeamento Seção de POP ↔ Etapa de Processo.
 *
 * A UI apenas orquestra: `suggestPopProcessStepMappings` (server function) para
 * gerar sugestões e os mutadores do store para persistir. Nenhuma regra de
 * domínio vive aqui — a única lógica local é de apresentação (faixas de
 * confiança), deliberadamente fora do domínio.
 *
 * Decisões de UX registradas:
 *  - "Alterar" chama apenas `updateMappingTarget`; a confirmação continua sendo
 *    um clique separado em "Confirmar" (o registro permanece "sugerido").
 *  - Mapeamentos "rejeitado" ficam ocultos por padrão, com um alternador
 *    discreto para exibi-los esmaecidos e sem ações.
 *  - "Rejeitar" não pede confirmação (é reversível por reanálise);
 *    "Remover" (relação confirmada) usa AlertDialog.
 */
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { Separator } from "@/components/ui/separator";
import { SelectProcessStepDialog } from "@/components/pop/select-process-step-dialog";
import type { PopDoc } from "@/lib/pop-store";
import type { ProcessDoc, ProcessStep } from "@/lib/process-store";
import type { PopProcessStepMapping } from "@/config/pop-process-step-mapping-model";
import {
  confirmMapping,
  createManualMapping,
  isMappingConsistent,
  recordAiSuggestion,
  rejectMapping,
  removeMapping,
  updateMappingTarget,
  usePopProcessStepMappings,
} from "@/lib/pop-process-step-mapping-store";
import { suggestPopProcessStepMappings } from "@/lib/pop-process-step-mapping.functions";
import { cn } from "@/lib/utils";

/** Conversão puramente visual do número 0–1 em faixa legível. */
function confidenceLabel(confidence: number | undefined): string | undefined {
  if (typeof confidence !== "number") return undefined;
  if (confidence >= 0.75) return "Confiança: alta";
  if (confidence >= 0.4) return "Confiança: média";
  return "Confiança: baixa";
}

function stepLabel(steps: ProcessStep[], stepId: string): string | undefined {
  const index = steps.findIndex((s) => s.id === stepId);
  if (index < 0) return undefined;
  return `${String(index + 1).padStart(2, "0")} · ${steps[index]!.name}`;
}

function MappingRow({
  mapping,
  steps,
  onChangeTarget,
  onRemove,
}: {
  mapping: PopProcessStepMapping;
  steps: ProcessStep[];
  onChangeTarget: (mapping: PopProcessStepMapping) => void;
  onRemove: (mapping: PopProcessStepMapping) => void;
}) {
  const label = stepLabel(steps, mapping.processStepId);
  const consistent = isMappingConsistent(mapping);

  if (mapping.status === "rejeitado") {
    return (
      <div className="rounded-md border border-dashed border-border/60 px-3 py-2 text-xs text-muted-foreground/70">
        <span className="line-through">{label ?? "Etapa não encontrada no Processo atual"}</span>
        <span className="ml-2">· sugestão rejeitada</span>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border/70 px-3 py-2.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          <p className="truncate text-sm text-foreground">
            {consistent && label ? label : "Etapa não encontrada no Processo atual"}
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            {mapping.status === "sugerido" ? (
              <Pill tone="bg-primary/10 text-primary">Sugestão da IA</Pill>
            ) : (
              <Pill tone="bg-muted text-muted-foreground">
                {mapping.source === "ia"
                  ? "Sugestão da IA — confirmada"
                  : "Adicionada manualmente"}
              </Pill>
            )}
            {mapping.status === "sugerido" && confidenceLabel(mapping.confidence) ? (
              <Pill tone="bg-muted text-muted-foreground">
                {confidenceLabel(mapping.confidence)}
              </Pill>
            ) : null}
            {!consistent ? (
              <Pill tone="bg-destructive/10 text-destructive">Inconsistente</Pill>
            ) : null}
          </div>
          {mapping.status === "sugerido" && mapping.rationale ? (
            <p className="text-xs leading-relaxed text-muted-foreground">{mapping.rationale}</p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {mapping.status === "sugerido" ? (
            <>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() => {
                  const result = confirmMapping(mapping.id);
                  if (!result.ok) {
                    toast.error("Não foi possível confirmar esta correspondência.");
                    return;
                  }
                  toast.success("Correspondência confirmada.");
                }}
              >
                Confirmar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() => onChangeTarget(mapping)}
              >
                Alterar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-muted-foreground"
                onClick={() => {
                  const result = rejectMapping(mapping.id);
                  if (!result.ok) {
                    toast.error("Não foi possível rejeitar esta sugestão.");
                    return;
                  }
                  toast("Sugestão rejeitada.");
                }}
              >
                Rejeitar
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-muted-foreground"
              onClick={() => onRemove(mapping)}
            >
              Remover
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function PopProcessMappingTab({
  doc,
  process,
}: {
  doc: PopDoc;
  process: ProcessDoc | undefined;
}) {
  const mappings = usePopProcessStepMappings(doc.id);
  const suggest = useServerFn(suggestPopProcessStepMappings);
  const [analyzing, setAnalyzing] = useState(false);
  const [showRejected, setShowRejected] = useState(false);
  const [addFor, setAddFor] = useState<string | undefined>(undefined);
  const [changing, setChanging] = useState<PopProcessStepMapping | undefined>(undefined);
  const [removing, setRemoving] = useState<PopProcessStepMapping | undefined>(undefined);

  const counts = useMemo(
    () => ({
      confirmados: mappings.filter((m) => m.status === "confirmado").length,
      rejeitados: mappings.filter((m) => m.status === "rejeitado").length,
      pendentes: mappings.filter((m) => m.status === "sugerido").length,
    }),
    [mappings],
  );

  if (!doc.processId || !process) {
    return (
      <p className="text-sm text-muted-foreground">
        Vincule este POP a um Processo para habilitar o mapeamento.
      </p>
    );
  }

  const steps = process.steps;

  if (steps.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Este Processo ainda não possui etapas operacionais para mapeamento.
      </p>
    );
  }

  const processId = doc.processId;

  const analyze = async () => {
    setAnalyzing(true);
    try {
      const result = await suggest({
        data: {
          popId: doc.id,
          processId,
          popName: doc.name,
          popSections: doc.sections.map((s) => ({
            id: s.id,
            title: s.title,
            content: s.content,
          })),
          processName: process.name,
          processSteps: steps.map((s) => ({
            id: s.id,
            name: s.name,
            description: s.description,
          })),
        },
      });

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      // Persistência é sempre explícita e item a item; nada existente é tocado.
      let created = 0;
      for (const suggestion of result.suggestions) {
        const recorded = recordAiSuggestion({
          popId: doc.id,
          processId,
          popSectionId: suggestion.popSectionId,
          processStepId: suggestion.processStepId,
          confidence: suggestion.confidence,
          rationale: suggestion.rationale,
        });
        // "duplicado" é resultado esperado de reprocessamento — ignorado em silêncio.
        if (recorded.ok) created += 1;
      }

      const discarded =
        result.discardedCount > 0
          ? ` (${result.discardedCount} descartada(s) por referência inválida)`
          : "";
      toast.success(
        created === 0
          ? `Nenhuma nova sugestão${discarded}.`
          : `${created} sugestão(ões) gerada(s)${discarded}.`,
      );
    } catch {
      toast.error("Não foi possível concluir a análise. Tente novamente.");
    } finally {
      setAnalyzing(false);
    }
  };

  const hasAnalysis = mappings.length > 0;

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          {hasAnalysis ? (
            <p className="text-sm text-foreground">
              {counts.confirmados} confirmados · {counts.rejeitados} rejeitados ·{" "}
              {counts.pendentes} pendentes
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma análise realizada ainda.</p>
          )}
          <p className="text-xs text-muted-foreground">
            Processo vinculado: {process.name} · {steps.length} etapa(s).
          </p>
        </div>
        <div className="flex items-center gap-2">
          {counts.rejeitados > 0 ? (
            <button
              type="button"
              className="text-[11px] text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => setShowRejected((v) => !v)}
            >
              {showRejected ? "Ocultar rejeitados" : "Mostrar rejeitados"}
            </button>
          ) : null}
          <Button size="sm" className="gap-1.5" disabled={analyzing} onClick={() => void analyze()}>
            <Sparkles className="h-4 w-4" />
            {analyzing
              ? "Analisando…"
              : hasAnalysis
                ? "Analisar novamente com IA"
                : "Analisar com IA"}
          </Button>
        </div>
      </section>

      <Separator />

      <div className="space-y-4">
        {doc.sections.map((section, index) => {
          const all = mappings.filter((m) => m.popSectionId === section.id);
          const visible = showRejected ? all : all.filter((m) => m.status !== "rejeitado");
          return (
            <section key={section.id} className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-[11px] text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="text-sm font-medium">{section.title}</h3>
              </div>

              {visible.length === 0 ? (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">Sem correspondência</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => setAddFor(section.id)}
                  >
                    + Adicionar relação
                  </Button>
                </div>
              ) : (
                <div className={cn("space-y-2")}>
                  {visible.map((mapping) => (
                    <MappingRow
                      key={mapping.id}
                      mapping={mapping}
                      steps={steps}
                      onChangeTarget={setChanging}
                      onRemove={setRemoving}
                    />
                  ))}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => setAddFor(section.id)}
                  >
                    + Adicionar relação
                  </Button>
                </div>
              )}
            </section>
          );
        })}
      </div>

      <SelectProcessStepDialog
        steps={steps}
        title="Adicionar relação"
        description="Selecione a etapa do Processo correspondente a esta seção."
        confirmLabel="Adicionar"
        open={Boolean(addFor)}
        onOpenChange={(open) => {
          if (!open) setAddFor(undefined);
        }}
        onConfirm={(stepId) => {
          if (!addFor) return;
          const result = createManualMapping({
            popId: doc.id,
            popSectionId: addFor,
            processId,
            processStepId: stepId,
          });
          setAddFor(undefined);
          if (!result.ok) {
            toast.error(
              result.reason === "duplicado"
                ? "Esta correspondência já existe."
                : "Não foi possível adicionar esta relação.",
            );
            return;
          }
          toast.success("Relação adicionada.");
        }}
      />

      <SelectProcessStepDialog
        steps={steps}
        currentStepId={changing?.processStepId}
        title="Alterar etapa sugerida"
        description="A sugestão continua pendente: confirme-a depois de escolher a nova etapa."
        confirmLabel="Alterar"
        open={Boolean(changing)}
        onOpenChange={(open) => {
          if (!open) setChanging(undefined);
        }}
        onConfirm={(stepId) => {
          if (!changing) return;
          const result = updateMappingTarget(changing.id, stepId);
          setChanging(undefined);
          if (!result.ok) {
            toast.error(
              result.reason === "duplicado"
                ? "Já existe uma correspondência para esta etapa."
                : "Não foi possível alterar a etapa desta sugestão.",
            );
            return;
          }
          toast.success("Etapa alterada. Confirme para efetivar.");
        }}
      />

      <AlertDialog
        open={Boolean(removing)}
        onOpenChange={(open) => {
          if (!open) setRemoving(undefined);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover esta relação?</AlertDialogTitle>
            <AlertDialogDescription>
              A correspondência confirmada entre esta seção e a etapa será excluída. Nem o POP nem
              o Processo são alterados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!removing) return;
                const result = removeMapping(removing.id);
                setRemoving(undefined);
                if (!result.ok) {
                  toast.error("Não foi possível remover esta relação.");
                  return;
                }
                toast.success("Relação removida.");
              }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
