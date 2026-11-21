import { listModelOptions } from "@/lib/modelResolve";
import type { RelayChatMessage } from "@/lib/relay";
import type { AiMessage, AiOpsSummary } from "@/store/aiAssistantStore";
import type { ApplyResult, CanvasOperation } from "@/store/canvasStore";
import {
  type AppSettings,
  type Canvas,
  type CanvasNode,
  NODE_META,
  NODE_TYPES,
  type NodeType,
  type XY,
  nodeTitle,
} from "@/types";

const MAX_TEXT = 800;
const HISTORY_LIMIT = 12;

type Json = Record<string, unknown>;

function clip(s: string | undefined, n = MAX_TEXT): string | undefined {
  const t = s?.trim();
  if (!t) return undefined;
  return t.length > n ? `${t.slice(0, n)}…（已截断）` : t;
}

/** Editable text content and model choice of a node */
function nodeContent(n: CanvasNode): Json {
  switch (n.type) {
    case "prompt":
      return { text: clip(n.data.text) };
    case "imageRef":
      return { fileName: n.data.fileName, hasImage: !!n.data.mediaId };
    case "chat": {
      const last = [...n.data.messages]
        .reverse()
        .find((m) => m.role === "assistant");
      return {
        systemPrompt: clip(n.data.systemPrompt),
        relayId: n.data.relayId,
        model: n.data.model,
        messageCount: n.data.messages.length,
        lastReply: clip(last?.content, 400),
      };
    }
    case "imageGen":
      return {
        prompt: clip(n.data.prompt),
        size: n.data.size,
        n: n.data.n,
        relayId: n.data.relayId,
        model: n.data.model,
        resultCount: n.data.resultMediaIds.length,
      };
    case "video":
      return {
        prompt: clip(n.data.prompt),
        seconds: n.data.seconds,
        size: n.data.size,
        relayId: n.data.relayId,
        model: n.data.model,
        hasResult: !!n.data.resultMediaId,
      };
    case "voice":
      return {
        text: clip(n.data.text),
        voice: n.data.voice,
        model: n.data.model,
        hasResult: !!n.data.resultMediaId,
      };
    default:
      return {};
  }
}

/** Compact JSON context of the canvas for the model */
export function serializeCanvas(
  canvas: Canvas,
  config: AppSettings,
  focusIds: string[] = [],
): string {
  const models = {
    chat: listModelOptions(config, "chat"),
    image: listModelOptions(config, "image"),
    video: listModelOptions(config, "video"),
  };
  return JSON.stringify({
    name: canvas.name,
    nodes: canvas.nodes.map((n) => ({
      id: n.id,
      type: n.type,
      label: NODE_META[n.type].label,
      title: nodeTitle(n),
      x: Math.round(n.position.x),
      y: Math.round(n.position.y),
      ...nodeContent(n),
    })),
    edges: canvas.edges.map((e) => ({ source: e.source, target: e.target })),
    focus: focusIds.length > 0 ? focusIds : undefined,
    models,
  });
}

