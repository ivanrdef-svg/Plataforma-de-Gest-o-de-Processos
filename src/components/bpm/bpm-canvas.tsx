import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  AlertTriangle,
  BadgeCheck,
  CircleDot,
  Flag,
  GitBranch,
} from "lucide-react";
import { getStepType } from "@/config/process-model";
import {
  diagramBounds,
  type BpmDiagram,
  type BpmNode,
} from "@/config/bpm-model";
import { cn } from "@/lib/utils";

/**
 * Build 007 — Canvas do BPM Designer.
 *
 * Renderiza o fluxo derivado do Processo (Início → Etapas → Fim) em SVG,
 * com zoom por scroll/pinch, pan, seleção e reposicionamento de nós.
 * A estrutura já está preparada para receber gateways, eventos, pools,
 * lanes, subprocessos e anotações em builds futuras.
 */

export interface BpmCanvasHandle {
  zoomBy: (factor: number) => void;
  fit: () => void;
  getZoom: () => number;
}

interface View {
  zoom: number;
  x: number;
  y: number;
}

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2.5;

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

interface BpmCanvasProps {
  diagram: BpmDiagram;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onMoveNode: (id: string, x: number, y: number) => void;
  onZoomChange?: ((zoom: number) => void) | undefined;
  insets?: { left: number; right: number; top: number; bottom: number } | undefined;
  /** Build 008 — minimapa do diagrama no canto do canvas. */
  showMinimap?: boolean | undefined;
  className?: string | undefined;
  /** Build 020 — seleção de aresta (estado controlado, igual a `selectedId`). */
  selectedEdgeId?: string | null | undefined;
  onSelectEdge?: ((id: string | null) => void) | undefined;
  /** Build 020 — modo de criação: clique no fundo cria um elemento. */
  creating?: boolean | undefined;
  onCreateAt?: ((point: { x: number; y: number }) => void) | undefined;
  /** Build 020 — modo de conexão entre dois nós. */
  connecting?: boolean | undefined;
  connectSourceId?: string | null | undefined;
  onConnectPick?: ((nodeId: string) => void) | undefined;
  onCancelInteraction?: (() => void) | undefined;
}

