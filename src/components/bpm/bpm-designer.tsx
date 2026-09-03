import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Plus,
  Spline,
  Trash2,
  CircleDot,
  Flag,
  GitBranch,
  Square,
  ShieldCheck,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { BpmCanvas, type BpmCanvasHandle } from "@/components/bpm/bpm-canvas";
import { BpmSourcePanel } from "@/components/bpm/bpm-source-panel";
import { BpmPropertiesPanel } from "@/components/bpm/bpm-properties-panel";
import {
  BpmIssueRow,
  BpmValidationPanel,
  BpmValidationStatusPills,
} from "@/components/bpm/bpm-validation-panel";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  addEdge,
  addManualNode,
  ensureDiagram,
  pendingProcessChanges,
  removeEdge,
  removeNode,
  syncDiagramWithProcess,
  updateBpmNode,
  updateNodeProperties,
  useBpmDiagram,
} from "@/lib/bpm-store";
import type { BpmDiagram, BpmNodeKind } from "@/config/bpm-model";
import { validateBpmn } from "@/lib/bpm-validation";
import type { ProcessDoc } from "@/lib/process-store";
import { cn } from "@/lib/utils";

/**
 * Build 007 — BPM Designer.
 * Build 020 — edição editorial: criar elementos, conectar, excluir e editar
 * propriedades diretamente no diagrama. Nada aqui reconstrói o diagrama de
 * forma destrutiva; a persistência é automática pelo store (localStorage).
 */

const EMPTY_DIAGRAM: BpmDiagram = {
  processId: "",
  signature: "",
  nodes: [],
  edges: [],
  lanes: [],
  issues: [],
  generatedAt: "",
};

const CREATE_OPTIONS: {
  kind: BpmNodeKind;
  label: string;
  icon: typeof ZoomIn;
}[] = [
  { kind: "start", label: "Evento de início", icon: CircleDot },
  { kind: "task", label: "Atividade", icon: Square },
  { kind: "gateway", label: "Decisão", icon: GitBranch },
  { kind: "end", label: "Evento de fim", icon: Flag },
];

