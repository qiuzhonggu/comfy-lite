import type { CanvasEdge, CanvasNode, XY } from "@/types";
import { HANDLE_Y, edgePath, nodeWidth } from "./geometry";

interface EdgeLayerProps {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  selectedEdgeId: string | null;
  onSelectEdge: (id: string) => void;
  /** In-progress connection drag in world coordinates */
  pending: { from: XY; to: XY } | null;
}

export function EdgeLayer({
  nodes,
  edges,
  selectedEdgeId,
  onSelectEdge,
  pending,
}: EdgeLayerProps) {
  const byId = new Map(nodes.map((n) => [n.id, n]));

  return (
    <svg
      className="pointer-events-none absolute left-0 top-0 h-px w-px overflow-visible"
      aria-hidden
    >
      <title>连线</title>
      {edges.map((e, i) => {
        const s = byId.get(e.source);
        const t = byId.get(e.target);
        if (!s || !t) return null;
        const d = edgePath(
          s.position.x + nodeWidth(s),
          s.position.y + HANDLE_Y,
          t.position.x,
          t.position.y + HANDLE_Y,
        );
        const selected = e.id === selectedEdgeId;
        const flowing = t.run.status === "running";
        return (
          <g key={e.id}>
            <path
              d={d}
              fill="none"
              strokeWidth={14}
              className="pointer-events-auto cursor-pointer stroke-transparent"
              onPointerDown={(ev) => {
                if (ev.button !== 0) return;
                ev.stopPropagation();
                onSelectEdge(e.id);
              }}
              data-ocid={`canvas_editor.edge.${i + 1}`}
            />
            <path
              d={d}
              fill="none"
              strokeWidth={selected ? 2.5 : 1.75}
              strokeLinecap="round"
              strokeDasharray={flowing ? "8 8" : undefined}
              className={`transition-[stroke-width] ${selected || flowing ? "stroke-edge-active" : "stroke-edge"} ${flowing ? "animate-edge-flow" : ""}`}
            />
          </g>
        );
      })}
      {pending && (
        <path
          d={edgePath(
            pending.from.x,
            pending.from.y,
            pending.to.x,
            pending.to.y,
          )}
          fill="none"
          strokeWidth={2}
          strokeDasharray="6 6"
          className="stroke-edge-active animate-edge-flow"
        />
      )}
    </svg>
  );
}
