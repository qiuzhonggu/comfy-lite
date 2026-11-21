import { getCanvas, saveCanvas } from "@/lib/storage";
import {
  type Canvas,
  type CanvasEdge,
  type CanvasNode,
  type NodeDataMap,
  type NodeRunState,
  type NodeType,
  type Size,
  type UpstreamInputs,
  type Viewport,
  type XY,
  createId,
  createNode,
} from "@/types";
import { create } from "zustand";

export type SaveState = "idle" | "saving" | "saved" | "error";

/** A node reference: an existing node id, or a `ref` given to an earlier add op */
type NodeRef = string;

export type CanvasOperation =
  | {
      op: "add";
      /** Temporary name later ops in the same batch can use instead of an id */
      ref?: string;
      type: NodeType;
      position: XY;
      data?: Record<string, unknown>;
    }
  | { op: "update"; id: NodeRef; data: Record<string, unknown> }
  | { op: "delete"; ids: NodeRef[] }
  | { op: "connect"; source: NodeRef; target: NodeRef }
  | { op: "disconnect"; source: NodeRef; target: NodeRef }
  | { op: "move"; id: NodeRef; position: XY };

export interface ApplyResult {
  added: string[];
  updated: string[];
  deleted: string[];
  connected: number;
  disconnected: number;
  moved: string[];
  /** Chinese descriptions of skipped operations */
  errors: string[];
  /** ref -> new node id for add ops that gave a ref */
  refs: Record<string, string>;
}

const NODE_TYPES: NodeType[] = [
  "prompt",
  "imageRef",
  "chat",
  "imageGen",
  "video",
  "voice",
];

/** Fields the AI may not overwrite (results, media and task ids) */
const PROTECTED_KEYS = new Set([
  "resultMediaIds",
  "resultMediaId",
  "mediaId",
  "taskId",
  "taskStatus",
  "messages",
]);

function cleanPatch(data: Record<string, unknown> | undefined) {
  const out: Record<string, unknown> = {};
  if (!data) return out;
  for (const [k, v] of Object.entries(data)) {
    if (!PROTECTED_KEYS.has(k) && v !== undefined) out[k] = v;
  }
  return out;
}

interface Clipboard {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}
let clipboard: Clipboard | null = null;
let touchTimer: ReturnType<typeof setTimeout> | null = null;

/** Deep copies nodes with fresh ids and idle run state, remapping internal edges */
function cloneGroup(
  nodes: CanvasNode[],
  edges: CanvasEdge[],
  dx: number,
  dy: number,
): Clipboard {
  const idMap = new Map<string, string>();
  const newNodes = nodes.map((n) => {
    const id = createId("node");
    idMap.set(n.id, id);
    return {
      ...structuredClone(n),
      id,
      position: { x: n.position.x + dx, y: n.position.y + dy },
      run: { status: "idle" },
    } as CanvasNode;
  });
  const newEdges = edges
    .filter((e) => idMap.has(e.source) && idMap.has(e.target))
    .map((e) => ({
      ...e,
      id: createId("edge"),
      source: idMap.get(e.source) as string,
      target: idMap.get(e.target) as string,
    }));
  return { nodes: newNodes, edges: newEdges };
}

interface CanvasState {
  canvas: Canvas | null;
  loading: boolean;
  loadError: string | null;
  saveState: SaveState;
  selection: string[];
  selectedEdgeId: string | null;

  openCanvas: (id: string) => Promise<void>;
  closeCanvas: () => Promise<void>;
  renameCanvas: (name: string) => void;
  setViewport: (viewport: Viewport) => void;

  addNode: <T extends NodeType>(
    type: T,
    position: XY,
    data?: Partial<NodeDataMap[T]>,
  ) => string;
  moveNode: (id: string, position: XY) => void;
  moveNodesBy: (ids: string[], dx: number, dy: number) => void;
  resizeNode: (id: string, size: Size) => void;
  updateNodeData: <T extends NodeType>(
    id: string,
    patch: Partial<NodeDataMap[T]>,
  ) => void;
  setNodeRun: (id: string, run: Partial<NodeRunState>) => void;
  deleteNodes: (ids: string[]) => void;

