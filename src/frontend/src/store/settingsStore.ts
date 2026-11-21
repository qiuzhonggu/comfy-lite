import {
  type AppSettings,
  DEFAULT_APP_SETTINGS,
  DEFAULT_RELAY_SETTINGS,
  MODEL_KINDS,
  MODEL_LIST_KEY,
  type ModelKind,
  type ModelRef,
  type Relay,
  type RelaySettings,
  type TtsConfig,
  createId,
} from "@/types";
import { create } from "zustand";

const STORAGE_KEY = "jingtai.relaySettings";

function freshSettings(): AppSettings {
  return {
    ...DEFAULT_APP_SETTINGS,
    relays: [],
    defaults: { ...DEFAULT_APP_SETTINGS.defaults },
    tts: { ...DEFAULT_APP_SETTINGS.tts },
  };
}

function strList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const x of v) {
    if (typeof x === "string" && x.trim() && !out.includes(x.trim()))
      out.push(x.trim());
  }
  return out;
}

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

/** Turns the old single-relay settings into one relay with its default models */
function migrateLegacy(old: Partial<RelaySettings>): AppSettings {
  const legacy = { ...DEFAULT_RELAY_SETTINGS, ...old };
  const next = freshSettings();
  next.tts = { model: legacy.ttsModel, voice: legacy.ttsVoice };
  if (!legacy.baseUrl.trim() && !legacy.apiKey.trim()) return next;
  const relay: Relay = {
    id: createId("relay"),
    name: "中转站 1",
    baseUrl: legacy.baseUrl,
    apiKey: legacy.apiKey,
    chatModels: strList([legacy.chatModel]),
    imageModels: strList([legacy.imageModel]),
    videoModels: strList([legacy.videoModel]),
  };
  next.relays = [relay];
  for (const kind of MODEL_KINDS) {
    const model = relay[MODEL_LIST_KEY[kind]][0];
    next.defaults[kind] = model ? { relayId: relay.id, model } : null;
  }
  next.tts.relayId = relay.id;
  return next;
}

function normalize(raw: Record<string, unknown>): AppSettings {
  const next = freshSettings();
  const relays = Array.isArray(raw.relays) ? raw.relays : [];
  next.relays = relays
    .filter((r): r is Record<string, unknown> => !!r && typeof r === "object")
    .map((r, i) => ({
      id: str(r.id) || createId("relay"),
      name: str(r.name) || `中转站 ${i + 1}`,
      baseUrl: str(r.baseUrl),
      apiKey: str(r.apiKey),
      chatModels: strList(r.chatModels),
      imageModels: strList(r.imageModels),
      videoModels: strList(r.videoModels),
    }));
  const defaults = (raw.defaults ?? {}) as Record<string, unknown>;
  for (const kind of MODEL_KINDS) {
    const d = defaults[kind] as Partial<ModelRef> | null | undefined;
    next.defaults[kind] =
      d && typeof d.relayId === "string" && typeof d.model === "string"
        ? { relayId: d.relayId, model: d.model }
        : null;
  }
  const tts = (raw.tts ?? {}) as Partial<TtsConfig>;
  next.tts = {
    relayId: typeof tts.relayId === "string" ? tts.relayId : undefined,
    model: str(tts.model) || DEFAULT_RELAY_SETTINGS.ttsModel,
    voice: str(tts.voice) || DEFAULT_RELAY_SETTINGS.ttsVoice,
  };
  return repairDefaults(next);
}

/** Settings live only in this browser's localStorage; old shape is migrated */
function loadConfig(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return freshSettings();
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (parsed && parsed.version === 2) return normalize(parsed);
    const migrated = migrateLegacy(parsed as Partial<RelaySettings>);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    return migrated;
  } catch {
    return freshSettings();
  }
}

/** Clears defaults that point at removed relays/models, picks a new one if possible */
function repairDefaults(c: AppSettings): AppSettings {
  const defaults = { ...c.defaults };
  for (const kind of MODEL_KINDS) {
    const d = defaults[kind];
    const key = MODEL_LIST_KEY[kind];
    const valid =
      d && c.relays.some((r) => r.id === d.relayId && r[key].includes(d.model));
    if (valid) continue;
    const relay = c.relays.find((r) => r[key].length > 0);
    defaults[kind] = relay ? { relayId: relay.id, model: relay[key][0] } : null;
  }
  const tts =
    c.tts.relayId && !c.relays.some((r) => r.id === c.tts.relayId)
      ? { ...c.tts, relayId: undefined }
      : c.tts;
  return { ...c, defaults, tts };
}

/** Relay used by voice and legacy callers */
export function legacyRelay(c: AppSettings): Relay | undefined {
  const byId = (id?: string) =>
    id ? c.relays.find((r) => r.id === id) : undefined;
  return byId(c.tts.relayId) ?? byId(c.defaults.chat?.relayId) ?? c.relays[0];
}

/** Flat RelaySettings view of the config (voice + legacy consumers) */
export function toLegacySettings(c: AppSettings): RelaySettings {
  const relay = legacyRelay(c);
  return {
    baseUrl: relay?.baseUrl ?? "",
    apiKey: relay?.apiKey ?? "",
    chatModel: c.defaults.chat?.model ?? DEFAULT_RELAY_SETTINGS.chatModel,
    imageModel: c.defaults.image?.model ?? DEFAULT_RELAY_SETTINGS.imageModel,
    videoModel: c.defaults.video?.model ?? DEFAULT_RELAY_SETTINGS.videoModel,
    ttsModel: c.tts.model,
    ttsVoice: c.tts.voice,
  };
}

export type RelayPatch = Partial<Omit<Relay, "id">>;

