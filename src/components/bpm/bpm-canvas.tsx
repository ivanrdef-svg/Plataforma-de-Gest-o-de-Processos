import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { CircleDot, Flag } from "lucide-react";
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
  onZoomChange?: (zoom: number) => void;
  className?: string;
}

export const BpmCanvas = forwardRef<BpmCanvasHandle, BpmCanvasProps>(
  function BpmCanvas(
    { diagram, selectedId, onSelect, onMoveNode, onZoomChange, className },
    ref,
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [view, setView] = useState<View>({ zoom: 1, x: 40, y: 20 });
    const viewRef = useRef(view);
    viewRef.current = view;

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
      const pad = 56;
      const zoom = clamp(
        Math.min(
          (rect.width - pad * 2) / Math.max(b.width, 1),
          (rect.height - pad * 2) / Math.max(b.height, 1),
        ),
        MIN_ZOOM,
        1.2,
      );
      apply({
        zoom,
        x: (rect.width - b.width * zoom) / 2 - b.minX * zoom,
        y: (rect.height - b.height * zoom) / 2 - b.minY * zoom,
      });
    }, [diagram, apply]);

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
    }, [diagram.generatedAt]);

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
              const x1 = a.x + a.width;
              const y1 = a.y + a.height / 2;
              const x2 = b.x;
              const y2 = b.y + b.height / 2;
              const mid = (x1 + x2) / 2;
              const d =
                Math.abs(y1 - y2) < 1
                  ? `M ${x1} ${y1} L ${x2 - 6} ${y2}`
                  : `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2 - 6} ${y2}`;
              return (
                <path
                  key={edge.id}
                  d={d}
                  fill="none"
                  stroke="var(--muted-foreground)"
                  strokeOpacity={0.5}
                  strokeWidth={1.5}
                  markerEnd="url(#bpm-arrow)"
                />
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
          <rect width={4} height={node.height} rx={2} fill="var(--primary)" opacity={selected ? 1 : 0.35} />
          <foreignObject x={14} y={12} width={node.width - 26} height={node.height - 20}>
            <div className="flex h-full flex-col justify-between">
              <p className="line-clamp-2 text-[12px] font-medium leading-snug text-foreground">
                {node.name}
              </p>
              <p className="truncate text-[10px] text-muted-foreground">
                {[node.owner, node.duration].filter(Boolean).join(" · ") ||
                  "Sem responsável definido"}
              </p>
            </div>
          </foreignObject>
        </>
      )}
    </g>
  );
}
