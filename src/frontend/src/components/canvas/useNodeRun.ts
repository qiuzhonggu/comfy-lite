import {
  type ModelResolution,
  NODE_MODEL_KIND,
  notConfiguredMessage,
  resolveModel,
} from "@/lib/modelResolve";
import { RelayError, isRelayConfigured } from "@/lib/relay";
import { useCanvasStore } from "@/store/canvasStore";
import {
  getAppSettings,
  getRelaySettings,
  legacyRelay,
  useSettingsStore,
} from "@/store/settingsStore";
import type {
  AppSettings,
  CanvasNode,
  ModelKind,
  Relay,
  RelaySettings,
} from "@/types";
import { useCallback, useState } from "react";

export interface RunContext {
  /** Connection for the run: the node's resolved relay (voice: the voice relay) */
  settings: RelaySettings;
  /** Resolved model for chat/image/video nodes; pass it as `model` to relay.ts */
  model?: string;
  /** Resolved relay, when one exists */
  relay?: Relay;
  /** Chinese notice when the node's choice was removed and the default was used */
  warning?: string;
  /** Updates the card's progress text */
  progress: (text: string) => void;
}

export function readableError(err: unknown): string {
  if (err instanceof RelayError) return err.message;
  if (err instanceof DOMException && err.name === "AbortError")
    return "任务已取消";
  if (err instanceof Error && err.message) return err.message;
  return "发生未知错误，请重试。";
}

type Prepared =
  | { ok: true; ctx: Omit<RunContext, "progress"> }
  | { ok: false; error: string };

function selectionOf(node: CanvasNode | undefined) {
  if (!node) return undefined;
  if (node.type === "chat" || node.type === "imageGen" || node.type === "video")
    return { relayId: node.data.relayId, model: node.data.model };
  return undefined;
}

/** Resolves the run connection for a node (or an explicit kind) */
export function prepareRun(
  config: AppSettings,
  node: CanvasNode | undefined,
  kindOverride?: ModelKind,
): Prepared {
  const kind = kindOverride ?? (node ? NODE_MODEL_KIND[node.type] : undefined);
  if (!kind) {
    const relay = legacyRelay(config);
    const settings = getRelaySettings();
    if (!relay || !isRelayConfigured(settings))
      return {
        ok: false,
        error: "尚未配置中转站：请先在“设置”中填写中转站地址和 API Key。",
      };
    return { ok: true, ctx: { settings, relay } };
  }
  const r: ModelResolution = resolveModel(config, kind, selectionOf(node));
  if (r.status === "missing") return { ok: false, error: r.error };
  if (!r.configured) return { ok: false, error: notConfiguredMessage(r.relay) };
  return {
    ok: true,
    ctx: {
      settings: r.settings,
      model: r.model,
      relay: r.relay,
      warning: r.warning,
    },
  };
}

/** Wraps a relay task with model resolution, run status and error capture */
export function useNodeRun(nodeId: string, kind?: ModelKind) {
  const setNodeRun = useCanvasStore((s) => s.setNodeRun);
  const node = useCanvasStore((s) =>
    s.canvas?.nodes.find((n) => n.id === nodeId),
  );
  const config = useSettingsStore((s) => s.config);
  const [setupPrompt, setSetupPrompt] = useState(false);

  const current = prepareRun(config, node, kind);

  /** Returns false (and shows the settings prompt) when nothing usable is configured */
  const ready = useCallback(() => {
    const n = useCanvasStore.getState().getNode(nodeId);
    const ok = prepareRun(getAppSettings(), n, kind).ok;
    setSetupPrompt(!ok);
    return ok;
  }, [nodeId, kind]);

  const execute = useCallback(
    async (task: (ctx: RunContext) => Promise<void>) => {
      const n = useCanvasStore.getState().getNode(nodeId);
      const prepared = prepareRun(getAppSettings(), n, kind);
      setSetupPrompt(!prepared.ok);
      if (!prepared.ok || !n || n.run.status === "running") return;
      setNodeRun(nodeId, {
        status: "running",
        progress: "准备中…",
        warning: prepared.ctx.warning,
      });
      try {
        await task({
          ...prepared.ctx,
          progress: (text) => setNodeRun(nodeId, { progress: text }),
        });
        setNodeRun(nodeId, { status: "success", progress: undefined });
      } catch (err) {
        setNodeRun(nodeId, {
          status: "error",
          error: readableError(err),
          progress: undefined,
        });
      }
    },
    [nodeId, kind, setNodeRun],
  );

  return {
    execute,
    ready,
    needsSetup: setupPrompt && !current.ok,
    /** Chinese reason the node cannot run right now, or null */
    setupError: current.ok ? null : current.error,
    /** Notice when the node's model choice was removed */
    warning: current.ok ? current.ctx.warning : undefined,
  };
}