  /** Returns false if the edge would be a duplicate, self-loop or cycle */
  connect: (
    source: string,
    target: string,
    sourceHandle?: string,
    targetHandle?: string,
  ) => boolean;
  disconnect: (edgeId: string) => void;

  setSelection: (ids: string[]) => void;
  toggleSelection: (id: string) => void;
  selectEdge: (edgeId: string | null) => void;
  clearSelection: () => void;

  /** Removes every edge touching the node */
  disconnectAll: (nodeId: string) => void;
  selectAll: () => void;

  /** True when the in-memory clipboard holds nodes */
  hasClipboard: boolean;
  /** Copies the given (default: selected) nodes and the edges between them; returns count */
  copy: (ids?: string[]) => number;
  /** Pastes the clipboard with its top-left at `position`; returns new ids (selected) */
  paste: (position: XY) => string[];
  /** Offset copies of the given (default: selected) nodes; returns new ids (selected) */
  duplicate: (ids?: string[], offset?: XY) => string[];

  /** Batch API for the AI panel; one autosave, refs let later ops target new nodes */
  applyOperations: (ops: CanvasOperation[]) => ApplyResult;
  /** Node ids recently changed by AI (for the .ai-touched flash) */
  aiTouched: string[];
  markAiTouched: (ids: string[]) => void;

  getNode: (id: string) => CanvasNode | undefined;
  collectUpstream: (nodeId: string) => UpstreamInputs;
  flushSave: () => Promise<void>;
}

const SAVE_DELAY = 600;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
/** Incremented on every open/close so stale async loads are discarded */
let loadToken = 0;
/** True once the open canvas was renamed in the editor since it was loaded */
let nameEditedLocally = false;

/** Running jobs can't survive a reload; reset them on open */
function resetStaleRuns(nodes: CanvasNode[]): CanvasNode[] {
  return nodes.map((n) =>
    n.run?.status === "running"
      ? {
          ...n,
          run: {
            status: "idle",
            progress:
              n.type === "video" && n.data.taskId
                ? "上次任务未完成，可重新查询"
                : undefined,
          },
        }
      : { ...n, run: n.run ?? { status: "idle" } },
  );
}

function wouldCycle(
  edges: CanvasEdge[],
  source: string,
  target: string,
): boolean {
  const stack = [target];
  const seen = new Set<string>();
  while (stack.length) {
    const cur = stack.pop() as string;
    if (cur === source) return true;
    if (seen.has(cur)) continue;
    seen.add(cur);
    for (const e of edges) if (e.source === cur) stack.push(e.target);
  }
  return false;
}

