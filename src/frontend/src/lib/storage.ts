import {
  type Canvas,
  type CanvasNode,
  type CanvasSummary,
  IDLE_RUN,
  createId,
} from "@/types";

const DB_NAME = "jingtai-storyboard";
const DB_VERSION = 1;
const CANVAS_STORE = "canvases";
const MEDIA_STORE = "media";
const EXPORT_FORMAT = "jingtai-canvas";

interface MediaRecord {
  id: string;
  blob: Blob;
  mime: string;
  createdAt: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(
        new Error("当前浏览器不支持本地存储（IndexedDB），无法保存画布。"),
      );
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(CANVAS_STORE)) {
        db.createObjectStore(CANVAS_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(MEDIA_STORE)) {
        db.createObjectStore(MEDIA_STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      dbPromise = null;
      reject(
        new Error(`无法打开本地数据库：${req.error?.message ?? "未知错误"}`),
      );
    };
  });
  return dbPromise;
}

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () =>
      reject(
        new Error(`本地存储操作失败：${req.error?.message ?? "未知错误"}`),
      );
  });
}

async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();
  const tx = db.transaction(storeName, mode);
  return reqToPromise(fn(tx.objectStore(storeName)));
}

/* ---------------------------- media helpers ---------------------------- */

/** Media ids referenced by a node */
export function nodeMediaIds(node: CanvasNode): string[] {
  switch (node.type) {
    case "imageRef":
      return node.data.mediaId ? [node.data.mediaId] : [];
    case "imageGen":
      return [...node.data.resultMediaIds];
    case "video":
    case "voice":
      return node.data.resultMediaId ? [node.data.resultMediaId] : [];
    default:
      return [];
  }
}

function remapNodeMedia(
  node: CanvasNode,
  map: Map<string, string>,
): CanvasNode {
  const m = (id?: string) => (id ? map.get(id) : undefined);
  switch (node.type) {
    case "imageRef":
      return { ...node, data: { ...node.data, mediaId: m(node.data.mediaId) } };
    case "imageGen":
      return {
        ...node,
        data: {
          ...node.data,
          resultMediaIds: node.data.resultMediaIds
            .map((id) => map.get(id))
            .filter((id): id is string => !!id),
        },
      };
    case "video":
      return {
        ...node,
        data: { ...node.data, resultMediaId: m(node.data.resultMediaId) },
      };
    case "voice":
      return {
        ...node,
        data: { ...node.data, resultMediaId: m(node.data.resultMediaId) },
      };
    default:
      return node;
  }
}

const urlCache = new Map<string, string>();

export async function putMedia(
  blob: Blob,
  id = createId("media"),
): Promise<string> {
  const record: MediaRecord = {
    id,
    blob,
    mime: blob.type || "application/octet-stream",
    createdAt: Date.now(),
  };
  await withStore(MEDIA_STORE, "readwrite", (s) => s.put(record));
  return id;
}

export async function getMediaBlob(id: string): Promise<Blob | null> {
  const rec = await withStore<MediaRecord | undefined>(
    MEDIA_STORE,
    "readonly",
    (s) => s.get(id),
  );
  return rec?.blob ?? null;
}

/** Returns a cached object URL for the media blob, or null if missing */
export async function getMediaUrl(id: string): Promise<string | null> {
  const cached = urlCache.get(id);
  if (cached) return cached;
  const blob = await getMediaBlob(id);
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  urlCache.set(id, url);
  return url;
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("读取媒体文件失败"));
    reader.readAsDataURL(blob);
  });
}

/** Data URL (base64) of a stored media blob, for relay image inputs */
export async function getMediaDataUrl(id: string): Promise<string | null> {
  const blob = await getMediaBlob(id);
  return blob ? blobToDataUrl(blob) : null;
}

export async function deleteMedia(id: string): Promise<void> {
  const url = urlCache.get(id);
  if (url) {
    URL.revokeObjectURL(url);
    urlCache.delete(id);
  }
  await withStore(MEDIA_STORE, "readwrite", (s) => s.delete(id));
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}

/* --------------------------- canvas functions -------------------------- */

function summarize(c: Canvas): CanvasSummary {
  let coverMediaId: string | undefined;
  for (const n of c.nodes) {
    if (n.type === "imageGen" && n.data.resultMediaIds[0]) {
      coverMediaId = n.data.resultMediaIds[0];
      break;
    }
    if (n.type === "imageRef" && n.data.mediaId && !coverMediaId) {
      coverMediaId = n.data.mediaId;
    }
  }
  return {
    id: c.id,
    name: c.name,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    nodeCount: c.nodes.length,
    edgeCount: c.edges.length,
    coverMediaId,
  };
}

