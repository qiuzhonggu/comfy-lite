import {
  DEFAULT_RELAY_SETTINGS,
  type ModelKind,
  type Relay,
  type RelaySettings,
} from "@/types";

/** Builds the flat connection view relay functions take; `model` becomes the kind's default */
export function relayToSettings(
  relay: Pick<Relay, "baseUrl" | "apiKey">,
  kind?: ModelKind,
  model?: string,
  base: RelaySettings = DEFAULT_RELAY_SETTINGS,
): RelaySettings {
  const s: RelaySettings = {
    ...base,
    baseUrl: relay.baseUrl,
    apiKey: relay.apiKey,
  };
  if (kind && model) {
    if (kind === "chat") s.chatModel = model;
    if (kind === "image") s.imageModel = model;
    if (kind === "video") s.videoModel = model;
  }
  return s;
}

export class RelayError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "RelayError";
    this.status = status;
  }
}

type Json = Record<string, unknown>;

export function isRelayConfigured(
  s: Pick<RelaySettings, "baseUrl" | "apiKey">,
): boolean {
  return s.baseUrl.trim().length > 0 && s.apiKey.trim().length > 0;
}

/** Strips trailing slashes and an optional trailing /v1 */
export function normalizeBaseUrl(baseUrl: string): string {
  let url = baseUrl.trim().replace(/\/+$/, "");
  if (/\/v1$/i.test(url)) url = url.slice(0, -3);
  return url.replace(/\/+$/, "");
}

function endpoint(s: RelaySettings, path: string): string {
  return `${normalizeBaseUrl(s.baseUrl)}/v1${path}`;
}

function ensureConfigured(s: RelaySettings) {
  if (!isRelayConfigured(s)) {
    throw new RelayError(
      "尚未配置中转站：请先在“设置”中填写中转站地址和 API Key。",
    );
  }
}

function pick(obj: unknown, path: string[]): unknown {
  let cur: unknown = obj;
  for (const key of path) {
    if (cur && typeof cur === "object" && key in (cur as Json)) {
      cur = (cur as Json)[key];
    } else {
      return undefined;
    }
  }
  return cur;
}

function firstString(obj: unknown, paths: string[][]): string | undefined {
  for (const p of paths) {
    const v = pick(obj, p);
    if (typeof v === "string" && v.trim()) return v;
    if (typeof v === "number") return String(v);
  }
  return undefined;
}

async function readErrorMessage(res: Response): Promise<string> {
  const text = await res.text().catch(() => "");
  if (!text) return res.statusText || "无返回内容";
  try {
    const json = JSON.parse(text) as unknown;
    return (
      firstString(json, [
        ["error", "message"],
        ["error"],
        ["message"],
        ["detail"],
        ["msg"],
      ]) ?? text.slice(0, 300)
    );
  } catch {
    return text.slice(0, 300);
  }
}

