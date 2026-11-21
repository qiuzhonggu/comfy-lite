/** Flat connection + model view consumed by lib/relay.ts */
export interface RelaySettings {
  baseUrl: string;
  apiKey: string;
  chatModel: string;
  imageModel: string;
  videoModel: string;
  ttsModel: string;
  ttsVoice: string;
}

export const DEFAULT_RELAY_SETTINGS: RelaySettings = {
  baseUrl: "",
  apiKey: "",
  chatModel: "gpt-4o-mini",
  imageModel: "gpt-image-1",
  videoModel: "sora-2",
  ttsModel: "tts-1",
  ttsVoice: "alloy",
};

/** Model families that support per-relay model lists and per-node choice */
export type ModelKind = "chat" | "image" | "video";

export const MODEL_KINDS: ModelKind[] = ["chat", "image", "video"];

export const MODEL_KIND_LABELS: Record<ModelKind, string> = {
  chat: "对话",
  image: "生图",
  video: "视频",
};

/** Key on Relay holding the model list for a kind */
export const MODEL_LIST_KEY = {
  chat: "chatModels",
  image: "imageModels",
  video: "videoModels",
} as const satisfies Record<ModelKind, keyof Relay>;

export interface Relay {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  chatModels: string[];
  imageModels: string[];
  videoModels: string[];
}

/** A concrete relay + model pair */
export interface ModelRef {
  relayId: string;
  model: string;
}

/** A node's (or the AI panel's) choice; empty means "use the default" */
export interface ModelSelection {
  relayId?: string;
  model?: string;
}

export interface TtsConfig {
  /** Relay used for voice; falls back to the default chat relay, then the first relay */
  relayId?: string;
  model: string;
  voice: string;
}

export interface AppSettings {
  version: 2;
  relays: Relay[];
  defaults: Record<ModelKind, ModelRef | null>;
  tts: TtsConfig;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  version: 2,
  relays: [],
  defaults: { chat: null, image: null, video: null },
  tts: {
    model: DEFAULT_RELAY_SETTINGS.ttsModel,
    voice: DEFAULT_RELAY_SETTINGS.ttsVoice,
  },
};
