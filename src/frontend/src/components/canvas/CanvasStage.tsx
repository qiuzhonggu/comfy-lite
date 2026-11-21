import { useCanvasStore } from "@/store/canvasStore";
import {
  type CanvasNode,
  NODE_META,
  type NodeType,
  type Viewport,
  type XY,
} from "@/types";
import { Plus, Workflow } from "lucide-react";
import {
  type CSSProperties,
  type MouseEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import {
  CanvasContextMenu,
  type ContextMenuState,
  canRunNode,
} from "./CanvasContextMenu";
import { EdgeLayer } from "./EdgeLayer";
import { NodeCard } from "./NodeCard";
import { NodeToolbar } from "./NodeToolbar";
import { ViewControls } from "./ViewControls";
import {
  GRID_SIZE,
  HANDLE_Y,
  clampZoom,
  isInteractiveTarget,
  isTypingTarget,
  nodeWidth,
  startDrag,
  zoomAt,
} from "./geometry";

const EMPTY_NODES: CanvasNode[] = [];
const EMPTY_EDGES: never[] = [];

interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}
interface PendingLink {
  source: string;
  from: XY;
  to: XY;
  target: string | null;
}

function nodeIdAt(x: number, y: number, exclude: string): string | null {
  const el = document.elementFromPoint(x, y)?.closest("[data-node-id]");
  const id = el?.getAttribute("data-node-id") ?? null;
  return id === exclude ? null : id;
}