interface SettingsState {
  /** Multi-relay settings (source of truth) */
  config: AppSettings;
  /** Legacy flat view derived from config; read-only */
  settings: RelaySettings;

  addRelay: (patch?: RelayPatch) => string;
  updateRelay: (id: string, patch: RelayPatch) => void;
  removeRelay: (id: string) => void;
  /** Returns false when the name is empty or already in that list */
  addModel: (relayId: string, kind: ModelKind, model: string) => boolean;
  removeModel: (relayId: string, kind: ModelKind, model: string) => void;
  setDefault: (kind: ModelKind, ref: ModelRef | null) => void;
  updateTts: (patch: Partial<TtsConfig>) => void;
  /** Replaces the whole config (e.g. a settings form save) */
  replaceConfig: (config: AppSettings) => void;

  /** Legacy: patches the voice/default relay connection, default models and TTS */
  saveSettings: (patch: Partial<RelaySettings>) => void;
  resetSettings: () => void;
  reload: () => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => {
  const initial = loadConfig();

  const commit = (fn: (c: AppSettings) => AppSettings) => {
    const next = repairDefaults(fn(get().config));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    set({ config: next, settings: toLegacySettings(next) });
  };

  const mapRelay = (id: string, fn: (r: Relay) => Relay) =>
    commit((c) => ({
      ...c,
      relays: c.relays.map((r) => (r.id === id ? fn(r) : r)),
    }));

  return {
    config: initial,
    settings: toLegacySettings(initial),

    addRelay: (patch = {}) => {
      const id = createId("relay");
      commit((c) => ({
        ...c,
        relays: [
          ...c.relays,
          {
            id,
            name: patch.name?.trim() || `中转站 ${c.relays.length + 1}`,
            baseUrl: patch.baseUrl ?? "",
            apiKey: patch.apiKey ?? "",
            chatModels: strList(patch.chatModels),
            imageModels: strList(patch.imageModels),
            videoModels: strList(patch.videoModels),
          },
        ],
      }));
      return id;
    },

    updateRelay: (id, patch) =>
      mapRelay(id, (r) => ({
        ...r,
        ...patch,
        id,
        chatModels: patch.chatModels ? strList(patch.chatModels) : r.chatModels,
        imageModels: patch.imageModels
          ? strList(patch.imageModels)
          : r.imageModels,
        videoModels: patch.videoModels
          ? strList(patch.videoModels)
          : r.videoModels,
      })),

    removeRelay: (id) =>
      commit((c) => ({ ...c, relays: c.relays.filter((r) => r.id !== id) })),

    addModel: (relayId, kind, model) => {
      const name = model.trim();
      const key = MODEL_LIST_KEY[kind];
      const relay = get().config.relays.find((r) => r.id === relayId);
      if (!name || !relay || relay[key].includes(name)) return false;
      mapRelay(relayId, (r) => ({ ...r, [key]: [...r[key], name] }));
      return true;
    },

    removeModel: (relayId, kind, model) => {
      const key = MODEL_LIST_KEY[kind];
      mapRelay(relayId, (r) => ({
        ...r,
        [key]: r[key].filter((m) => m !== model),
      }));
    },

    setDefault: (kind, ref) =>
      commit((c) => ({ ...c, defaults: { ...c.defaults, [kind]: ref } })),

    updateTts: (patch) =>
      commit((c) => ({ ...c, tts: { ...c.tts, ...patch } })),

    replaceConfig: (config) => commit(() => normalize({ ...config })),

    saveSettings: (patch) =>
      commit((c) => {
        let next: AppSettings = {
          ...c,
          relays: [...c.relays],
          tts: { ...c.tts },
          defaults: { ...c.defaults },
        };
        let relay = legacyRelay(next);
        if (!relay) {
          relay = {
            id: createId("relay"),
            name: "中转站 1",
            baseUrl: "",
            apiKey: "",
            chatModels: [],
            imageModels: [],
            videoModels: [],
          };
          next.relays.push(relay);
        }
        const updated: Relay = {
          ...relay,
          baseUrl: patch.baseUrl ?? relay.baseUrl,
          apiKey: patch.apiKey ?? relay.apiKey,
        };
        const modelPatch: Record<ModelKind, string | undefined> = {
          chat: patch.chatModel,
          image: patch.imageModel,
          video: patch.videoModel,
        };
        for (const kind of MODEL_KINDS) {
          const m = modelPatch[kind]?.trim();
          if (!m) continue;
          const key = MODEL_LIST_KEY[kind];
          if (!updated[key].includes(m)) updated[key] = [...updated[key], m];
          next.defaults[kind] = { relayId: updated.id, model: m };
        }
        next.relays = next.relays.map((r) =>
          r.id === updated.id ? updated : r,
        );
        if (patch.ttsModel !== undefined) next.tts.model = patch.ttsModel;
        if (patch.ttsVoice !== undefined) next.tts.voice = patch.ttsVoice;
        next = { ...next, tts: { ...next.tts } };
        return next;
      }),

    resetSettings: () => {
      localStorage.removeItem(STORAGE_KEY);
      const fresh = freshSettings();
      set({ config: fresh, settings: toLegacySettings(fresh) });
    },

    reload: () => {
      const c = loadConfig();
      set({ config: c, settings: toLegacySettings(c) });
    },
  };
});

/** Non-hook accessor for the multi-relay config */
export function getAppSettings(): AppSettings {
  return useSettingsStore.getState().config;
}

/** Non-hook accessor for async run handlers (voice + legacy callers) */
export function getRelaySettings(): RelaySettings {
  return useSettingsStore.getState().settings;
}
