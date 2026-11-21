import { getMediaDataUrl } from "@/lib/storage";
import { useCanvasStore } from "@/store/canvasStore";
import type { UpstreamInputs } from "@/types";

const EMPTY: UpstreamInputs = { sources: [], texts: [], imageMediaIds: [] };

/** Reactive upstream inputs: re-computed whenever the canvas changes */
export function useUpstream(nodeId: string): UpstreamInputs {
  const canvas = useCanvasStore((s) => s.canvas);
  const collect = useCanvasStore((s) => s.collectUpstream);
  return canvas ? collect(nodeId) : EMPTY;
}

/** Fresh upstream snapshot for run handlers */
export function readUpstream(nodeId: string): UpstreamInputs {
  return useCanvasStore.getState().collectUpstream(nodeId);
}

export async function toDataUrls(mediaIds: string[]): Promise<string[]> {
  const urls = await Promise.all(mediaIds.map((id) => getMediaDataUrl(id)));
  return urls.filter((u): u is string => !!u);
}
