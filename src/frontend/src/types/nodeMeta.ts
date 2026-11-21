import type {
  CanvasNode,
  NodeDataMap,
  NodeRunState,
  NodeRunStatus,
  NodeType,
  XY,
} from "./canvas";

export interface NodeTypeMeta {
  type: NodeType;
  /** Chinese display label */
  label: string;
  /** Short description for toolbars / tooltips */
  description: string;
  /** Identity class from index.css (.node-prompt etc.) */
  className: string;
  /** Default card width in px */
  width: number;
  /** Whether the card can run a relay call */
  runnable: boolean;
}

export const NODE_TYPES: NodeType[] = [
  "prompt",
  "imageRef",
  "chat",
  "imageGen",
  "video",
  "voice",
];

export const NODE_META: Record<NodeType, NodeTypeMeta> = {
  prompt: {
    type: "prompt",
    label: "提示词",
    description: "输入文字描述，作为下游卡片的文本输入",
    className: "node-prompt",
    width: 280,
    runnable: false,
  },
  imageRef: {
    type: "imageRef",
    label: "参考图",
    description: "上传本地图片，作为下游卡片的图片输入",
    className: "node-image-ref",
    width: 280,
    runnable: false,
  },
  chat: {
    type: "chat",
    label: "AI 对话",
    description: "与模型对话，扩写剧本或分镜描述",
    className: "node-chat",
    width: 320,
    runnable: true,
  },
  imageGen: {
    type: "imageGen",
    label: "生图",
    description: "根据上游文字与参考图生成画面",
    className: "node-image-gen",
    width: 300,
    runnable: true,
  },
  video: {
    type: "video",
    label: "视频生成",
    description: "根据上游文字与画面生成视频片段",
    className: "node-video",
    width: 320,
    runnable: true,
  },
  voice: {
    type: "voice",
    label: "配音",
    description: "把台词文字转成语音",
    className: "node-voice",
    width: 280,
    runnable: true,
  },
};

export const RUN_STATUS_LABELS: Record<NodeRunStatus, string> = {
  idle: "空闲",
  running: "运行中",
  success: "完成",
  error: "失败",
};

export const IDLE_RUN: NodeRunState = { status: "idle" };

export function createId(prefix = "id"): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 12)
      : Math.random().toString(36).slice(2, 14);
  return `${prefix}_${rand}`;
}

export function defaultNodeData<T extends NodeType>(type: T): NodeDataMap[T] {
  const defaults: NodeDataMap = {
    prompt: { text: "" },
    imageRef: {},
    chat: { messages: [] },
    imageGen: { prompt: "", size: "1024x1024", n: 1, resultMediaIds: [] },
    video: { prompt: "", seconds: 5, size: "1280x720" },
    voice: { text: "" },
  };
  return defaults[type] as NodeDataMap[T];
}

export function createNode<T extends NodeType>(
  type: T,
  position: XY,
  data?: Partial<NodeDataMap[T]>,
): CanvasNode {
  return {
    id: createId("node"),
    type,
    position,
    data: { ...defaultNodeData(type), ...data },
    run: { ...IDLE_RUN },
  } as CanvasNode;
}

/** Card title: custom title or "<label>-<index>" style fallback */
export function nodeTitle(node: CanvasNode): string {
  return node.data.title?.trim() || NODE_META[node.type].label;
}
