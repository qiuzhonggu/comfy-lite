import {
  buildRequestMessages,
  parseReply,
  summarizeResult,
} from "@/lib/canvasAi";
import { resolveModel } from "@/lib/modelResolve";
import { chatCompletion } from "@/lib/relay";
import {
  type AiOpsSummary,
  useAiAssistantStore,
} from "@/store/aiAssistantStore";
import { useCanvasStore } from "@/store/canvasStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useEffect, useRef, useState } from "react";

/** Explicit context handed over from a right-click menu */
export type AiContext =
  | { kind: "nodes"; nodeIds: string[] }
  | { kind: "canvas" }
  | null;

export interface AiFocus {
  ids: string[];
  wholeCanvas: boolean;
  /** "request" = from a menu hand-off, "selection" = live canvas selection */
  source: "request" | "selection" | "none";
}

/** Panel chat state + send logic; mount once per open canvas */
export function useAiChat() {
  const selection = useAiAssistantStore((s) => s.selection);
  const busy = useAiAssistantStore((s) => s.busy);
  const pendingRequest = useAiAssistantStore((s) => s.pendingRequest);
  const consumePendingRequest = useAiAssistantStore(
    (s) => s.consumePendingRequest,
  );
  const canvasSelection = useCanvasStore((s) => s.selection);
  const nodes = useCanvasStore((s) => s.canvas?.nodes);
  const config = useSettingsStore((s) => s.config);
  const resolved = resolveModel(config, "chat", selection);

  const [draft, setDraft] = useState("");
  const [context, setContext] = useState<AiContext>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    if (!pendingRequest) return;
    const req = consumePendingRequest();
    if (!req) return;
    setContext(
      req.kind === "canvas"
        ? { kind: "canvas" }
        : { kind: "nodes", nodeIds: req.nodeIds },
    );
    if (req.text) setDraft(req.text);
  }, [pendingRequest, consumePendingRequest]);

  const alive = new Set(nodes?.map((n) => n.id) ?? []);
  const requestIds =
    context?.kind === "nodes"
      ? context.nodeIds.filter((id) => alive.has(id))
      : [];
  const selectedIds = canvasSelection.filter((id) => alive.has(id));
  const focus: AiFocus =
    context?.kind === "canvas"
      ? { ids: [], wholeCanvas: true, source: "request" }
      : requestIds.length > 0
        ? { ids: requestIds, wholeCanvas: false, source: "request" }
        : selectedIds.length > 0
          ? { ids: selectedIds, wholeCanvas: false, source: "selection" }
          : { ids: [], wholeCanvas: false, source: "none" };

  const run = async (text: string, ids: string[], wholeCanvas: boolean) => {
    const ai = useAiAssistantStore.getState();
    const canvas = useCanvasStore.getState().canvas;
    if (!canvas || ai.busy) return;
    const cfg = useSettingsStore.getState().config;
    const res = resolveModel(cfg, "chat", ai.selection);
    const history = ai.messages;
    ai.addMessage({
      role: "user",
      content: text,
      contextNodeIds: ids.length > 0 ? ids : undefined,
      wholeCanvas: wholeCanvas || undefined,
    });
    if (res.status !== "ok") {
      ai.addMessage({ role: "assistant", content: res.error, error: true });
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    ai.setBusy(true);
    try {
      const reply = await chatCompletion({
        settings: res.settings,
        model: res.model,
        messages: buildRequestMessages({
          canvas,
          config: cfg,
          history,
          text,
          focusIds: ids,
          wholeCanvas,
        }),
        signal: controller.signal,
      });
      const current = useCanvasStore.getState();
      if (controller.signal.aborted || current.canvas?.id !== canvas.id) return;
      const parsed = parseReply(reply, current.canvas);
      let ops: AiOpsSummary | undefined;
      if (parsed.operations.length > 0 || parsed.errors.length > 0) {
        const result =
          parsed.operations.length > 0
            ? current.applyOperations(parsed.operations)
            : null;
        if (result) {
          const touched = [
            ...result.added,
            ...result.updated,
            ...result.moved,
          ].filter((id) => !result.deleted.includes(id));
          if (touched.length > 0) current.markAiTouched(touched);
        }
        ops = summarizeResult(result, parsed.errors);
      }
      useAiAssistantStore.getState().addMessage({
        role: "assistant",
        content:
          parsed.text ||
          (ops ? "已按你的要求处理画布。" : "（AI 没有返回文字内容）"),
        ops,
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      useAiAssistantStore.getState().addMessage({
        role: "assistant",
        content:
          err instanceof Error && err.message
            ? err.message
            : "AI 助手请求失败，请稍后重试。",
        error: true,
      });
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        useAiAssistantStore.getState().setBusy(false);
      }
    }
  };

  const canSend = resolved.status === "ok" && !busy;

  /** Sends the draft (or a given text) with the current focus */
  const send = (override?: string) => {
    const text = (override ?? draft).trim();
    if (!text || !canSend) return;
    if (override === undefined) setDraft("");
    setContext(null);
    void run(text, focus.ids, focus.wholeCanvas);
  };

  /** Re-sends the user message that led to a failed reply */
  const retry = (failedId: string) => {
    const list = useAiAssistantStore.getState().messages;
    const idx = list.findIndex((m) => m.id === failedId);
    const prev = list
      .slice(0, idx)
      .reverse()
      .find((m) => m.role === "user");
    if (!prev || !canSend) return;
    const ids = (prev.contextNodeIds ?? []).filter((id) => alive.has(id));
    void run(prev.content, ids, !!prev.wholeCanvas);
  };

  return {
    draft,
    setDraft,
    context,
    clearContext: () => setContext(null),
    focus,
    resolved,
    busy,
    canSend,
    send,
    retry,
  };
}

export type AiChatController = ReturnType<typeof useAiChat>;