export const useCanvasStore = create<CanvasState>((set, get) => {
  const scheduleSave = () => {
    if (saveTimer) clearTimeout(saveTimer);
    set({ saveState: "saving" });
    saveTimer = setTimeout(() => {
      saveTimer = null;
      void get().flushSave();
    }, SAVE_DELAY);
  };

  /** Applies a mutation to the open canvas and schedules autosave */
  const mutate = (fn: (c: Canvas) => Partial<Canvas>) => {
    const c = get().canvas;
    if (!c) return;
    set({ canvas: { ...c, ...fn(c), updatedAt: Date.now() } });
    scheduleSave();
  };

  const mapNode = (id: string, fn: (n: CanvasNode) => CanvasNode) =>
    mutate((c) => ({ nodes: c.nodes.map((n) => (n.id === id ? fn(n) : n)) }));

  return {
    canvas: null,
    loading: false,
    loadError: null,
    saveState: "idle",
    selection: [],
    selectedEdgeId: null,

    openCanvas: async (id) => {
      const token = ++loadToken;
      // Flush the previous in-memory canvas, then always reload from storage
      // so edits made elsewhere (e.g. a rename on the list page) are current.
      await get().flushSave();
      if (token !== loadToken) return;
      nameEditedLocally = false;
      set({
        loading: true,
        loadError: null,
        canvas: null,
        selection: [],
        selectedEdgeId: null,
      });
      try {
        const c = await getCanvas(id);
        if (token !== loadToken) return;
        if (!c) {
          set({ loading: false, loadError: "画布不存在或已被删除" });
          return;
        }
        set({
          canvas: { ...c, nodes: resetStaleRuns(c.nodes) },
          loading: false,
          saveState: "idle",
        });
      } catch (err) {
        if (token !== loadToken) return;
        set({
          loading: false,
          loadError: err instanceof Error ? err.message : "读取画布失败",
        });
      }
    },

    closeCanvas: async () => {
      loadToken++;
      await get().flushSave();
      nameEditedLocally = false;
      set({
        canvas: null,
        selection: [],
        selectedEdgeId: null,
        saveState: "idle",
      });
    },

    renameCanvas: (name) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      nameEditedLocally = true;
      mutate(() => ({ name: trimmed }));
    },

    setViewport: (viewport) => mutate(() => ({ viewport })),

    addNode: (type, position, data) => {
      const node = createNode(type, position, data);
      mutate((c) => ({ nodes: [...c.nodes, node] }));
      set({ selection: [node.id], selectedEdgeId: null });
      return node.id;
    },

    moveNode: (id, position) => mapNode(id, (n) => ({ ...n, position })),

    moveNodesBy: (ids, dx, dy) => {
      const idSet = new Set(ids);
      mutate((c) => ({
        nodes: c.nodes.map((n) =>
          idSet.has(n.id)
            ? { ...n, position: { x: n.position.x + dx, y: n.position.y + dy } }
            : n,
        ),
      }));
    },

    resizeNode: (id, size) => mapNode(id, (n) => ({ ...n, size })),

    updateNodeData: (id, patch) =>
      mapNode(
        id,
        (n) => ({ ...n, data: { ...n.data, ...patch } }) as CanvasNode,
      ),

    setNodeRun: (id, run) =>
      mapNode(id, (n) => ({
        ...n,
        run: {
          ...n.run,
          ...run,
          ...(run.status && run.status !== "error" ? { error: run.error } : {}),
          updatedAt: Date.now(),
        },
      })),

    deleteNodes: (ids) => {
      const idSet = new Set(ids);
      mutate((c) => ({
        nodes: c.nodes.filter((n) => !idSet.has(n.id)),
        edges: c.edges.filter(
          (e) => !idSet.has(e.source) && !idSet.has(e.target),
        ),
      }));
      set((s) => ({ selection: s.selection.filter((id) => !idSet.has(id)) }));
    },

    connect: (source, target, sourceHandle = "out", targetHandle = "in") => {
      const c = get().canvas;
      if (!c || source === target) return false;
      if (c.edges.some((e) => e.source === source && e.target === target))
        return false;
      if (wouldCycle(c.edges, source, target)) return false;
      const edge: CanvasEdge = {
        id: createId("edge"),
        source,
        target,
        sourceHandle,
        targetHandle,
      };
      mutate((cv) => ({ edges: [...cv.edges, edge] }));
      return true;
    },

    disconnect: (edgeId) => {
      mutate((c) => ({ edges: c.edges.filter((e) => e.id !== edgeId) }));
      set((s) => ({
        selectedEdgeId: s.selectedEdgeId === edgeId ? null : s.selectedEdgeId,
      }));
    },

    disconnectAll: (nodeId) => {
      const c = get().canvas;
      if (!c?.edges.some((e) => e.source === nodeId || e.target === nodeId))
        return;
      mutate((cv) => ({
        edges: cv.edges.filter(
          (e) => e.source !== nodeId && e.target !== nodeId,
        ),
      }));
      set({ selectedEdgeId: null });
    },

    selectAll: () =>
      set({
        selection: get().canvas?.nodes.map((n) => n.id) ?? [],
        selectedEdgeId: null,
      }),

    hasClipboard: false,

    copy: (ids) => {
      const c = get().canvas;
      if (!c) return 0;
      const idSet = new Set(ids ?? get().selection);
      const nodes = c.nodes.filter((n) => idSet.has(n.id));
      if (nodes.length === 0) return 0;
      clipboard = structuredClone({
        nodes,
        edges: c.edges.filter(
          (e) => idSet.has(e.source) && idSet.has(e.target),
        ),
      });
      set({ hasClipboard: true });
      return nodes.length;
    },

    paste: (position) => {
      if (!get().canvas || !clipboard || clipboard.nodes.length === 0)
        return [];
      const minX = Math.min(...clipboard.nodes.map((n) => n.position.x));
      const minY = Math.min(...clipboard.nodes.map((n) => n.position.y));
      const group = cloneGroup(
        clipboard.nodes,
        clipboard.edges,
        position.x - minX,
        position.y - minY,
      );
      mutate((c) => ({
        nodes: [...c.nodes, ...group.nodes],
        edges: [...c.edges, ...group.edges],
      }));
      const newIds = group.nodes.map((n) => n.id);
      set({ selection: newIds, selectedEdgeId: null });
      return newIds;
    },

    duplicate: (ids, offset = { x: 40, y: 40 }) => {
      const c = get().canvas;
      if (!c) return [];
      const idSet = new Set(ids ?? get().selection);
      const nodes = c.nodes.filter((n) => idSet.has(n.id));
      if (nodes.length === 0) return [];
      const group = cloneGroup(nodes, c.edges, offset.x, offset.y);
      mutate((cv) => ({
        nodes: [...cv.nodes, ...group.nodes],
        edges: [...cv.edges, ...group.edges],
      }));
      const newIds = group.nodes.map((n) => n.id);
      set({ selection: newIds, selectedEdgeId: null });
      return newIds;
    },

    applyOperations: (ops) => {
      const result: ApplyResult = {
        added: [],
        updated: [],
        deleted: [],
        connected: 0,
        disconnected: 0,
        moved: [],
        errors: [],
        refs: {},
      };
      const c = get().canvas;
      if (!c) {
        result.errors.push("没有打开的画布");
        return result;
      }
      let nodes = [...c.nodes];
      let edges = [...c.edges];
      const resolve = (ref: NodeRef): string | undefined => {
        const id = result.refs[ref] ?? ref;
        return nodes.some((n) => n.id === id) ? id : undefined;
      };
      const isNum = (v: unknown) => typeof v === "number" && Number.isFinite(v);
      const validXY = (p: XY | undefined) => !!p && isNum(p.x) && isNum(p.y);

      for (const op of ops) {
        switch (op.op) {
          case "add": {
            if (!NODE_TYPES.includes(op.type)) {
              result.errors.push(`未知节点类型：${String(op.type)}`);
              break;
            }
            const pos = validXY(op.position) ? op.position : { x: 0, y: 0 };
            const node = createNode(
              op.type,
              pos,
              cleanPatch(op.data) as Partial<NodeDataMap[typeof op.type]>,
            );
            nodes.push(node);
            if (op.ref) result.refs[op.ref] = node.id;
            result.added.push(node.id);
            break;
          }
          case "update": {
            const id = resolve(op.id);
            if (!id) {
              result.errors.push(`找不到要修改的节点：${op.id}`);
              break;
            }
            const patch = cleanPatch(op.data);
            nodes = nodes.map((n) =>
              n.id === id
                ? ({ ...n, data: { ...n.data, ...patch } } as CanvasNode)
                : n,
            );
            result.updated.push(id);
            break;
          }
          case "delete": {
            const ids = new Set(
              op.ids.map(resolve).filter((x): x is string => !!x),
            );
            if (ids.size === 0) break;
            nodes = nodes.filter((n) => !ids.has(n.id));
            edges = edges.filter(
              (e) => !ids.has(e.source) && !ids.has(e.target),
            );
            result.deleted.push(...ids);
            break;
          }
          case "connect": {
            const s = resolve(op.source);
            const t = resolve(op.target);
            if (
              !s ||
              !t ||
              s === t ||
              edges.some((e) => e.source === s && e.target === t) ||
              wouldCycle(edges, s, t)
            ) {
              result.errors.push(`无法连接：${op.source} → ${op.target}`);
              break;
            }
            edges.push({
              id: createId("edge"),
              source: s,
              target: t,
              sourceHandle: "out",
              targetHandle: "in",
            });
            result.connected++;
            break;
          }
          case "disconnect": {
            const s = resolve(op.source);
            const t = resolve(op.target);
            const before = edges.length;
            edges = edges.filter((e) => !(e.source === s && e.target === t));
            result.disconnected += before - edges.length;
            break;
          }
          case "move": {
            const id = resolve(op.id);
            if (!id || !validXY(op.position)) {
              result.errors.push(`无法移动节点：${op.id}`);
              break;
            }
            nodes = nodes.map((n) =>
              n.id === id ? { ...n, position: { ...op.position } } : n,
            );
            result.moved.push(id);
            break;
          }
          default:
            result.errors.push("未知操作");
        }
      }

      const changed =
        result.added.length +
          result.updated.length +
          result.deleted.length +
          result.connected +
          result.disconnected +
          result.moved.length >
        0;
      if (changed) {
        mutate(() => ({ nodes, edges }));
        const alive = new Set(nodes.map((n) => n.id));
        set((s) => ({
          selection: s.selection.filter((id) => alive.has(id)),
          selectedEdgeId: null,
        }));
        get().markAiTouched(
          [...result.added, ...result.updated, ...result.moved].filter((id) =>
            alive.has(id),
          ),
        );
      }
      return result;
    },

    aiTouched: [],
    markAiTouched: (ids) => {
      if (touchTimer) clearTimeout(touchTimer);
      set({ aiTouched: [...new Set(ids)] });
      touchTimer = setTimeout(() => {
        touchTimer = null;
        set({ aiTouched: [] });
      }, 2400);
    },

    setSelection: (ids) => set({ selection: ids, selectedEdgeId: null }),
    toggleSelection: (id) =>
      set((s) => ({
        selection: s.selection.includes(id)
          ? s.selection.filter((x) => x !== id)
          : [...s.selection, id],
        selectedEdgeId: null,
      })),
    selectEdge: (edgeId) => set({ selectedEdgeId: edgeId, selection: [] }),
    clearSelection: () => set({ selection: [], selectedEdgeId: null }),

    getNode: (id) => get().canvas?.nodes.find((n) => n.id === id),

    collectUpstream: (nodeId) => {
      const c = get().canvas;
      const result: UpstreamInputs = {
        sources: [],
        texts: [],
        imageMediaIds: [],
      };
      if (!c) return result;
      for (const e of c.edges) {
        if (e.target !== nodeId) continue;
        const n = c.nodes.find((x) => x.id === e.source);
        if (!n) continue;
        result.sources.push(n);
        switch (n.type) {
          case "prompt":
            if (n.data.text.trim()) result.texts.push(n.data.text.trim());
            break;
          case "chat": {
            const reply = [...n.data.messages]
              .reverse()
              .find((m) => m.role === "assistant");
            if (reply?.content.trim()) result.texts.push(reply.content.trim());
            break;
          }
          case "voice":
            if (n.data.text.trim()) result.texts.push(n.data.text.trim());
            break;
          case "imageRef":
            if (n.data.mediaId) result.imageMediaIds.push(n.data.mediaId);
            break;
          case "imageGen":
            result.imageMediaIds.push(...n.data.resultMediaIds);
            break;
          default:
            break;
        }
      }
      return result;
    },

    flushSave: async () => {
      if (saveTimer) {
        clearTimeout(saveTimer);
        saveTimer = null;
      }
      const c = get().canvas;
      if (!c || get().saveState !== "saving") return;
      try {
        let toSave = c;
        if (!nameEditedLocally) {
          // Never overwrite a newer stored name (e.g. renamed on the list page)
          const stored = await getCanvas(c.id);
          if (stored && stored.name !== c.name) {
            toSave = { ...c, name: stored.name };
            if (get().canvas === c) set({ canvas: toSave });
          }
        }
        await saveCanvas(toSave);
        if (get().canvas === c || get().canvas === toSave)
          set({ saveState: "saved" });
      } catch {
        set({ saveState: "error" });
      }
    },
  };
});
