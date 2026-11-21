import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAiAssistantStore } from "@/store/aiAssistantStore";
import { Sparkles } from "lucide-react";
import { AiAssistantPanel } from "./AiAssistantPanel";
import { useAiChat } from "./useAiChat";

/** Right AI dock: docked panel / slim rail on desktop, overlay sheet on mobile */
export function AiDock() {
  const open = useAiAssistantStore((s) => s.open);
  const setOpen = useAiAssistantStore((s) => s.setOpen);
  const isMobile = useIsMobile(1024);
  const chat = useAiChat();

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-full gap-0 border-l bg-panel p-0 sm:max-w-[400px]"
          data-ocid="ai_panel.sheet"
        >
          <SheetTitle className="sr-only">AI 画布助手</SheetTitle>
          <SheetDescription className="sr-only">
            用自然语言让 AI 新增、修改、连接或排列画布节点
          </SheetDescription>
          <AiAssistantPanel chat={chat} />
        </SheetContent>
      </Sheet>
    );
  }

  if (!open) {
    return (
      <aside
        className="flex w-11 shrink-0 flex-col items-center gap-2 border-l border-border bg-panel py-3"
        aria-label="AI 画布助手（已收起）"
        data-ocid="ai_panel.rail"
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="展开 AI 助手"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-primary transition-smooth hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          data-ocid="ai_panel.open_button"
        >
          <Sparkles className="h-4 w-4" aria-hidden />
        </button>
        <span className="text-[11px] tracking-widest text-muted-foreground [writing-mode:vertical-rl]">
          AI 助手
        </span>
        {chat.busy && (
          <span
            className="mt-1 h-1.5 w-1.5 animate-typing-dot rounded-full bg-primary"
            aria-hidden
          />
        )}
      </aside>
    );
  }

  return (
    <aside
      className="relative z-10 flex w-[340px] shrink-0 animate-msg-in flex-col border-l border-border bg-panel shadow-panel xl:w-[360px]"
      aria-label="AI 画布助手"
      data-ocid="ai_panel.panel"
    >
      <AiAssistantPanel chat={chat} onCollapse={() => setOpen(false)} />
    </aside>
  );
}
