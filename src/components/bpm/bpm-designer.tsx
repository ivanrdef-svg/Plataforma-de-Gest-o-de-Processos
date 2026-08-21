import { useEffect, useMemo, useRef, useState } from "react";
import {
  Download,
  Maximize2,
  Minimize2,
  Crosshair,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Sparkles,
  PanelLeft,
  PanelRight,
  Map as MapIcon,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { BpmCanvas, type BpmCanvasHandle } from "@/components/bpm/bpm-canvas";
import { BpmSourcePanel } from "@/components/bpm/bpm-source-panel";
import { BpmPropertiesPanel } from "@/components/bpm/bpm-properties-panel";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ensureDiagram,
  pendingProcessChanges,
  syncDiagramWithProcess,
  updateBpmNode,
  useBpmDiagram,
} from "@/lib/bpm-store";
import { diagramIssueSummary } from "@/config/bpm-model";
import type { ProcessDoc } from "@/lib/process-store";
import { cn } from "@/lib/utils";

/**
 * Build 007 — BPM Designer.
 *
 * Três áreas: painel esquerdo (dados do Processo), canvas central (fluxo
 * derivado automaticamente) e painel direito (propriedades do elemento).
 * Não há motor BPMN, validação nem execução nesta build.
 */

function ToolButton({
  label,
  icon: Icon,
  onClick,
  active,
}: {
  label: string;
  icon: typeof ZoomIn;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={label}
          onClick={onClick}
          className={cn("h-8 w-8 p-0", active && "text-primary")}
        >
          <Icon className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function BpmDesigner({ doc }: { doc: ProcessDoc }) {
  const diagram = useBpmDiagram(doc.id);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [showSource, setShowSource] = useState(true);
  const [showProps, setShowProps] = useState(true);
  const [showMinimap, setShowMinimap] = useState(true);
  const canvasRef = useRef<BpmCanvasHandle>(null);

  // Gera o fluxo inicial automaticamente ao abrir o Processo.
  useEffect(() => {
    ensureDiagram(doc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.id]);

  // Reenquadra o diagrama quando a área útil do canvas muda.
  useEffect(() => {
    const id = window.setTimeout(() => canvasRef.current?.fit(), 220);
    return () => window.clearTimeout(id);
  }, [fullscreen, showSource, showProps]);


  const stale = useMemo(
    () => pendingProcessChanges(doc, diagram).count > 0,
    [doc, diagram],
  );
  const issues = useMemo(
    () =>
      diagram
        ? diagramIssueSummary(diagram)
        : { total: 0, errors: 0, warnings: 0 },
    [diagram],
  );
  const selected =
    diagram?.nodes.find((n) => n.id === selectedId) ?? null;

  const regenerate = () => {
    syncDiagramWithProcess(doc);
    toast.success("Diagrama atualizado", {
      description: "As novas etapas do Processo foram adicionadas ao fluxo.",
    });
  };

  if (!diagram) {
    return (
      <div className="flex h-[420px] items-center justify-center rounded-xl border text-xs text-muted-foreground">
        Gerando diagrama a partir do Processo…
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        fullscreen && "fixed inset-0 z-50 bg-background p-4",
      )}
    >
      {/* Barra de ferramentas */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card px-2 py-1.5">
        <div className="flex items-center gap-1">
          <ToolButton
            label="Reduzir zoom"
            icon={ZoomOut}
            onClick={() => canvasRef.current?.zoomBy(1 / 1.2)}
          />
          <span className="w-11 text-center text-[11px] tabular-nums text-muted-foreground">
            {Math.round(zoom * 100)}%
          </span>
          <ToolButton
            label="Ampliar zoom"
            icon={ZoomIn}
            onClick={() => canvasRef.current?.zoomBy(1.2)}
          />
          <ToolButton
            label="Centralizar"
            icon={Crosshair}
            onClick={() => canvasRef.current?.fit()}
          />
        </div>

        <Separator orientation="vertical" className="h-5" />

        <ToolButton
          label={showSource ? "Ocultar painel do Processo" : "Mostrar painel do Processo"}
          icon={PanelLeft}
          active={showSource}
          onClick={() => setShowSource((v) => !v)}
        />
        <ToolButton
          label={showProps ? "Ocultar propriedades" : "Mostrar propriedades"}
          icon={PanelRight}
          active={showProps}
          onClick={() => setShowProps((v) => !v)}
        />

        <ToolButton
          label={showMinimap ? "Ocultar mini mapa" : "Mostrar mini mapa"}
          icon={MapIcon}
          active={showMinimap}
          onClick={() => setShowMinimap((v) => !v)}
        />

        <Separator orientation="vertical" className="h-5" />

        <ToolButton label="Atualizar diagrama" icon={RefreshCw} onClick={regenerate} />
        <ToolButton
          label="Exportar (em breve)"
          icon={Download}
          onClick={() =>
            toast("Exportar diagrama", {
              description: "Disponível em uma próxima build.",
            })
          }
        />
        <ToolButton
          label={fullscreen ? "Sair da tela cheia" : "Tela cheia"}
          icon={fullscreen ? Minimize2 : Maximize2}
          active={fullscreen}
          onClick={() => setFullscreen((f) => !f)}
        />

        <div className="ml-auto flex items-center gap-2 pr-1 text-[11px] text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Gerado a partir do Processo · {doc.steps.length} etapas
          {issues.total > 0 && (
            <span className="flex items-center gap-1 rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-3 w-3" />
              {issues.total}{" "}
              {issues.total === 1 ? "inconsistência" : "inconsistências"}
            </span>
          )}
        </div>
      </div>

      {/* Aviso de diagrama desatualizado */}
      {stale && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2">
          <p className="text-[11px] text-muted-foreground">
            As etapas do Processo mudaram desde a última geração do diagrama.
          </p>
          <Button size="sm" className="ml-auto h-7 gap-1.5 text-xs" onClick={regenerate}>
            <RefreshCw className="h-3.5 w-3.5" />
            Atualizar diagrama a partir do Processo
          </Button>
        </div>
      )}

      {/* Três áreas: painéis flutuam sobre o canvas (estilo FigJam/Figma) */}
      <div
        className={cn(
          "relative",
          fullscreen ? "min-h-0 flex-1" : "h-[620px]",
        )}
      >
        <BpmCanvas
          ref={canvasRef}
          diagram={diagram}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onZoomChange={setZoom}
          showMinimap={showMinimap}
          onMoveNode={(id, x, y) => updateBpmNode(doc.id, id, { x, y })}
          insets={{
            left: showSource ? 244 : 24,
            right: showProps ? 288 : 24,
            top: 24,
            bottom: 48,
          }}
        />

        {showSource && (
          <aside className="absolute bottom-3 left-3 top-3 z-10 w-[224px] animate-fade-in overflow-y-auto rounded-xl border bg-card/95 p-3 shadow-sm backdrop-blur">
            <BpmSourcePanel
              doc={doc}
              selectedStepId={selected?.stepId}
              onSelectStep={(stepId) => {
                const node = diagram.nodes.find((n) => n.stepId === stepId);
                if (node) setSelectedId(node.id);
              }}
            />
          </aside>
        )}

        {showProps && (
          <aside className="absolute bottom-3 right-3 top-3 z-10 w-[268px] animate-fade-in overflow-y-auto rounded-xl border bg-card/95 p-3 shadow-sm backdrop-blur">
            <BpmPropertiesPanel
              node={selected}
              processId={doc.id}
              processName={doc.name}
              onNotesChange={(notes) =>
                selected && updateBpmNode(doc.id, selected.id, { notes })
              }
            />
          </aside>
        )}
      </div>

    </div>
  );
}
