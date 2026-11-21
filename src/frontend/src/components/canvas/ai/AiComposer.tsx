import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAiAssistantStore } from "@/store/aiAssistantStore";
import { Link } from "@tanstack/react-router";
import {
  Layers,
  Loader2,
  MousePointer2,
  SendHorizontal,
  X,
} from "lucide-react";
import { useEffect, useRef } from "react";
import type { AiChatController } from "./useAiChat";

export function AiComposer({ chat }: { chat: AiChatController }) {
  const focusToken = useAiAssistantStore((s) => s.focusToken);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { draft, setDraft, focus, resolved, busy, canSend, send } = chat;
  const missing = resolved.status === "missing";
  const unconfigured = resolved.status === "ok" && !resolved.configured;

  useEffect(() => {
    if (focusToken === 0) return;
    // Wait a frame so a just-opened sheet/dock has mounted the textarea
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [focusToken]);

  return (
    <div className="shrink-0 border-t border-border bg-panel-header p-3">
      {focus.source !== "none" && (
        <div className="mb-2 flex items-center gap-1.5">
          <span
            className="inline-flex min-w-0 items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
            data-ocid="ai_panel.context.toggle"
          >
            {focus.wholeCanvas ? (
              <Layers className="h-3 w-3 shrink-0" aria-hidden />
            ) : (
              <MousePointer2 className="h-3 w-3 shrink-0" aria-hidden />
            )}
            <span className="truncate">
              {focus.wholeCanvas
                ? "处理整个画布"
                : `已选中 ${focus.ids.length} 个节点`}
            </span>
            {focus.source === "request" && (
              <button
                type="button"
                onClick={chat.clearContext}
                className="ml-0.5 rounded-full p-0.5 hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="移除上下文"
                data-ocid="ai_panel.context.close_button"
              >
                <X className="h-3 w-3" aria-hidden />
              </button>
            )}
          </span>
          {!focus.wholeCanvas && (
            <span className="truncate text-[11px] text-muted-foreground">
              AI 将针对这些节点操作
            </span>
          )}
        </div>
      )}

      {(missing || unconfigured) && (
        <p
          className="mb-2 rounded-md border border-dashed border-border bg-muted/40 px-2.5 py-1.5 text-[11px] text-muted-foreground"
          data-ocid="ai_panel.config_hint"
        >
          {missing
            ? "尚未配置对话模型，AI 助手暂不可用。"
            : "当前中转站缺少地址或 API Key。"}{" "}
          <Link
            to="/settings"
            className="font-medium text-primary underline-offset-2 hover:underline"
            data-ocid="ai_panel.settings.link"
          >
            前往设置
          </Link>
        </p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="rounded-xl border border-input bg-card focus-within:border-primary/60 focus-within:ring-1 focus-within:ring-primary/40"
      >
        <label htmlFor="ai-panel-input" className="sr-only">
          给 AI 助手的指令
        </label>
        <Textarea
          id="ai-panel-input"
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              !e.shiftKey &&
              !e.nativeEvent.isComposing
            ) {
              e.preventDefault();
              send();
            }
          }}
          rows={3}
          placeholder="描述你想对画布做什么，Enter 发送，Shift+Enter 换行"
          className="min-h-[72px] resize-none border-0 bg-transparent px-3 py-2.5 text-xs shadow-none focus-visible:ring-0"
          data-ocid="ai_panel.textarea"
        />
        <div className="flex items-center justify-between gap-2 px-2 pb-2">
          <span className="truncate text-[10px] text-muted-foreground">
            {busy ? "AI 正在处理，请稍候…" : "对话记录仅保存在本浏览器"}
          </span>
          <Button
            type="submit"
            size="sm"
            disabled={!canSend || !draft.trim()}
            className="h-7 gap-1.5 rounded-lg px-3 text-xs"
            data-ocid="ai_panel.submit_button"
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <SendHorizontal className="h-3.5 w-3.5" aria-hidden />
            )}
            发送
          </Button>
        </div>
      </form>
    </div>
  );
}