export function CanvasStage({
  initialViewport,
}: { initialViewport: Viewport }) {
  const nodes = useCanvasStore((s) => s.canvas?.nodes ?? EMPTY_NODES);
  const edges = useCanvasStore((s) => s.canvas?.edges ?? EMPTY_EDGES);
  const selection = useCanvasStore((s) => s.selection);
  const selectedEdgeId = useCanvasStore((s) => s.selectedEdgeId);
  const setViewport = useCanvasStore((s) => s.setViewport);
  const moveNodesBy = useCanvasStore((s) => s.moveNodesBy);
  const selectEdge = useCanvasStore((s) => s.selectEdge);
  const addNode = useCanvasStore((s) => s.addNode);

  const stageRef = useRef<HTMLDivElement>(null);
  const [vp, setVp] = useState<Viewport>(initialViewport);
  const vpRef = useRef(vp);
  vpRef.current = vp;
  const [boxMode, setBoxMode] = useState(false);
  const [panning, setPanning] = useState(false);
  const [box, setBox] = useState<Box | null>(null);
  const [link, setLink] = useState<PendingLink | null>(null);
  const [menu, setMenu] = useState<ContextMenuState | null>(null);
  const menuKey = useRef(0);
  /** Last pointer position over the stage (client coords) for Ctrl+V */
  const lastPointer = useRef<XY | null>(null);

  // Persist viewport through the store's autosave (debounced)
  useEffect(() => {
    const t = setTimeout(() => {
      const cur = useCanvasStore.getState().canvas?.viewport;
      if (cur && cur.x === vp.x && cur.y === vp.y && cur.zoom === vp.zoom)
        return;
      setViewport(vp);
    }, 400);
    return () => clearTimeout(t);
  }, [vp, setViewport]);

  const toLocal = useCallback((cx: number, cy: number): XY => {
    const r = stageRef.current?.getBoundingClientRect();
    return { x: cx - (r?.left ?? 0), y: cy - (r?.top ?? 0) };
  }, []);

  const toWorld = useCallback(
    (cx: number, cy: number): XY => {
      const p = toLocal(cx, cy);
      const v = vpRef.current;
      return { x: (p.x - v.x) / v.zoom, y: (p.y - v.y) / v.zoom };
    },
    [toLocal],
  );

  // Wheel zoom around the cursor (non-passive to block page zoom/scroll)
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const sc = (e.target as Element).closest?.("[data-wheel-scroll]");
      if (sc && sc.scrollHeight > sc.clientHeight && !e.ctrlKey) return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015));
      setVp((v) =>
        zoomAt(v, e.clientX - r.left, e.clientY - r.top, v.zoom * factor),
      );
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const deleteSelected = useCallback(() => {
    const st = useCanvasStore.getState();
    if (st.selectedEdgeId) st.disconnect(st.selectedEdgeId);
    else if (st.selection.length) st.deleteNodes(st.selection);
  }, []);

  const pasteTarget = useCallback((): XY => {
    const p = lastPointer.current;
    if (p) return toWorld(p.x, p.y);
    const r = stageRef.current?.getBoundingClientRect();
    const v = vpRef.current;
    return {
      x: ((r?.width ?? 1200) / 2 - v.x) / v.zoom - 140,
      y: ((r?.height ?? 800) / 2 - v.y) / v.zoom - 110,
    };
  }, [toWorld]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      if (document.querySelector("[role='dialog'], [role='menu']")) return;
      const st = useCanvasStore.getState();
      if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey) {
        const k = e.key.toLowerCase();
        if (k === "c") {
          if (window.getSelection()?.toString()) return;
          const n = st.copy();
          if (n) {
            e.preventDefault();
            toast.success(`已复制 ${n} 张卡片`);
          }
        } else if (k === "v") {
          if (!st.hasClipboard) return;
          e.preventDefault();
          st.paste(pasteTarget());
        } else if (k === "d") {
          e.preventDefault();
          st.duplicate();
        }
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteSelected();
      } else if (e.key === "Escape") {
        st.clearSelection();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deleteSelected, pasteTarget]);

  const onContextMenu = (e: MouseEvent<HTMLDivElement>) => {
    // Keep the native menu for text editing inside node bodies
    if (isTypingTarget(e.target)) return;
    e.preventDefault();
    const target = e.target as Element;
    if (!stageRef.current?.contains(target)) return;
    const client = { x: e.clientX, y: e.clientY };
    const world = toWorld(e.clientX, e.clientY);
    menuKey.current += 1;
    const id = target.closest("[data-node-id]")?.getAttribute("data-node-id");
    const st = useCanvasStore.getState();
    const node = id ? st.getNode(id) : undefined;
    if (!node) {
      setMenu({ key: menuKey.current, kind: "canvas", client, world });
      return;
    }
    if (!st.selection.includes(node.id)) st.setSelection([node.id]);
    setMenu({
      key: menuKey.current,
      kind: "node",
      client,
      world,
      nodeId: node.id,
      nodeType: node.type,
      ids: [...useCanvasStore.getState().selection],
      canRun: canRunNode(node.id),
    });
  };

  const onStagePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.target as Node)) return;
    const st = useCanvasStore.getState();
    if (e.button === 1 || (e.button === 0 && !boxMode && !e.shiftKey)) {
      e.preventDefault();
      setPanning(true);
      startDrag(e, {
        move: (_, dx, dy) => setVp((v) => ({ ...v, x: v.x + dx, y: v.y + dy })),
        up: (_, moved) => {
          setPanning(false);
          if (!moved && e.button === 0) st.clearSelection();
        },
      });
      return;
    }
    if (e.button !== 0) return;
    const additive = e.shiftKey;
    const start = toLocal(e.clientX, e.clientY);
    const startClient = { x: e.clientX, y: e.clientY };
    setBox({ x0: start.x, y0: start.y, x1: start.x, y1: start.y });
    startDrag(e, {
      move: (ev) => {
        const p = toLocal(ev.clientX, ev.clientY);
        setBox({ x0: start.x, y0: start.y, x1: p.x, y1: p.y });
      },
      up: (ev, moved) => {
        setBox(null);
        if (!moved) {
          if (!additive) st.clearSelection();
          return;
        }
        const l = Math.min(startClient.x, ev.clientX);
        const r = Math.max(startClient.x, ev.clientX);
        const t = Math.min(startClient.y, ev.clientY);
        const b = Math.max(startClient.y, ev.clientY);
        const hits: string[] = [];
        for (const el of stageRef.current?.querySelectorAll("[data-node-id]") ??
          []) {
          const rc = el.getBoundingClientRect();
          if (rc.right > l && rc.left < r && rc.bottom > t && rc.top < b) {
            hits.push(el.getAttribute("data-node-id") ?? "");
          }
        }
        const cur = useCanvasStore.getState().selection;
        st.setSelection(
          additive ? Array.from(new Set([...cur, ...hits])) : hits,
        );
      },
    });
  };

  const onNodePointerDown = useCallback(
    (e: PointerEvent, id: string) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      if (!e.currentTarget.contains(e.target as Node)) return;
      const st = useCanvasStore.getState();
      if (e.shiftKey) {
        st.toggleSelection(id);
        return;
      }
      const wasSelected = st.selection.includes(id);
      if (!wasSelected) st.setSelection([id]);
      if (isInteractiveTarget(e.target)) return;
      const ids = useCanvasStore.getState().selection;
      startDrag(e, {
        move: (_, dx, dy) => {
          const z = vpRef.current.zoom;
          moveNodesBy(ids, dx / z, dy / z);
        },
        up: (_, moved) => {
          if (!moved && wasSelected && ids.length > 1) st.setSelection([id]);
        },
      });
    },
    [moveNodesBy],
  );

  const onStartLink = useCallback(
    (e: PointerEvent, id: string) => {
      const st = useCanvasStore.getState();
      const node = st.getNode(id);
      if (!node) return;
      const from = {
        x: node.position.x + nodeWidth(node),
        y: node.position.y + HANDLE_Y,
      };
      setLink({ source: id, from, to: from, target: null });
      startDrag(e, {
        move: (ev) => {
          const target = nodeIdAt(ev.clientX, ev.clientY, id);
          const tn = target ? useCanvasStore.getState().getNode(target) : null;
          const to = tn
            ? { x: tn.position.x, y: tn.position.y + HANDLE_Y }
            : toWorld(ev.clientX, ev.clientY);
          setLink((l) => (l ? { ...l, to, target } : l));
        },
        up: (ev) => {
          setLink(null);
          const target = nodeIdAt(ev.clientX, ev.clientY, id);
          if (target && !useCanvasStore.getState().connect(id, target)) {
            toast.error("无法连接：连线已存在，或会形成循环");
          }
        },
      });
    },
    [toWorld],
  );

  const stageSize = () => {
    const r = stageRef.current?.getBoundingClientRect();
    return { w: r?.width ?? 1200, h: r?.height ?? 800 };
  };

  const zoomBy = (factor: number) => {
    const { w, h } = stageSize();
    setVp((v) => zoomAt(v, w / 2, h / 2, v.zoom * factor));
  };

  const fitAll = () => {
    const els =
      stageRef.current?.querySelectorAll<HTMLElement>("[data-node-id]");
    if (!els || els.length === 0) {
      setVp({ x: 0, y: 0, zoom: 1 });
      return;
    }
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    for (const el of els) {
      minX = Math.min(minX, el.offsetLeft);
      minY = Math.min(minY, el.offsetTop);
      maxX = Math.max(maxX, el.offsetLeft + el.offsetWidth);
      maxY = Math.max(maxY, el.offsetTop + el.offsetHeight);
    }
    const { w, h } = stageSize();
    const zoom = clampZoom(
      Math.min((w - 200) / (maxX - minX), (h - 120) / (maxY - minY), 1.2),
    );
    setVp({
      zoom,
      x: w / 2 - ((minX + maxX) / 2) * zoom,
      y: h / 2 - ((minY + maxY) / 2) * zoom,
    });
  };

  const addAtCenter = (type: NodeType) => {
    const { w, h } = stageSize();
    const v = vpRef.current;
    const count = useCanvasStore.getState().canvas?.nodes.length ?? 0;
    const offset = (count % 6) * 28;
    addNode(type, {
      x: Math.round(
        (w / 2 - v.x) / v.zoom - NODE_META[type].width / 2 + offset,
      ),
      y: Math.round((h / 2 - v.y) / v.zoom - 110 + offset),
    });
  };

  const addAt = (type: NodeType, world: XY) => {
    addNode(type, { x: Math.round(world.x), y: Math.round(world.y) });
  };

  const ordinals = useMemo(() => {
    const counters: Partial<Record<NodeType, number>> = {};
    const map = new Map<string, number>();
    for (const n of nodes) {
      counters[n.type] = (counters[n.type] ?? 0) + 1;
      map.set(n.id, counters[n.type] ?? 1);
    }
    return map;
  }, [nodes]);

  const selectedSet = new Set(selection);
  const deleteLabel = selectedEdgeId
    ? "删除所选连线"
    : selection.length
      ? `删除所选 ${selection.length} 张卡片`
      : null;

  const gridStyle = {
    "--grid-size": `${GRID_SIZE * vp.zoom}px`,
    "--grid-x": `${vp.x}px`,
    "--grid-y": `${vp.y}px`,
  } as CSSProperties;

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      onContextMenu={onContextMenu}
    >
      <div
        ref={stageRef}
        onPointerDown={onStagePointerDown}
        onPointerMove={(e) => {
          lastPointer.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerLeave={() => {
          lastPointer.current = null;
        }}
        className={`canvas-grid absolute inset-0 touch-none select-none ${
          panning
            ? "cursor-grabbing"
            : boxMode
              ? "cursor-crosshair"
              : "cursor-grab"
        }`}
        style={gridStyle}
        data-ocid="canvas_editor.canvas_target"
      >
        <div
          className="absolute left-0 top-0 origin-top-left cursor-default"
          style={{
            transform: `translate(${vp.x}px, ${vp.y}px) scale(${vp.zoom})`,
          }}
        >
          <EdgeLayer
            nodes={nodes}
            edges={edges}
            selectedEdgeId={selectedEdgeId}
            onSelectEdge={selectEdge}
            pending={link}
          />
          {nodes.map((n, i) => {
            const ordinal = ordinals.get(n.id) ?? 1;
            return (
              <NodeCard
                key={n.id}
                node={n}
                index={i + 1}
                title={
                  n.data.title?.trim() ||
                  `${NODE_META[n.type].label}-${ordinal}`
                }
                selected={selectedSet.has(n.id)}
                linkTarget={link?.target === n.id}
                onPointerDown={onNodePointerDown}
                onStartLink={onStartLink}
              />
            );
          })}
        </div>
        {box && (
          <div
            className="pointer-events-none absolute rounded-sm border border-primary/70 bg-primary/10"
            style={{
              left: Math.min(box.x0, box.x1),
              top: Math.min(box.y0, box.y1),
              width: Math.abs(box.x1 - box.x0),
              height: Math.abs(box.y1 - box.y0),
            }}
          />
        )}
      </div>

      <NodeToolbar onAdd={addAtCenter} />

      {nodes.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div
            className="surface-float pointer-events-auto max-w-sm rounded-2xl p-6 text-center shadow-float"
            data-ocid="canvas_editor.empty_state"
          >
            <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <Workflow className="h-5 w-5" aria-hidden />
            </span>
            <h2 className="mt-3 font-display text-lg font-semibold">
              这块画布还是空的
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              从左侧工具栏添加卡片，再拖动卡片右侧的圆点连到下游卡片，文字和图片就会顺着连线传递。
            </p>
            <div className="mt-4 flex justify-center gap-2">
              {(["prompt", "imageRef"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => addAtCenter(t)}
                  className={`${NODE_META[t].className} flex h-8 items-center gap-1.5 rounded-lg bg-secondary px-3 text-xs font-medium transition-smooth hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
                  data-ocid={`canvas_editor.empty_add_${t}.button`}
                >
                  <Plus className="node-text h-3.5 w-3.5" aria-hidden />
                  添加{NODE_META[t].label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <p className="pointer-events-none absolute bottom-5 left-4 z-10 hidden text-[11px] text-muted-foreground/80 md:block">
        拖动空白处平移 · 滚轮缩放 · Shift 拖动框选 · 右键打开菜单 · Delete
        删除所选
      </p>

      {menu && (
        <CanvasContextMenu
          key={menu.key}
          menu={menu}
          onClose={() => setMenu(null)}
          onAddNode={addAt}
          onFitAll={fitAll}
        />
      )}

      <ViewControls
        zoom={vp.zoom}
        onZoomIn={() => zoomBy(1.2)}
        onZoomOut={() => zoomBy(1 / 1.2)}
        onReset={() => {
          const { w, h } = stageSize();
          setVp((v) => zoomAt(v, w / 2, h / 2, 1));
        }}
        onFit={fitAll}
        boxMode={boxMode}
        onToggleBox={() => setBoxMode((b) => !b)}
        deleteLabel={deleteLabel}
        onDelete={deleteSelected}
      />
    </div>
  );
}