export async function listCanvases(): Promise<CanvasSummary[]> {
  const all = await withStore<Canvas[]>(CANVAS_STORE, "readonly", (s) =>
    s.getAll(),
  );
  return all.map(summarize).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getCanvas(id: string): Promise<Canvas | null> {
  const c = await withStore<Canvas | undefined>(CANVAS_STORE, "readonly", (s) =>
    s.get(id),
  );
  return c ?? null;
}

/** Persists the canvas as-is (caller sets updatedAt) */
export async function saveCanvas(canvas: Canvas): Promise<void> {
  await withStore(CANVAS_STORE, "readwrite", (s) => s.put(canvas));
}

export async function createCanvas(
  name = "未命名画布",
  init?: Partial<Pick<Canvas, "nodes" | "edges" | "viewport">>,
): Promise<Canvas> {
  const now = Date.now();
  const canvas: Canvas = {
    id: createId("canvas"),
    name: name.trim() || "未命名画布",
    createdAt: now,
    updatedAt: now,
    viewport: init?.viewport ?? { x: 0, y: 0, zoom: 1 },
    nodes: init?.nodes ?? [],
    edges: init?.edges ?? [],
  };
  await saveCanvas(canvas);
  return canvas;
}

export async function renameCanvas(id: string, name: string): Promise<void> {
  const c = await getCanvas(id);
  if (!c) throw new Error("画布不存在或已被删除");
  await saveCanvas({
    ...c,
    name: name.trim() || c.name,
    updatedAt: Date.now(),
  });
}

export async function deleteCanvas(id: string): Promise<void> {
  const c = await getCanvas(id);
  if (c) {
    for (const mediaId of c.nodes.flatMap(nodeMediaIds)) {
      await deleteMedia(mediaId);
    }
  }
  await withStore(CANVAS_STORE, "readwrite", (s) => s.delete(id));
}

/* ---------------------------- export / import -------------------------- */

interface ExportFile {
  format: typeof EXPORT_FORMAT;
  version: 1;
  exportedAt: number;
  canvas: Canvas;
  media: Record<string, string>;
}

/** Builds the export JSON (media embedded as base64 data URLs) and downloads it */
export async function exportCanvas(id: string): Promise<void> {
  const canvas = await getCanvas(id);
  if (!canvas) throw new Error("画布不存在或已被删除");
  const media: Record<string, string> = {};
  for (const mediaId of canvas.nodes.flatMap(nodeMediaIds)) {
    const dataUrl = await getMediaDataUrl(mediaId);
    if (dataUrl) media[mediaId] = dataUrl;
  }
  const file: ExportFile = {
    format: EXPORT_FORMAT,
    version: 1,
    exportedAt: Date.now(),
    canvas,
    media,
  };
  const blob = new Blob([JSON.stringify(file)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const safeName = canvas.name.replace(/[\\/:*?"<>|]/g, "_");
  a.href = url;
  a.download = `${safeName || "画布"}.jingtai.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Imports an exported file into a brand-new canvas with fresh ids */
export async function importCanvas(file: File): Promise<Canvas> {
  let parsed: ExportFile;
  try {
    parsed = JSON.parse(await file.text()) as ExportFile;
  } catch {
    throw new Error("文件不是有效的 JSON，无法导入");
  }
  if (
    parsed?.format !== EXPORT_FORMAT ||
    !parsed.canvas ||
    !Array.isArray(parsed.canvas.nodes)
  ) {
    throw new Error("文件格式不正确：请选择由镜台导出的画布文件");
  }
  const map = new Map<string, string>();
  for (const [oldId, dataUrl] of Object.entries(parsed.media ?? {})) {
    const blob = await dataUrlToBlob(dataUrl);
    map.set(oldId, await putMedia(blob));
  }
  const nodeIdMap = new Map<string, string>();
  const nodes = parsed.canvas.nodes.map((n) => {
    const newId = createId("node");
    nodeIdMap.set(n.id, newId);
    return {
      ...remapNodeMedia(n, map),
      id: newId,
      run: { ...IDLE_RUN },
    } as CanvasNode;
  });
  const edges = (parsed.canvas.edges ?? [])
    .filter((e) => nodeIdMap.has(e.source) && nodeIdMap.has(e.target))
    .map((e) => ({
      ...e,
      id: createId("edge"),
      source: nodeIdMap.get(e.source) as string,
      target: nodeIdMap.get(e.target) as string,
    }));
  return createCanvas(`${parsed.canvas.name || "导入画布"}（导入）`, {
    nodes,
    edges,
    viewport: parsed.canvas.viewport,
  });
}