async function relayFetch(
  s: RelaySettings,
  path: string,
  init: RequestInit & { action: string },
): Promise<Response> {
  ensureConfigured(s);
  const { action, headers, ...rest } = init;
  let res: Response;
  try {
    res = await fetch(endpoint(s, path), {
      ...rest,
      headers: {
        Authorization: `Bearer ${s.apiKey.trim()}`,
        ...(rest.body ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new RelayError(
      `${action}失败：无法从浏览器连接到中转站（${normalizeBaseUrl(s.baseUrl)}）。请检查地址是否正确、中转站是否在线，以及是否允许浏览器跨域（CORS）访问。`,
    );
  }
  if (!res.ok) {
    const msg = await readErrorMessage(res);
    throw new RelayError(
      `${action}失败（HTTP ${res.status}）：${msg}`,
      res.status,
    );
  }
  return res;
}

async function relayJson(
  s: RelaySettings,
  path: string,
  init: RequestInit & { action: string },
): Promise<unknown> {
  const res = await relayFetch(s, path, init);
  try {
    return (await res.json()) as unknown;
  } catch {
    throw new RelayError(
      `${init.action}失败：中转站返回的内容不是有效的 JSON。`,
    );
  }
}

/** Downloads a media URL returned by the relay into a Blob */
async function downloadBlob(
  s: RelaySettings,
  url: string,
  action: string,
  signal?: AbortSignal,
): Promise<Blob> {
  if (url.startsWith("data:")) return (await fetch(url)).blob();
  const sameRelay = url.startsWith(normalizeBaseUrl(s.baseUrl));
  let res: Response;
  try {
    res = await fetch(url, {
      signal,
      headers: sameRelay
        ? { Authorization: `Bearer ${s.apiKey.trim()}` }
        : undefined,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new RelayError(
      `${action}失败：结果已生成，但浏览器无法下载结果文件（可能被跨域 CORS 限制）。地址：${url}`,
    );
  }
  if (!res.ok) {
    throw new RelayError(
      `${action}失败：下载结果文件出错（HTTP ${res.status}）。`,
      res.status,
    );
  }
  return res.blob();
}

/* ------------------------------- models -------------------------------- */

export async function testConnection(
  s: RelaySettings,
): Promise<{ models: string[] }> {
  const json = await relayJson(s, "/models", {
    method: "GET",
    action: "测试连接",
  });
  const data = pick(json, ["data"]);
  const models = Array.isArray(data)
    ? data
        .map((m) =>
          typeof m === "string" ? m : firstString(m, [["id"], ["name"]]),
        )
        .filter((m): m is string => !!m)
    : [];
  return { models };
}

/* -------------------------------- chat --------------------------------- */

export interface RelayChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export async function chatCompletion(opts: {
  settings: RelaySettings;
  messages: RelayChatMessage[];
  model?: string;
  /** Image data URLs attached to the last user message */
  images?: string[];
  signal?: AbortSignal;
}): Promise<string> {
  const { settings, messages, images = [], signal } = opts;
  const lastUser = messages.map((m) => m.role).lastIndexOf("user");
  const payload = messages.map((m, i) => {
    if (i !== lastUser || images.length === 0) return m;
    const parts: ContentPart[] = [
      { type: "text", text: m.content },
      ...images.map((url) => ({
        type: "image_url" as const,
        image_url: { url },
      })),
    ];
    return { role: m.role, content: parts };
  });
  const json = await relayJson(settings, "/chat/completions", {
    method: "POST",
    action: "AI 对话",
    signal,
    body: JSON.stringify({
      model: opts.model?.trim() || settings.chatModel,
      messages: payload,
      stream: false,
    }),
  });
  const content = pick(json, ["choices", "0", "message", "content"]);
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((p) =>
        typeof p === "string" ? p : (firstString(p, [["text"]]) ?? ""),
      )
      .join("");
  }
  throw new RelayError("AI 对话失败：中转站没有返回回复内容。");
}

/* ------------------------------- images -------------------------------- */

export async function generateImage(opts: {
  settings: RelaySettings;
  prompt: string;
  model?: string;
  size?: string;
  n?: number;
  /** Reference image data URLs */
  referenceImages?: string[];
  signal?: AbortSignal;
}): Promise<Blob[]> {
  const { settings, signal, referenceImages = [] } = opts;
  const body: Json = {
    model: opts.model?.trim() || settings.imageModel,
    prompt: opts.prompt,
    n: opts.n ?? 1,
  };
  if (opts.size) body.size = opts.size;
  if (referenceImages.length > 0) {
    body.image =
      referenceImages.length === 1 ? referenceImages[0] : referenceImages;
  }
  const json = await relayJson(settings, "/images/generations", {
    method: "POST",
    action: "生图",
    signal,
    body: JSON.stringify(body),
  });
  const data = pick(json, ["data"]);
  if (!Array.isArray(data) || data.length === 0) {
    throw new RelayError("生图失败：中转站没有返回图片。");
  }
  const blobs: Blob[] = [];
  for (const item of data) {
    const b64 = firstString(item, [["b64_json"]]);
    const url = firstString(item, [["url"]]);
    if (b64) {
      blobs.push(await (await fetch(`data:image/png;base64,${b64}`)).blob());
    } else if (url) {
      blobs.push(await downloadBlob(settings, url, "生图", signal));
    }
  }
  if (blobs.length === 0)
    throw new RelayError("生图失败：返回结果中没有 b64_json 或 url。");
  return blobs;
}

/* ------------------------------- videos -------------------------------- */

export type VideoTaskState = "pending" | "running" | "success" | "error";

export interface VideoPollResult {
  state: VideoTaskState;
  rawStatus: string;
  /** 0–100 when the relay reports it */
  progress?: number;
  videoUrl?: string;
  error?: string;
}

export async function submitVideo(opts: {
  settings: RelaySettings;
  prompt: string;
  model?: string;
  seconds?: number;
  size?: string;
  /** First-frame / reference image data URL */
  image?: string;
  signal?: AbortSignal;
}): Promise<string> {
  const { settings, signal } = opts;
  const body: Json = {
    model: opts.model?.trim() || settings.videoModel,
    prompt: opts.prompt,
  };
  if (opts.seconds) body.seconds = String(opts.seconds);
  if (opts.size) body.size = opts.size;
  if (opts.image) {
    body.input_reference = opts.image;
    body.image = opts.image;
  }
  const json = await relayJson(settings, "/videos", {
    method: "POST",
    action: "提交视频任务",
    signal,
    body: JSON.stringify(body),
  });
  const id = firstString(json, [
    ["id"],
    ["task_id"],
    ["data", "id"],
    ["data", "task_id"],
    ["data"],
  ]);
  if (!id) throw new RelayError("提交视频任务失败：中转站没有返回任务 ID。");
  return id;
}

function classifyStatus(raw: string): VideoTaskState {
  const s = raw.toLowerCase();
  if (
    [
      "completed",
      "complete",
      "succeeded",
      "success",
      "done",
      "finished",
    ].includes(s)
  ) {
    return "success";
  }
  if (
    ["failed", "failure", "error", "cancelled", "canceled", "expired"].includes(
      s,
    )
  ) {
    return "error";
  }
  if (
    [
      "queued",
      "pending",
      "submitted",
      "not_start",
      "waiting",
      "created",
    ].includes(s)
  ) {
    return "pending";
  }
  return "running";
}

export async function pollVideo(opts: {
  settings: RelaySettings;
  taskId: string;
  signal?: AbortSignal;
}): Promise<VideoPollResult> {
  const json = await relayJson(
    opts.settings,
    `/videos/${encodeURIComponent(opts.taskId)}`,
    {
      method: "GET",
      action: "查询视频任务",
      signal: opts.signal,
    },
  );
  const rawStatus =
    firstString(json, [
      ["status"],
      ["state"],
      ["data", "status"],
      ["task_status"],
      ["data", "task_status"],
    ]) ?? "unknown";
  const videoUrl = firstString(json, [
    ["video_url"],
    ["url"],
    ["data", "video_url"],
    ["data", "url"],
    ["data", "output"],
    ["output", "url"],
    ["output", "video_url"],
    ["result", "video_url"],
    ["result", "url"],
    ["videos", "0", "url"],
    ["data", "videos", "0", "url"],
    ["content", "video_url"],
  ]);
  const progressRaw = firstString(json, [["progress"], ["data", "progress"]]);
  const progressNum = progressRaw ? Number.parseFloat(progressRaw) : Number.NaN;
  const error = firstString(json, [
    ["error", "message"],
    ["error"],
    ["fail_reason"],
    ["data", "fail_reason"],
    ["message"],
  ]);
  let state = classifyStatus(rawStatus);
  if (state !== "error" && videoUrl && rawStatus === "unknown")
    state = "success";
  return {
    state,
    rawStatus,
    progress: Number.isNaN(progressNum)
      ? undefined
      : progressNum <= 1 && progressRaw?.includes(".")
        ? Math.round(progressNum * 100)
        : Math.round(progressNum),
    videoUrl,
    error: state === "error" ? (error ?? "视频生成失败") : undefined,
  };
}

/** Downloads the finished video; falls back to GET /v1/videos/{id}/content */
export async function downloadVideo(opts: {
  settings: RelaySettings;
  taskId: string;
  videoUrl?: string;
  signal?: AbortSignal;
}): Promise<Blob> {
  if (opts.videoUrl) {
    return downloadBlob(opts.settings, opts.videoUrl, "下载视频", opts.signal);
  }
  const res = await relayFetch(
    opts.settings,
    `/videos/${encodeURIComponent(opts.taskId)}/content`,
    { method: "GET", action: "下载视频", signal: opts.signal },
  );
  return res.blob();
}

/** Polls until the task finishes, then returns the downloaded video blob */
export async function waitForVideo(opts: {
  settings: RelaySettings;
  taskId: string;
  onProgress?: (r: VideoPollResult) => void;
  intervalMs?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
}): Promise<Blob> {
  const interval = opts.intervalMs ?? 5000;
  const deadline = Date.now() + (opts.timeoutMs ?? 20 * 60 * 1000);
  while (Date.now() < deadline) {
    const r = await pollVideo(opts);
    opts.onProgress?.(r);
    if (r.state === "success") {
      return downloadVideo({ ...opts, videoUrl: r.videoUrl });
    }
    if (r.state === "error") {
      throw new RelayError(
        `视频生成失败（状态 ${r.rawStatus}）：${r.error ?? "未知原因"}`,
      );
    }
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(resolve, interval);
      opts.signal?.addEventListener("abort", () => {
        clearTimeout(t);
        reject(new DOMException("已取消", "AbortError"));
      });
    });
  }
  throw new RelayError(
    "视频生成超时：任务在 20 分钟内未完成，可稍后重新查询。",
  );
}

/* -------------------------------- speech ------------------------------- */

export async function textToSpeech(opts: {
  settings: RelaySettings;
  text: string;
  voice?: string;
  model?: string;
  format?: "mp3" | "wav" | "opus" | "aac" | "flac";
  signal?: AbortSignal;
}): Promise<Blob> {
  const { settings } = opts;
  const res = await relayFetch(settings, "/audio/speech", {
    method: "POST",
    action: "配音",
    signal: opts.signal,
    body: JSON.stringify({
      model: opts.model?.trim() || settings.ttsModel,
      input: opts.text,
      voice: opts.voice?.trim() || settings.ttsVoice,
      response_format: opts.format ?? "mp3",
    }),
  });
  const blob = await res.blob();
  if (blob.type.includes("json")) {
    throw new RelayError(
      `配音失败：${await readErrorMessage(new Response(blob))}`,
    );
  }
  return blob.type ? blob : new Blob([blob], { type: "audio/mpeg" });
}
