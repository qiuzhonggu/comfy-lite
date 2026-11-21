export type NodeType =
  | "prompt"
  | "imageRef"
  | "chat"
  | "imageGen"
  | "video"
  | "voice";

export type NodeRunStatus = "idle" | "running" | "success" | "error";

export interface NodeRunState {
  status: NodeRunStatus;
  /** Readable Chinese error message when status is "error" */
  error?: string;
  /** Short progress text, e.g. "排队中" or "生成中 64%" */
  progress?: string;
  /** Last update timestamp in ms */
  updatedAt?: number;
  /** Non-blocking notice, e.g. the chosen model was removed and the default was used */
  warning?: string;
}

export interface XY {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export interface PromptData {
  title?: string;
  text: string;
}

export interface ImageRefData {
  title?: string;
  mediaId?: string;
  fileName?: string;
}

export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
}

export interface ChatData {
  title?: string;
  messages: ChatMessage[];
  /** Relay chosen for this node; empty = default chat relay */
  relayId?: string;
  /** Model chosen for this node; empty = default chat model */
  model?: string;
  systemPrompt?: string;
}

export interface ImageGenData {
  title?: string;
  /** Extra prompt appended to upstream text */
  prompt: string;
  /** Relay chosen for this node; empty = default image relay */
  relayId?: string;
  model?: string;
  size: string;
  n: number;
  resultMediaIds: string[];
}

export interface VideoData {
  title?: string;
  prompt: string;
  /** Relay chosen for this node; empty = default video relay */
  relayId?: string;
  model?: string;
  /** Duration in seconds */
  seconds: number;
  size: string;
  taskId?: string;
  /** Raw relay task status text, e.g. "queued" */
  taskStatus?: string;
  resultMediaId?: string;
}

export interface VoiceData {
  title?: string;
  text: string;
  /** Overrides RelaySettings.ttsVoice when set */
  voice?: string;
  model?: string;
  resultMediaId?: string;
}

export interface NodeDataMap {
  prompt: PromptData;
  imageRef: ImageRefData;
  chat: ChatData;
  imageGen: ImageGenData;
  video: VideoData;
  voice: VoiceData;
}

interface NodeOf<T extends NodeType> {
  id: string;
  type: T;
  position: XY;
  size?: Size;
  data: NodeDataMap[T];
  run: NodeRunState;
}

export type PromptNode = NodeOf<"prompt">;
export type ImageRefNode = NodeOf<"imageRef">;
export type ChatNode = NodeOf<"chat">;
export type ImageGenNode = NodeOf<"imageGen">;
export type VideoNode = NodeOf<"video">;
export type VoiceNode = NodeOf<"voice">;

export type CanvasNode =
  | PromptNode
  | ImageRefNode
  | ChatNode
  | ImageGenNode
  | VideoNode
  | VoiceNode;

export type NodeOfType<T extends NodeType> = Extract<CanvasNode, { type: T }>;

export interface CanvasEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle: string;
  targetHandle: string;
}

export interface Canvas {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  viewport: Viewport;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

export interface CanvasSummary {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  nodeCount: number;
  edgeCount: number;
  /** First image found on the canvas, for a list thumbnail */
  coverMediaId?: string;
}

export interface UpstreamInputs {
  /** Direct upstream nodes in edge order */
  sources: CanvasNode[];
  /** Non-empty texts from prompt / chat (last assistant reply) / voice nodes */
  texts: string[];
  /** Image media ids from imageRef / imageGen nodes */
  imageMediaIds: string[];
}