export const BpmCanvas = forwardRef<BpmCanvasHandle, BpmCanvasProps>(
  function BpmCanvas(
    {
      diagram,
      selectedId,
      onSelect,
      onMoveNode,
      onZoomChange,
      insets,
      showMinimap,
      className,
      selectedEdgeId,
      onSelectEdge,
      creating,
      onCreateAt,
      connecting,
      connectSourceId,
      onConnectPick,
      onCancelInteraction,
    },
    ref,
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [view, setView] = useState<View>({ zoom: 1, x: 40, y: 20 });
    const viewRef = useRef(view);
    viewRef.current = view;
    const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);

    /** Converte coordenadas de tela em coordenadas do diagrama. */
    const toDiagramPoint = useCallback((clientX: number, clientY: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      const v = viewRef.current;
      return {
        x: ((clientX - (rect?.left ?? 0)) - v.x) / v.zoom,
        y: ((clientY - (rect?.top ?? 0)) - v.y) / v.zoom,
      };
    }, []);


    const apply = useCallback(
      (next: View) => {
        setView(next);
        onZoomChange?.(next.zoom);
      },
      [onZoomChange],
    );

    const fit = useCallback(() => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const b = diagramBounds(diagram);
      const i = insets ?? { left: 48, right: 48, top: 48, bottom: 48 };
      const availW = Math.max(rect.width - i.left - i.right, 120);
      const availH = Math.max(rect.height - i.top - i.bottom, 120);
      const zoom = clamp(
        Math.min(availW / Math.max(b.width, 1), availH / Math.max(b.height, 1)),
        MIN_ZOOM,
        1.1,
      );
      apply({
        zoom,
        x: i.left + (availW - b.width * zoom) / 2 - b.minX * zoom,
        y: i.top + (availH - b.height * zoom) / 2 - b.minY * zoom,
      });
    }, [diagram, apply, insets]);

    const zoomAt = useCallback(
      (nextZoom: number, px: number, py: number) => {
        const v = viewRef.current;
        const z = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
        const k = z / v.zoom;
        apply({
          zoom: z,
          x: px - (px - v.x) * k,
          y: py - (py - v.y) * k,
        });
      },
      [apply],
    );

    useImperativeHandle(ref, () => ({
      zoomBy: (factor: number) => {
        const el = containerRef.current;
        const rect = el?.getBoundingClientRect();
        zoomAt(
          viewRef.current.zoom * factor,
          (rect?.width ?? 800) / 2,
          (rect?.height ?? 500) / 2,
        );
      },
      fit,
      getZoom: () => viewRef.current.zoom,
    }));

    // zoom-to-fit inicial e a cada regeneração do diagrama
    useEffect(() => {
      const id = window.requestAnimationFrame(fit);
      return () => window.cancelAnimationFrame(id);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [diagram.generatedAt, insets?.left, insets?.right]);

    // wheel não-passivo (React usa listeners passivos)
    const wheelRef = useRef<(e: WheelEvent) => void>(() => {});
    wheelRef.current = (e: WheelEvent) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const dy =
        e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      if (e.ctrlKey || e.metaKey) {
        zoomAt(viewRef.current.zoom * Math.exp(-dy * 0.0025), px, py);
        return;
      }
      const dx =
        e.deltaX * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      const v = viewRef.current;
      apply({ ...v, x: v.x - dx, y: v.y - dy });
    };

    useEffect(() => {
      const el = containerRef.current;
      if (!el) return;
      const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        wheelRef.current(e);
      };
      el.addEventListener("wheel", onWheel, { passive: false });
      return () => el.removeEventListener("wheel", onWheel);
    }, []);

    // pan do fundo
    const panRef = useRef<{ x: number; y: number; vx: number; vy: number } | null>(
      null,
    );
    const [panning, setPanning] = useState(false);

    const onBackgroundPointerDown = (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      onSelect(null);
      panRef.current = {
        x: e.clientX,
        y: e.clientY,
        vx: viewRef.current.x,
        vy: viewRef.current.y,
      };
      setPanning(true);
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    };

    const onBackgroundPointerMove = (e: React.PointerEvent) => {
      const p = panRef.current;
      if (!p) return;
      apply({
        ...viewRef.current,
        x: p.vx + (e.clientX - p.x),
        y: p.vy + (e.clientY - p.y),
      });
    };

    const endPan = () => {
      panRef.current = null;
      setPanning(false);
    };

    // arrastar nós
    const dragRef = useRef<{
      id: string;
      x: number;
      y: number;
      nx: number;
      ny: number;
      moved: boolean;
    } | null>(null);

    const onNodePointerDown = (e: React.PointerEvent, node: BpmNode) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      onSelect(node.id);
      dragRef.current = {
        id: node.id,
        x: e.clientX,
        y: e.clientY,
        nx: node.x,
        ny: node.y,
        moved: false,
      };
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    };

    const onNodePointerMove = (e: React.PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const z = viewRef.current.zoom;
      const dx = (e.clientX - d.x) / z;
      const dy = (e.clientY - d.y) / z;
      if (!d.moved && Math.abs(dx) + Math.abs(dy) < 2) return;
      d.moved = true;
      onMoveNode(d.id, Math.round(d.nx + dx), Math.round(d.ny + dy));
    };

    const onNodePointerUp = () => {
      dragRef.current = null;
    };

    const nodeById = new Map(diagram.nodes.map((n) => [n.id, n]));

    return (
      <div
        ref={containerRef}
        className={cn(
          "relative h-full w-full overflow-hidden rounded-xl border bg-[radial-gradient(var(--bpm-dot)_1px,transparent_1px)] [background-size:22px_22px]",
          panning ? "cursor-grabbing" : "cursor-grab",
          className,
        )}
        style={
          {
            "--bpm-dot": "color-mix(in oklch, var(--border) 75%, transparent)",
            backgroundPosition: `${view.x}px ${view.y}px`,
          } as React.CSSProperties
        }
        onPointerDown={onBackgroundPointerDown}
        onPointerMove={onBackgroundPointerMove}
        onPointerUp={endPan}
        onPointerLeave={endPan}
      >
        <svg className="h-full w-full" role="presentation">
          <defs>
            <marker
              id="bpm-arrow"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--muted-foreground)" />
            </marker>
          </defs>

          <g transform={`translate(${view.x} ${view.y}) scale(${view.zoom})`}>
            {diagram.edges.map((edge) => {
              const a = nodeById.get(edge.source);
              const b = nodeById.get(edge.target);
              if (!a || !b) return null;
              const dependency = edge.variant === "dependency";

              const x1 = a.x + a.width;
              const y1 = a.y + a.height / 2;
              const x2 = b.x;
              const y2 = b.y + b.height / 2;

              let d: string;
              if (dependency) {
                // Dependência declarada: arco discreto por cima do fluxo.
                const top = Math.min(a.y, b.y) - 46;
                d = `M ${a.x + a.width / 2} ${a.y} C ${a.x + a.width / 2} ${top}, ${b.x + b.width / 2} ${top}, ${b.x + b.width / 2} ${b.y - 6}`;
              } else if (x2 >= x1) {
                const mid = x1 + (x2 - x1) / 2;
                d = `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2 - 6} ${y2}`;
              } else {
                const below = Math.max(a.y + a.height, b.y + b.height) + 48;
                d = `M ${a.x + a.width / 2} ${a.y + a.height} C ${a.x + a.width / 2} ${below}, ${b.x + b.width / 2} ${below}, ${b.x + b.width / 2} ${b.y + b.height + 6}`;
              }

              const labelX = dependency
                ? (a.x + a.width / 2 + b.x + b.width / 2) / 2
                : (x1 + x2) / 2;
              const labelY = dependency
                ? Math.min(a.y, b.y) - 26
                : (y1 + y2) / 2 - 8;

              return (
                <g key={edge.id}>
                  <path
                    d={d}
                    fill="none"
                    stroke={
                      dependency ? "var(--primary)" : "var(--muted-foreground)"
                    }
                    strokeOpacity={dependency ? 0.45 : 0.5}
                    strokeWidth={1.5}
                    strokeDasharray={dependency ? "5 4" : undefined}
                    markerEnd="url(#bpm-arrow)"
                  />
                  {edge.label && (
                    <text
                      x={labelX}
                      y={labelY}
                      textAnchor="middle"
                      className="fill-muted-foreground text-[10px]"
                    >
                      {edge.label}
                    </text>
                  )}
                </g>
              );
            })}

            {diagram.nodes.map((node) => (
              <BpmNodeShape
                key={node.id}
                node={node}
                selected={selectedId === node.id}
                onPointerDown={(e) => onNodePointerDown(e, node)}
                onPointerMove={onNodePointerMove}
                onPointerUp={onNodePointerUp}
              />
            ))}
          </g>
        </svg>

        {showMinimap && (
          <Minimap
            diagram={diagram}
            selectedId={selectedId}
            offsetRight={(insets?.right ?? 12) + 8}
          />
        )}

        <div className="pointer-events-none absolute bottom-3 left-3 rounded-md border bg-background/80 px-2 py-1 text-[10px] text-muted-foreground backdrop-blur">
          Arraste para mover · ⌘/Ctrl + scroll para zoom
        </div>

      </div>
    );
  },
);

