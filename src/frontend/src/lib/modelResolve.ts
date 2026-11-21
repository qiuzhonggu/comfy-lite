import { isRelayConfigured, relayToSettings } from "@/lib/relay";
import { toLegacySettings, useSettingsStore } from "@/store/settingsStore";
import {
  type AppSettings,
  MODEL_KIND_LABELS,
  MODEL_LIST_KEY,
  type ModelKind,
  type ModelSelection,
  type NodeType,
  type Relay,
  type RelaySettings,
} from "@/types";

export const REMOVED_MODEL_WARNING = "所选模型已被删除，已使用默认模型";
export const REMOVED_RELAY_WARNING = "所选中转站已被删除，已使用默认模型";

/** How the effective model was chosen */
export type ResolutionSource = "node" | "legacy" | "default" | "fallback";

export interface ResolvedModel {
  status: "ok";
  kind: ModelKind;
  relay: Relay;
  model: string;
  /** Connection for relay.ts calls, with the kind's model set to `model` */
  settings: RelaySettings;
  source: ResolutionSource;
  /** True when the node had no own choice (or it was removed) */
  usesDefault: boolean;
  /** Relay has both base URL and API key */
  configured: boolean;
  /** Chinese notice when the node's choice was removed */
  warning?: string;
}

export interface MissingModel {
  status: "missing";
  kind: ModelKind;
  /** Chinese message pointing to 设置 */
  error: string;
}

export type ModelResolution = ResolvedModel | MissingModel;

export interface RelayModelGroup {
  relayId: string;
  relayName: string;
  models: string[];
}

export const NODE_MODEL_KIND: Partial<Record<NodeType, ModelKind>> = {
  chat: "chat",
  imageGen: "image",
  video: "video",
};

export function missingModelMessage(kind: ModelKind): string {
  return `尚未配置任何${MODEL_KIND_LABELS[kind]}模型：请先在“设置”中添加中转站并填写${MODEL_KIND_LABELS[kind]}模型。`;
}

export function notConfiguredMessage(relay: Relay): string {
  return `中转站「${relay.name}」尚未填写地址或 API Key，请先在“设置”中补全。`;
}

/** Relays with at least one model of this kind, in settings order */
export function listModelOptions(
  config: AppSettings,
  kind: ModelKind,
): RelayModelGroup[] {
  const key = MODEL_LIST_KEY[kind];
  return config.relays
    .filter((r) => r[key].length > 0)
    .map((r) => ({ relayId: r.id, relayName: r.name, models: [...r[key]] }));
}

export function hasModelsFor(config: AppSettings, kind: ModelKind): boolean {
  const key = MODEL_LIST_KEY[kind];
  return config.relays.some((r) => r[key].length > 0);
}

/** Select-friendly value for a relay + model pair */
export function encodeOption(relayId: string, model: string): string {
  return `${relayId}::${model}`;
}

export function decodeOption(value: string): ModelSelection {
  const i = value.indexOf("::");
  if (i < 0) return {};
  return { relayId: value.slice(0, i), model: value.slice(i + 2) };
}

/** Resolves the effective relay + model for a kind and optional node selection */
export function resolveModel(
  config: AppSettings,
  kind: ModelKind,
  selection?: ModelSelection,
): ModelResolution {
  const key = MODEL_LIST_KEY[kind];
  const build = (
    relay: Relay,
    model: string,
    source: ResolutionSource,
    warning?: string,
  ): ResolvedModel => ({
    status: "ok",
    kind,
    relay,
    model,
    settings: relayToSettings(relay, kind, model, toLegacySettings(config)),
    source,
    usesDefault: source === "default" || source === "fallback",
    configured: isRelayConfigured(relay),
    warning,
  });

  const relayId = selection?.relayId?.trim();
  const model = selection?.model?.trim();
  let warning: string | undefined;

  if (relayId) {
    const relay = config.relays.find((r) => r.id === relayId);
    if (relay && model && relay[key].includes(model))
      return build(relay, model, "node");
    if (relay && !model && relay[key].length > 0)
      return build(relay, relay[key][0], "node");
    warning = relay ? REMOVED_MODEL_WARNING : REMOVED_RELAY_WARNING;
  } else if (model) {
    // Nodes saved before multi-relay support only stored a model name
    const owner = config.relays.find((r) => r[key].includes(model));
    if (owner) return build(owner, model, "legacy");
    const d = config.defaults[kind];
    const fallbackRelay =
      config.relays.find((r) => r.id === d?.relayId) ?? config.relays[0];
    if (fallbackRelay) return build(fallbackRelay, model, "legacy");
  }

  const d = config.defaults[kind];
  if (d) {
    const relay = config.relays.find((r) => r.id === d.relayId);
    if (relay?.[key].includes(d.model))
      return build(relay, d.model, "default", warning);
  }
  const first = config.relays.find((r) => r[key].length > 0);
  if (first) return build(first, first[key][0], "fallback", warning);
  return { status: "missing", kind, error: missingModelMessage(kind) };
}

/** Reactive resolution for components */
export function useResolvedModel(
  kind: ModelKind,
  selection?: ModelSelection,
): ModelResolution {
  const config = useSettingsStore((s) => s.config);
  return resolveModel(config, kind, selection);
}

export function useModelOptions(kind: ModelKind): RelayModelGroup[] {
  const config = useSettingsStore((s) => s.config);
  return listModelOptions(config, kind);
}
