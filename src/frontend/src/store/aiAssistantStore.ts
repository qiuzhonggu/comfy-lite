import type { ModelSelection } from "@/types";
import { createId } from "@/types";
import { create } from "zustand";

const HISTORY_PREFIX = "jingtai.aiChat.";
const PREFS_KEY = "jingtai.aiAssistant.prefs";
const MAX_MESSAGES = 200;

/** Short counts of what an assistant reply changed on the canvas */
export interface AiOpsSummary {
  added: number;
  updated: number;
  deleted: number;
  connected: number;
  disconnected: number;
  moved: number;
  /** Chinese notes for skipped operations */
  errors?: string[];
}

export interface AiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  /** Node ids the user sent as context with this message */
  contextNodeIds?: string[];
  /** Whole-canvas request */
  wholeCanvas?: boolean;
  ops?: AiOpsSummary;
  /** Assistant message that represents a failed request */
  error?: boolean;
}

export type AiRequestKind = "nodes" | "canvas";

/** Hand-off from right-click menus to the panel */
export interface AiPendingRequest {
  id: string;
  kind: AiRequestKind;
  /** Selected node ids for kind "nodes"; empty for "canvas" */
  nodeIds: string[];
  /** Optional prefilled instruction */
  text?: string;
  createdAt: number;
}

function isDesktop(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(min-width: 1024px)").matches
  );
}

function loadPrefs(): ModelSelection {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    const p = raw ? (JSON.parse(raw) as ModelSelection) : {};
    return {
      relayId: typeof p.relayId === "string" ? p.relayId : undefined,
      model: typeof p.model === "string" ? p.model : undefined,
    };
  } catch {
    return {};
  }
}

function loadHistory(canvasId: string): AiMessage[] {
  try {
    const raw = localStorage.getItem(HISTORY_PREFIX + canvasId);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as AiMessage[]) : [];
  } catch {
    return [];
  }
}

function saveHistory(canvasId: string | null, messages: AiMessage[]) {
  if (!canvasId) return;
  try {
    if (messages.length === 0)
      localStorage.removeItem(HISTORY_PREFIX + canvasId);
    else
      localStorage.setItem(
        HISTORY_PREFIX + canvasId,
        JSON.stringify(messages.slice(-MAX_MESSAGES)),
      );
  } catch {
    // Storage full: keep the in-memory history
  }
}

interface AiAssistantState {
  open: boolean;
  /** Chat relay + model for the panel; empty = default chat model */
  selection: ModelSelection;
  canvasId: string | null;
  messages: AiMessage[];
  /** A request is in flight */
  busy: boolean;
  pendingRequest: AiPendingRequest | null;
  /** Increments whenever the panel input should take focus */
  focusToken: number;

  setOpen: (open: boolean) => void;
  toggleOpen: () => void;
  setSelection: (selection: ModelSelection) => void;
  /** Loads the history for a canvas (call when the editor opens one) */
  loadCanvas: (canvasId: string | null) => void;
  addMessage: (msg: Omit<AiMessage, "id" | "createdAt">) => string;
  updateMessage: (id: string, patch: Partial<Omit<AiMessage, "id">>) => void;
  clearHistory: () => void;
  setBusy: (busy: boolean) => void;
  /** Opens the panel and queues 发送给 AI 助手 with these nodes */
  requestNodes: (nodeIds: string[], text?: string) => void;
  /** Opens the panel and queues 交给 AI 处理整个画布 */
  requestCanvas: (text?: string) => void;
  /** Returns and clears the queued request */
  consumePendingRequest: () => AiPendingRequest | null;
  focusInput: () => void;
}

export const useAiAssistantStore = create<AiAssistantState>((set, get) => {
  const setMessages = (messages: AiMessage[]) => {
    set({ messages });
    saveHistory(get().canvasId, messages);
  };

  const queue = (kind: AiRequestKind, nodeIds: string[], text?: string) =>
    set((s) => ({
      open: true,
      pendingRequest: {
        id: createId("aireq"),
        kind,
        nodeIds,
        text,
        createdAt: Date.now(),
      },
      focusToken: s.focusToken + 1,
    }));

  return {
    open: isDesktop(),
    selection: loadPrefs(),
    canvasId: null,
    messages: [],
    busy: false,
    pendingRequest: null,
    focusToken: 0,

    setOpen: (open) => set({ open }),
    toggleOpen: () => set((s) => ({ open: !s.open })),

    setSelection: (selection) => {
      const next = { relayId: selection.relayId, model: selection.model };
      try {
        localStorage.setItem(PREFS_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      set({ selection: next });
    },

    loadCanvas: (canvasId) => {
      if (canvasId === get().canvasId) return;
      set({
        canvasId,
        messages: canvasId ? loadHistory(canvasId) : [],
        busy: false,
        pendingRequest: null,
      });
    },

    addMessage: (msg) => {
      const id = createId("aimsg");
      setMessages([...get().messages, { ...msg, id, createdAt: Date.now() }]);
      return id;
    },

    updateMessage: (id, patch) =>
      setMessages(
        get().messages.map((m) => (m.id === id ? { ...m, ...patch } : m)),
      ),

    clearHistory: () => setMessages([]),
    setBusy: (busy) => set({ busy }),

    requestNodes: (nodeIds, text) => queue("nodes", [...nodeIds], text),
    requestCanvas: (text) => queue("canvas", [], text),

    consumePendingRequest: () => {
      const req = get().pendingRequest;
      if (req) set({ pendingRequest: null });
      return req;
    },

    focusInput: () =>
      set((s) => ({ open: true, focusToken: s.focusToken + 1 })),
  };
});
