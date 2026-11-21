import { ModelPicker } from "@/components/canvas/ModelPicker";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useAiAssistantStore } from "@/store/aiAssistantStore";
import { ChevronRight, Sparkles, Trash2 } from "lucide-react";
import { AiComposer } from "./AiComposer";
import { AiMessageList } from "./AiMessageList";
import type { AiChatController } from "./useAiChat";

interface AiAssistantPanelProps {
  chat: AiChatController;
  /** Collapse handler; omitted inside the mobile sheet (it has its own close) */
  onCollapse?: () => void;
}

export function AiAssistantPanel({ chat, onCollapse }: AiAssistantPanelProps) {
  const messages = useAiAssistantStore((s) => s.messages);
  const selection = useAiAssistantStore((s) => s.selection);
  const setSelection = useAiAssistantStore((s) => s.setSelection);
  const clearHistory = useAiAssistantStore((s) => s.clearHistory);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        className={`flex shrink-0 flex-col gap-2 border-b border-border bg-panel-header px-3 pt-3 pb-2.5 ${
          onCollapse ? "" : "pr-11"
        }`}
      >
        <div className="flex items-center gap-1.5">
          <h2 className="flex min-w-0 flex-1 items-center gap-1.5 font-display text-sm font-semibold">
            AI 画布助手
            <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden />
          </h2>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={messages.length === 0 || chat.busy}
                className="h-7 gap-1 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                data-ocid="ai_panel.clear.open_modal_button"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                清空对话
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent data-ocid="ai_panel.clear.dialog">
              <AlertDialogHeader>
                <AlertDialogTitle>清空这块画布的 AI 对话？</AlertDialogTitle>
                <AlertDialogDescription>
                  对话记录会从本浏览器删除，画布上的节点不受影响。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel data-ocid="ai_panel.clear.cancel_button">
                  取消
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={clearHistory}
                  data-ocid="ai_panel.clear.confirm_button"
                >
                  清空对话
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          {onCollapse && (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={onCollapse}
              aria-label="收起 AI 助手"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              data-ocid="ai_panel.close_button"
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Button>
          )}
        </div>
        <ModelPicker
          kind="chat"
          value={selection}
          onChange={setSelection}
          hideLabel
          ocid="ai_panel.model"
        />
      </div>

      <AiMessageList
        messages={messages}
        busy={chat.busy}
        canSend={chat.canSend}
        onSuggest={(text) => chat.send(text)}
        onRetry={chat.retry}
      />

      <AiComposer chat={chat} />
    </div>
  );
}
