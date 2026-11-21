import { Button } from "@/components/ui/button";
import { opsSummaryParts } from "@/lib/canvasAi";
import type { AiMessage } from "@/store/aiAssistantStore";
import {
  AlertCircle,
  Layers,
  Link2,
  MousePointer2,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useEffect, useRef } from "react";

const SUGGESTIONS = [
  "帮我搭一个「提示词 → 生图 → 视频生成」的基础流程",
  "把画布上的节点整理成从左到右的清晰流程",
  "为每个生图节点补全更具体的画面描述",
  "总结一下当前画布的创作思路",
];

interface AiMessageListProps {
  messages: AiMessage[];
  busy: boolean;
  canSend: boolean;
  onSuggest: (text: string) => void;
  onRetry: (messageId: string) => void;
}

function OpsChips({ msg }: { msg: AiMessage }) {
  if (!msg.ops) return null;
  const parts = opsSummaryParts(msg.ops);
  return (
    <div className="mt-1.5 space-y-1">
      {parts.length > 0 ? (
        <p className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5 rounded-md bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary">
          <Link2 className="h-3 w-3" aria-hidden />
          {parts.join(" · ")}
        </p>
      ) : (
        <p className="text-[11px] text-muted-foreground">未修改画布</p>
      )}
      {msg.ops.errors?.map((e) => (
        <p
          key={e}
          className="flex items-start gap-1 text-[11px] text-destructive"
        >
          <AlertCircle className="mt-px h-3 w-3 shrink-0" aria-hidden />
          {e}
        </p>
      ))}
    </div>
  );
}

export function AiMessageList({
  messages,
  busy,
  canSend,
  onSuggest,
  onRetry,
}: AiMessageListProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const count = messages.length;

  useEffect(() => {
    if (count > 0 || busy) endRef.current?.scrollIntoView({ block: "end" });
  }, [count, busy]);

  if (count === 0 && !busy) {
    return (
      <div
        className="flex flex-1 flex-col justify-center px-4 py-6"
        data-ocid="ai_panel.empty_state"
      >
        <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Sparkles className="h-5 w-5" aria-hidden />
        </span>
        <h3 className="mt-3 text-center font-display text-sm font-semibold">
          让 AI 帮你打理画布
        </h3>
        <p className="mt-1 text-center text-xs text-muted-foreground">
          它能读懂节点、内容与连线，并直接新增、修改、连接或排列节点。
        </p>
        <ul className="mt-4 space-y-1.5">
          {SUGGESTIONS.map((s, i) => (
            <li key={s}>
              <button
                type="button"
                disabled={!canSend}
                onClick={() => onSuggest(s)}
                className="w-full rounded-lg border border-border bg-card/60 px-3 py-2 text-left text-xs text-foreground transition-smooth hover:border-primary/50 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                data-ocid={`ai_panel.suggestion.${i + 1}`}
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div
      className="flex-1 space-y-3 overflow-y-auto px-3 py-4"
      aria-live="polite"
      data-ocid="ai_panel.list"
    >
      {messages.map((m, i) =>
        m.role === "user" ? (
          <div
            key={m.id}
            className="flex animate-msg-in flex-col items-end"
            data-ocid={`ai_panel.item.${i + 1}`}
          >
            {(m.wholeCanvas || (m.contextNodeIds?.length ?? 0) > 0) && (
              <span className="mb-1 inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                {m.wholeCanvas ? (
                  <Layers className="h-3 w-3" aria-hidden />
                ) : (
                  <MousePointer2 className="h-3 w-3" aria-hidden />
                )}
                {m.wholeCanvas
                  ? "整个画布"
                  : `针对 ${m.contextNodeIds?.length} 个节点`}
              </span>
            )}
            <p className="bubble-user max-w-[88%] whitespace-pre-wrap break-words rounded-xl rounded-br-sm px-3 py-2 text-xs leading-relaxed">
              {m.content}
            </p>
          </div>
        ) : (
          <div
            key={m.id}
            className="flex animate-msg-in flex-col items-start"
            data-ocid={`ai_panel.item.${i + 1}`}
          >
            <div
              className={`bubble-ai max-w-[92%] rounded-xl rounded-bl-sm px-3 py-2 text-xs leading-relaxed ${
                m.error ? "border border-destructive/40" : ""
              }`}
              data-ocid={m.error ? "ai_panel.error_state" : undefined}
            >
              {m.error && (
                <p className="mb-1 flex items-center gap-1 font-medium text-destructive">
                  <AlertCircle className="h-3.5 w-3.5" aria-hidden />
                  请求失败
                </p>
              )}
              <p className="whitespace-pre-wrap break-words">{m.content}</p>
              {m.error && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={!canSend}
                  onClick={() => onRetry(m.id)}
                  className="mt-1.5 h-6 gap-1 px-2 text-[11px]"
                  data-ocid={`ai_panel.retry_button.${i + 1}`}
                >
                  <RotateCcw className="h-3 w-3" aria-hidden />
                  重新发送
                </Button>
              )}
            </div>
            <OpsChips msg={m} />
          </div>
        ),
      )}
      {busy && (
        <div
          className="bubble-ai inline-flex items-center gap-1 rounded-xl rounded-bl-sm px-3 py-2.5"
          data-ocid="ai_panel.loading_state"
        >
          <span className="sr-only">AI 正在思考…</span>
          {["d1", "d2", "d3"].map((id, i) => (
            <span
              key={id}
              className="h-1.5 w-1.5 animate-typing-dot rounded-full bg-muted-foreground"
              style={{ animationDelay: `${i * 0.18}s` }}
              aria-hidden
            />
          ))}
          <span className="ml-1.5 text-[11px] text-muted-foreground">
            正在思考…
          </span>
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}