export const CANVAS_AI_SYSTEM_PROMPT = `你是「镜台」视频创作画布的 AI 助手。用户在节点画布上搭建视频创作流程：上游节点的文字和图片会沿连线传给下游节点。

节点类型（type）与可修改字段（data）：
- prompt（提示词）：text 文字描述
- imageRef（参考图）：只能改 title，图片需用户自己上传
- chat（AI 对话）：systemPrompt 系统提示词、relayId、model
- imageGen（生图）：prompt 补充描述、size（如 1024x1024）、n 张数（1-4）、relayId、model
- video（视频生成）：prompt、seconds 时长秒数、size（如 1280x720）、relayId、model
- voice（配音）：text 台词、voice 音色
所有节点都可以设置 title 标题。不要修改生成结果、媒体文件或任务字段。relayId 与 model 只能使用上下文 models 中列出的组合。

连线：source 是上游，target 是下游，例如 prompt → imageGen → video。连线不能成环。

坐标：position 是节点左上角的画布坐标（像素），x 向右、y 向下。节点宽约 280–320、高约 160–260；排列时横向间隔约 380、纵向间隔约 300，避免重叠。新增节点优先放在现有节点右侧或下方的空白处。

回复格式：
1. 先用简短中文（1-3 句）说明你做了哪些改动，或直接回答用户的问题。
2. 需要修改画布时，在说明后附上一个 \`\`\`json 代码块，内容为 {"operations": [...]}，可用操作：
{"op":"add","ref":"n1","type":"prompt","position":{"x":0,"y":0},"data":{"title":"开场","text":"…"}}
{"op":"update","id":"节点id或ref","data":{"text":"…"}}
{"op":"delete","ids":["节点id"]}
{"op":"connect","source":"id或ref","target":"id或ref"}
{"op":"disconnect","source":"节点id","target":"节点id"}
{"op":"move","id":"id或ref","position":{"x":0,"y":0}}
新增节点请给 ref（如 n1、n2），同一批中后面的操作可以用 ref 引用它；已有节点必须使用上下文中的真实 id。
3. 只回答问题、不需要修改画布时，不要输出代码块。
4. 用户提到“选中的节点”“这些节点”时，指上下文 focus 中的节点；除非用户要求，不要改动其他节点。`;

export function buildRequestMessages(opts: {
  canvas: Canvas;
  config: AppSettings;
  history: AiMessage[];
  text: string;
  focusIds: string[];
  wholeCanvas: boolean;
}): RelayChatMessage[] {
  const { canvas, config, history, text, focusIds, wholeCanvas } = opts;
  const past: RelayChatMessage[] = history
    .filter((m) => !m.error && m.content.trim())
    .slice(-HISTORY_LIMIT)
    .map((m) => ({ role: m.role, content: m.content }));
  const focusLine = wholeCanvas
    ? "用户希望你处理整个画布。"
    : focusIds.length > 0
      ? `用户选中了 ${focusIds.length} 个节点（见 focus），请针对这些节点操作。`
      : "";
  const content = [
    "【当前画布】",
    serializeCanvas(canvas, config, wholeCanvas ? [] : focusIds),
    focusLine,
    "【用户指令】",
    text,
  ]
    .filter(Boolean)
    .join("\n\n");
  return [
    { role: "system", content: CANVAS_AI_SYSTEM_PROMPT },
    ...past,
    { role: "user", content },
  ];
}

/* ------------------------------ parsing ------------------------------- */

export interface ParsedReply {
  /** Explanation text with the JSON block removed */
  text: string;
  operations: CanvasOperation[];
  /** Chinese notes for blocks or ops that could not be read */
  errors: string[];
}

const isRecord = (v: unknown): v is Json =>
  !!v && typeof v === "object" && !Array.isArray(v);

function tryJson(src: string): unknown {
  try {
    return JSON.parse(src);
  } catch {
    try {
      return JSON.parse(src.replace(/,\s*([}\]])/g, "$1"));
    } catch {
      return undefined;
    }
  }
}

function extractOps(value: unknown): unknown[] | null {
  if (Array.isArray(value)) return value;
  if (isRecord(value)) {
    const list = value.operations ?? value.ops ?? value.actions;
    if (Array.isArray(list)) return list;
  }
  return null;
}

function toXY(v: unknown): XY | undefined {
  if (!isRecord(v)) return undefined;
  const x = Number(v.x);
  const y = Number(v.y);
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : undefined;
}

function toNodeType(v: unknown): NodeType | undefined {
  const key = String(v ?? "")
    .replace(/[_\-\s]/g, "")
    .toLowerCase();
  return NODE_TYPES.find((t) => t.toLowerCase() === key);
}

const str = (v: unknown): string | undefined =>
  typeof v === "string" && v.trim() ? v.trim() : undefined;

