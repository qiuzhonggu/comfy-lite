import { Button } from "@/components/ui/button";
import { useAiAssistantStore } from "@/store/aiAssistantStore";
import { Sparkles } from "lucide-react";

/** Header toggle for the right AI dock */
export function AiToggleButton() {
  const open = useAiAssistantStore((s) => s.open);
  const toggleOpen = useAiAssistantStore((s) => s.toggleOpen);
  const busy = useAiAssistantStore((s) => s.busy);

  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      onClick={toggleOpen}
      aria-pressed={open}
      className={`relative h-7 gap-1.5 px-2.5 text-xs ${
        open
          ? "bg-primary/15 text-primary hover:bg-primary/20 hover:text-primary"
          : "text-muted-foreground hover:text-foreground"
      }`}
      data-ocid="canvas_editor.ai_assistant.toggle"
    >
      <Sparkles className="h-3.5 w-3.5" aria-hidden />
      AI 助手
      {busy && !open && (
        <span
          className="absolute top-1 right-1 h-1.5 w-1.5 animate-typing-dot rounded-full bg-primary"
          aria-hidden
        />
      )}
    </Button>
  );
}