function ToolButton({
  label,
  icon: Icon,
  onClick,
  active,
  disabled,
}: {
  label: string;
  icon: typeof ZoomIn;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
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
          disabled={disabled}
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
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [showSource, setShowSource] = useState(true);
  const [showProps, setShowProps] = useState(true);
  const [showMinimap, setShowMinimap] = useState(true);
  const [creatingKind, setCreatingKind] = useState<BpmNodeKind | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connectSourceId, setConnectSourceId] = useState<string | null>(null);
  const [showValidation, setShowValidation] = useState(false);
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

  const pending = useMemo(() => pendingProcessChanges(doc, diagram), [doc, diagram]);
  const stale = pending.count > 0;
  // Fonte única de validação do BPMN nesta tela.
  const validation = useMemo(() => validateBpmn(diagram ?? EMPTY_DIAGRAM, doc), [diagram, doc]);

  const nodeSeverity = useMemo(() => {
    const map = new Map<string, "erro" | "atencao">();
    [...validation.errors, ...validation.warnings].forEach((issue) => {
      if (!issue.nodeId) return;
      if (issue.severity === "erro" || !map.has(issue.nodeId))
        map.set(issue.nodeId, issue.severity);
    });
    return Object.fromEntries(map) as Record<string, "erro" | "atencao">;
  }, [validation]);

  const edgeSeverity = useMemo(() => {
    const map = new Map<string, "erro" | "atencao">();
    [...validation.errors, ...validation.warnings].forEach((issue) => {
      if (!issue.edgeId) return;
      if (issue.severity === "erro" || !map.has(issue.edgeId))
        map.set(issue.edgeId, issue.severity);
    });
    return Object.fromEntries(map) as Record<string, "erro" | "atencao">;
  }, [validation]);

  const selectedNodeIssues = useMemo(
    () =>
      selectedId
        ? [...validation.errors, ...validation.warnings].filter((i) => i.nodeId === selectedId)
        : [],
    [validation, selectedId],
  );

  const selectedEdgeIssues = useMemo(
    () =>
      selectedEdgeId
        ? [...validation.errors, ...validation.warnings].filter((i) => i.edgeId === selectedEdgeId)
        : [],
    [validation, selectedEdgeId],
  );

  const selectIssueNode = useCallback((nodeId: string) => {
    setSelectedEdgeId(null);
    setSelectedId(nodeId);
  }, []);

  const selectIssueEdge = useCallback((edgeId: string) => {
    setSelectedId(null);
    setSelectedEdgeId(edgeId);
  }, []);
  const selected = diagram?.nodes.find((n) => n.id === selectedId) ?? null;
  const selectedEdge = diagram?.edges.find((e) => e.id === selectedEdgeId) ?? null;

  const regenerate = () => {
    syncDiagramWithProcess(doc);
    toast.success("Diagrama atualizado", {
      description: "As novas etapas do Processo foram adicionadas ao fluxo.",
    });
  };

  const cancelModes = useCallback(() => {
    setCreatingKind(null);
    setConnecting(false);
    setConnectSourceId(null);
  }, []);

  const deleteSelectedNode = useCallback(() => {
    if (!selectedId) return;
    removeNode(doc.id, selectedId);
    setSelectedId(null);
    toast.success("Elemento removido do diagrama.");
  }, [doc.id, selectedId]);

  const deleteSelectedEdge = useCallback(() => {
    if (!selectedEdgeId) return;
    removeEdge(doc.id, selectedEdgeId);
    setSelectedEdgeId(null);
    toast.success("Conexão removida.");
  }, [doc.id, selectedEdgeId]);

  // Delete/Backspace — com guarda de foco em campos de texto.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        cancelModes();
        return;
      }
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable))
        return;
      if (selectedEdgeId) {
        e.preventDefault();
        deleteSelectedEdge();
      } else if (selectedId) {
        e.preventDefault();
        deleteSelectedNode();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedId, selectedEdgeId, deleteSelectedNode, deleteSelectedEdge, cancelModes]);

  const handleCreateAt = (point: { x: number; y: number }) => {
    if (!creatingKind) return;
    const node = addManualNode(doc.id, creatingKind, point);
    setCreatingKind(null);
    if (node) {
      setSelectedEdgeId(null);
      setSelectedId(node.id);
      toast.success("Elemento adicionado ao diagrama.");
    }
  };

  const handleConnectPick = (nodeId: string) => {
    if (!connectSourceId) {
      setConnectSourceId(nodeId);
      return;
    }
    const edge = addEdge(doc.id, connectSourceId, nodeId);
    if (!edge) {
      toast.error("Conexão não criada", {
        description:
          "Não é possível conectar um elemento a ele mesmo nem duplicar uma conexão existente.",
      });
    } else {
      setSelectedEdgeId(edge.id);
      setSelectedId(null);
    }
    setConnecting(false);
    setConnectSourceId(null);
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
      className={cn("flex flex-col gap-3", fullscreen && "fixed inset-0 z-50 bg-background p-4")}
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

        {/* Build 020 — criação de elementos */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="Adicionar elemento"
              className={cn("h-8 gap-1.5 px-2 text-xs", creatingKind && "text-primary")}
            >
              <Plus className="h-4 w-4" />
              Adicionar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52">
            <DropdownMenuLabel className="text-[11px] text-muted-foreground">
              Clique no canvas para posicionar
            </DropdownMenuLabel>
            {CREATE_OPTIONS.map((opt) => (
              <DropdownMenuItem
                key={opt.kind}
                onSelect={() => {
                  setConnecting(false);
                  setConnectSourceId(null);
                  setCreatingKind(opt.kind);
                }}
                className="gap-2 text-xs"
              >
                <opt.icon className="h-3.5 w-3.5" />
                {opt.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <ToolButton
          label={connecting ? "Cancelar conexão" : "Conectar elementos"}
          icon={Spline}
          active={connecting}
          onClick={() => {
            setCreatingKind(null);
            setConnectSourceId(null);
            setConnecting((v) => !v);
          }}
        />
        <ToolButton
          label="Excluir selecionado"
          icon={Trash2}
          disabled={!selectedId && !selectedEdgeId}
          onClick={() => (selectedEdgeId ? deleteSelectedEdge() : deleteSelectedNode())}
        />

        <Separator orientation="vertical" className="h-5" />

        <ToolButton label="Atualizar a partir do Processo" icon={RefreshCw} onClick={regenerate} />

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

        <ToolButton
          label={showValidation ? "Ocultar validação do BPMN" : "Validar BPMN"}
          icon={ShieldCheck}
          active={showValidation}
          onClick={() => setShowValidation((v) => !v)}
        />

        <div className="ml-auto flex flex-wrap items-center justify-end gap-2 pr-1 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Gerado a partir do Processo · {doc.steps.length} etapas
          </span>
          <BpmValidationStatusPills validation={validation} />
        </div>
      </div>

      {/* Modo ativo (criação/conexão) */}
      {(creatingKind || connecting) && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-muted/40 px-3 py-2">
          <p className="text-[11px] text-muted-foreground">
            {creatingKind
              ? "Clique no canvas para posicionar o novo elemento."
              : connectSourceId
                ? "Agora clique no elemento de destino da conexão."
                : "Clique no elemento de origem da conexão."}
          </p>
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto h-7 gap-1.5 text-xs"
            onClick={cancelModes}
          >
            <X className="h-3.5 w-3.5" />
            Cancelar
          </Button>
        </div>
      )}

      {/* Painel de validação (colapsável) */}
      {showValidation && (
        <div className="relative animate-fade-in">
          <BpmValidationPanel
            validation={validation}
            onSelectNode={selectIssueNode}
            onSelectEdge={selectIssueEdge}
          />
          <Button
            type="button"
            size="sm"
            variant="ghost"
            aria-label="Fechar validação"
            className="absolute right-2 top-2 h-6 w-6 p-0"
            onClick={() => setShowValidation(false)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Etapas do Processo ainda não representadas no diagrama */}
      {stale && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2">
          <p className="text-[11px] text-muted-foreground">
            {pending.count} {pending.count === 1 ? "etapa" : "etapas"} do Processo ainda{" "}
            {pending.count === 1 ? "não está" : "não estão"} no BPMN.
          </p>
          <Button size="sm" className="ml-auto h-7 gap-1.5 text-xs" onClick={regenerate}>
            <RefreshCw className="h-3.5 w-3.5" />
            Atualizar a partir do Processo
          </Button>
        </div>
      )}

      {/* Três áreas: painéis flutuam sobre o canvas (estilo FigJam/Figma) */}
      <div className={cn("relative", fullscreen ? "min-h-0 flex-1" : "h-[620px]")}>
        <BpmCanvas
          ref={canvasRef}
          diagram={diagram}
          selectedId={selectedId}
          onSelect={setSelectedId}
          selectedEdgeId={selectedEdgeId}
          onSelectEdge={setSelectedEdgeId}
          creating={!!creatingKind}
          onCreateAt={handleCreateAt}
          connecting={connecting}
          connectSourceId={connectSourceId}
          onConnectPick={handleConnectPick}
          onCancelInteraction={cancelModes}
          onZoomChange={setZoom}
          nodeSeverity={nodeSeverity}
          edgeSeverity={edgeSeverity}
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
                if (node) {
                  setSelectedEdgeId(null);
                  setSelectedId(node.id);
                }
              }}
            />
          </aside>
        )}

        {showProps && (
          <aside className="absolute bottom-3 right-3 top-3 z-10 w-[268px] animate-fade-in overflow-y-auto rounded-xl border bg-card/95 p-3 shadow-sm backdrop-blur">
            {selectedEdge ? (
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Conexão selecionada
                  </p>
                  <h3 className="mt-0.5 text-sm font-medium leading-snug">
                    {diagram.nodes.find((n) => n.id === selectedEdge.source)?.name ?? "—"} →{" "}
                    {diagram.nodes.find((n) => n.id === selectedEdge.target)?.name ?? "—"}
                  </h3>
                </div>
                {!!selectedEdgeIssues.length && (
                  <ul className="space-y-1.5">
                    {selectedEdgeIssues.map((issue) => (
                      <BpmIssueRow key={issue.id} issue={issue} compact />
                    ))}
                  </ul>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 w-full gap-1.5 text-xs"
                  onClick={deleteSelectedEdge}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Excluir conexão
                </Button>
              </div>
            ) : (
              <BpmPropertiesPanel
                node={selected}
                issues={selectedNodeIssues}
                processId={doc.id}
                processName={doc.name}
                onNotesChange={(notes) => selected && updateBpmNode(doc.id, selected.id, { notes })}
                onPropertyChange={(patch) =>
                  selected && updateNodeProperties(doc.id, selected.id, patch)
                }
                onDelete={deleteSelectedNode}
              />
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