function BpmNodeShape({
  node,
  selected,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  node: BpmNode;
  selected: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
}) {
  const isEvent = node.kind === "start" || node.kind === "end";

  return (
    <g
      transform={`translate(${node.x} ${node.y})`}
      className="cursor-pointer"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {isEvent ? (
        <>
          <circle
            cx={node.width / 2}
            cy={node.height / 2}
            r={node.width / 2 - 2}
            fill="var(--card)"
            stroke={
              selected
                ? "var(--primary)"
                : node.kind === "start"
                  ? "color-mix(in oklch, var(--primary) 55%, transparent)"
                  : "var(--border-strong, var(--border))"
            }
            strokeWidth={selected ? 2.5 : node.kind === "end" ? 3 : 2}
          />
          <foreignObject
            x={0}
            y={node.height / 2 - 12}
            width={node.width}
            height={24}
          >
            <div className="flex h-6 items-center justify-center text-[11px] font-medium text-foreground">
              {node.kind === "start" ? (
                <CircleDot className="h-4 w-4 text-primary" />
              ) : (
                <Flag className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </foreignObject>
          <text
            x={node.width / 2}
            y={node.height + 16}
            textAnchor="middle"
            className="fill-muted-foreground text-[11px]"
          >
            {node.name}
          </text>
        </>
      ) : node.kind === "gateway" ? (
        <>
          {/* Decisão — losango moderno (estilo Camunda 8 / FigJam) */}
          <path
            d={`M ${node.width / 2} 2 L ${node.width - 2} ${node.height / 2} L ${node.width / 2} ${node.height - 2} L 2 ${node.height / 2} Z`}
            fill="var(--card)"
            stroke={
              selected
                ? "var(--primary)"
                : "color-mix(in oklch, var(--border-strong, var(--border)) 100%, transparent)"
            }
            strokeWidth={selected ? 2.5 : 1.5}
          />
          <foreignObject
            x={node.width * 0.18}
            y={node.height / 2 - 18}
            width={node.width * 0.64}
            height={36}
          >
            <div className="flex h-9 flex-col items-center justify-center gap-0.5">
              <GitBranch className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            </div>
          </foreignObject>
          <text
            x={node.width / 2}
            y={node.height + 16}
            textAnchor="middle"
            className="fill-foreground text-[11px] font-medium"
          >
            {truncate(node.name, 26)}
          </text>
        </>
      ) : (
        <>
          <rect
            width={node.width}
            height={node.height}
            rx={14}
            fill="var(--card)"
            stroke={selected ? "var(--primary)" : "var(--border)"}
            strokeWidth={selected ? 2 : 1}
          />
          <rect
            width={4}
            height={node.height}
            rx={2}
            fill={
              node.kind === "approval"
                ? "var(--color-emerald-500, var(--primary))"
                : "var(--primary)"
            }
            opacity={selected ? 1 : 0.35}
          />
          <foreignObject x={14} y={10} width={node.width - 26} height={node.height - 16}>
            <div className="flex h-full flex-col justify-between">
              <div className="flex items-start gap-1.5">
                <span className="mt-[3px] flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                  <StepGlyph node={node} />
                </span>
                <p className="line-clamp-2 text-[12px] font-medium leading-snug text-foreground">
                  {node.name}
                </p>
              </div>
              <p className="truncate text-[10px] text-muted-foreground">
                {[node.owner, node.duration].filter(Boolean).join(" · ") ||
                  "Sem responsável definido"}
              </p>
            </div>
          </foreignObject>
        </>
      )}

      {/* Build 008 — indicador discreto de inconsistência */}
      {!!node.issues?.length && (
        <g transform={`translate(${node.width - 12} -6)`}>
          <circle
            r={8}
            fill="var(--card)"
            stroke={
              node.issues.some((i) => i.severity === "erro")
                ? "color-mix(in oklch, red 60%, var(--border))"
                : "color-mix(in oklch, orange 60%, var(--border))"
            }
            strokeWidth={1.5}
          />
          <foreignObject x={-8} y={-8} width={16} height={16}>
            <div className="flex h-4 w-4 items-center justify-center">
              <AlertTriangle
                className={cn(
                  "h-2.5 w-2.5",
                  node.issues.some((i) => i.severity === "erro")
                    ? "text-destructive"
                    : "text-amber-600 dark:text-amber-400",
                )}
              />
            </div>
          </foreignObject>
        </g>
      )}
    </g>
  );
}

function truncate(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function StepGlyph({ node }: { node: BpmNode }) {
  if (node.kind === "approval")
    return <BadgeCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />;
  const Icon = getStepType(node.stepType).icon;
  return <Icon className="h-3.5 w-3.5 text-muted-foreground" />;
}

/** Build 008 — minimapa do diagrama (canto inferior direito). */
function Minimap({
  diagram,
  selectedId,
  offsetRight = 12,
}: {
  diagram: BpmDiagram;
  selectedId: string | null;
  offsetRight?: number;
}) {
  const b = diagramBounds(diagram);
  const pad = 24;
  const vbW = b.width + pad * 2;
  const vbH = b.height + pad * 2;

  return (
    <div
      className="pointer-events-none absolute bottom-3 z-10 w-[164px] rounded-lg border bg-background/85 p-1.5 shadow-sm backdrop-blur"
      style={{ right: offsetRight }}
    >
      <svg
        viewBox={`${b.minX - pad} ${b.minY - pad} ${vbW} ${vbH}`}
        className="h-[92px] w-full"
        role="presentation"
      >
        {diagram.edges.map((edge) => {
          const a = diagram.nodes.find((n) => n.id === edge.source);
          const c = diagram.nodes.find((n) => n.id === edge.target);
          if (!a || !c) return null;
          return (
            <line
              key={edge.id}
              x1={a.x + a.width / 2}
              y1={a.y + a.height / 2}
              x2={c.x + c.width / 2}
              y2={c.y + c.height / 2}
              stroke="var(--muted-foreground)"
              strokeOpacity={0.3}
              strokeWidth={Math.max(2, vbW / 220)}
            />
          );
        })}
        {diagram.nodes.map((n) => (
          <rect
            key={n.id}
            x={n.x}
            y={n.y}
            width={n.width}
            height={n.height}
            rx={10}
            fill={
              selectedId === n.id
                ? "var(--primary)"
                : "color-mix(in oklch, var(--muted-foreground) 35%, transparent)"
            }
          />
        ))}
      </svg>
      <p className="px-0.5 pb-0.5 text-center text-[9px] text-muted-foreground">
        Mini mapa
      </p>
    </div>
  );
}