/** Normalizes one raw op; null when unusable */
function normalizeOp(raw: unknown, place: () => XY): CanvasOperation | null {
  if (!isRecord(raw)) return null;
  const kind = String(raw.op ?? raw.action ?? "").toLowerCase();
  const data = isRecord(raw.data) ? raw.data : undefined;
  const pos = toXY(raw.position) ?? toXY(raw);
  switch (kind) {
    case "add": {
      const type = toNodeType(raw.type ?? raw.nodeType);
      if (!type) return null;
      return {
        op: "add",
        ref: str(raw.ref),
        type,
        position: pos ?? place(),
        data,
      };
    }
    case "update": {
      const id = str(raw.id);
      return id && data ? { op: "update", id, data } : null;
    }
    case "delete": {
      const ids = Array.isArray(raw.ids)
        ? raw.ids.map(str).filter((x): x is string => !!x)
        : [str(raw.id)].filter((x): x is string => !!x);
      return ids.length > 0 ? { op: "delete", ids } : null;
    }
    case "connect":
    case "disconnect": {
      const source = str(raw.source ?? raw.from);
      const target = str(raw.target ?? raw.to);
      return source && target ? { op: kind, source, target } : null;
    }
    case "move": {
      const id = str(raw.id);
      return id && pos ? { op: "move", id, position: pos } : null;
    }
    default:
      return null;
  }
}

/** Finds the operations JSON in a reply; tolerates fences and plain answers */
export function parseReply(raw: string, canvas?: Canvas | null): ParsedReply {
  const errors: string[] = [];
  let text = raw.trim();
  let rawOps: unknown[] | null = null;

  const candidates: { full: string; body: string }[] = [];
  for (const m of text.matchAll(/```[a-zA-Z]*\s*([\s\S]*?)```/g)) {
    candidates.push({ full: m[0], body: m[1] });
  }
  const unclosed = text.match(/```(?:json|JSON)?\s*([\s\S]*)$/);
  if (candidates.length === 0 && unclosed)
    candidates.push({ full: unclosed[0], body: unclosed[1] });
  const bare = text.search(/\{\s*"(?:operations|ops)"\s*:/);
  if (candidates.length === 0 && bare >= 0) {
    const end = text.lastIndexOf("}");
    const full = text.slice(bare, end + 1);
    candidates.push({ full, body: full });
  }

  for (const c of candidates) {
    const looksLikeOps = /"op"\s*:|"operations"\s*:/.test(c.body);
    const ops = extractOps(tryJson(c.body.trim()));
    if (ops) {
      rawOps = ops;
      text = text.replace(c.full, "").trim();
      break;
    }
    if (looksLikeOps) {
      errors.push("AI 返回的操作格式有误，未能执行这部分改动");
      text = text.replace(c.full, "").trim();
    }
  }

  const maxX = canvas?.nodes.length
    ? Math.max(...canvas.nodes.map((n) => n.position.x))
    : -380;
  const minY = canvas?.nodes.length
    ? Math.min(...canvas.nodes.map((n) => n.position.y))
    : 0;
  let placed = 0;
  const place = (): XY => ({ x: maxX + 380, y: minY + 300 * placed++ });

  const operations: CanvasOperation[] = [];
  for (const r of rawOps ?? []) {
    const op = normalizeOp(r, place);
    if (op) operations.push(op);
    else errors.push("有一条操作无法识别，已跳过");
  }
  return { text, operations, errors };
}

/* ------------------------------ summary ------------------------------- */

export function summarizeResult(
  result: ApplyResult | null,
  extraErrors: string[] = [],
): AiOpsSummary {
  const errors = [...extraErrors, ...(result?.errors ?? [])];
  return {
    added: result?.added.length ?? 0,
    updated: result?.updated.length ?? 0,
    deleted: result?.deleted.length ?? 0,
    connected: result?.connected ?? 0,
    disconnected: result?.disconnected ?? 0,
    moved: result?.moved.length ?? 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/** Chinese pieces like ["新增 1 个节点", "连接 2 条"] */
export function opsSummaryParts(s: AiOpsSummary): string[] {
  const parts: [number, string][] = [
    [s.added, `新增 ${s.added} 个节点`],
    [s.updated, `修改 ${s.updated} 个节点`],
    [s.deleted, `删除 ${s.deleted} 个节点`],
    [s.connected, `连接 ${s.connected} 条`],
    [s.disconnected, `断开 ${s.disconnected} 条`],
    [s.moved, `移动 ${s.moved} 个节点`],
  ];
  return parts.filter(([n]) => n > 0).map(([, label]) => label);
}
