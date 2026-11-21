import {
  type CanvasEdge,
  type CanvasNode,
  createId,
  createNode,
} from "@/types";
import { createCanvas, listCanvases } from "./storage";

const SEEDED_KEY = "jingtai.sampleSeeded";

function edge(source: CanvasNode, target: CanvasNode): CanvasEdge {
  return {
    id: createId("edge"),
    source: source.id,
    target: target.id,
    sourceHandle: "out",
    targetHandle: "in",
  };
}

/** Nodes and edges for 示例分镜画布 */
export function buildSampleCanvas(): {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
} {
  const scene = createNode(
    "prompt",
    { x: 80, y: 80 },
    {
      title: "分镜 1 · 画面描述",
      text: "深夜的街角咖啡馆，大雨滂沱，昏黄的灯光透过被雨水模糊的玻璃窗，室内空无一人，电影感，35mm 胶片质感，冷暖对比。",
    },
  );
  const still = createNode(
    "imageGen",
    { x: 440, y: 60 },
    { title: "分镜 1 · 关键帧", size: "1536x1024", n: 1 },
  );
  const clip = createNode(
    "video",
    { x: 820, y: 60 },
    {
      title: "分镜 1 · 镜头",
      prompt: "镜头缓慢推近窗边空座，雨滴沿玻璃滑落，灯光轻微闪烁。",
      seconds: 5,
      size: "1280x720",
    },
  );
  const line = createNode(
    "prompt",
    { x: 80, y: 420 },
    { title: "分镜 1 · 台词", text: "雨下得这么大，他应该不会来了吧。" },
  );
  const dub = createNode(
    "voice",
    { x: 440, y: 440 },
    { title: "分镜 1 · 旁白配音" },
  );

  return {
    nodes: [scene, still, clip, line, dub],
    edges: [edge(scene, still), edge(still, clip), edge(line, dub)],
  };
}

let seeding: Promise<void> | null = null;

/** Seeds the sample canvas once, only when no canvases exist */
export function ensureSampleSeeded(): Promise<void> {
  if (seeding) return seeding;
  seeding = (async () => {
    try {
      if (localStorage.getItem(SEEDED_KEY)) return;
    } catch {
      return;
    }
    const existing = await listCanvases();
    if (existing.length === 0) {
      await createCanvas("示例分镜画布", {
        ...buildSampleCanvas(),
        viewport: { x: 40, y: 40, zoom: 0.9 },
      });
    }
    localStorage.setItem(SEEDED_KEY, "1");
  })();
  return seeding;
}
