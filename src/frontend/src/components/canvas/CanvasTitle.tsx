import { useCanvasStore } from "@/store/canvasStore";
import { Link } from "@tanstack/react-router";
import { AlertCircle, ArrowLeft, Check, Loader2, Pencil } from "lucide-react";
import { useState } from "react";

const SAVE_LABEL = {
  idle: "本地存储",
  saving: "保存中…",
  saved: "已保存到本地",
  error: "保存失败",
} as const;

export function CanvasTitle({ name }: { name: string }) {
  const renameCanvas = useCanvasStore((s) => s.renameCanvas);
  const saveState = useCanvasStore((s) => s.saveState);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);

  const commit = () => {
    setEditing(false);
    if (draft.trim() && draft.trim() !== name) renameCanvas(draft);
    else setDraft(name);
  };

  return (
    <div className="flex min-w-0 items-center gap-2">
      <Link
        to="/"
        className="flex h-7 shrink-0 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground transition-smooth hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        data-ocid="canvas_editor.back.link"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        画布列表
      </Link>
      <span className="text-muted-foreground/50" aria-hidden>
        /
      </span>
      {editing ? (
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setDraft(name);
              setEditing(false);
            }
          }}
          maxLength={60}
          aria-label="画布名称"
          className="h-7 w-56 min-w-0 rounded-md border border-ring bg-background px-2 font-display text-sm font-semibold focus-visible:outline-none"
          // biome-ignore lint/a11y/noAutofocus: inline rename starts on explicit user action
          autoFocus
          data-ocid="canvas_editor.name.input"
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setDraft(name);
            setEditing(true);
          }}
          className="group flex h-7 min-w-0 items-center gap-1.5 rounded-md px-2 transition-smooth hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          title="点击重命名"
          data-ocid="canvas_editor.name.edit_button"
        >
          <span className="truncate font-display text-sm font-semibold">
            {name}
          </span>
          <Pencil
            className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 transition-smooth group-hover:opacity-100 group-focus-visible:opacity-100"
            aria-hidden
          />
        </button>
      )}
      <span
        className={`hidden shrink-0 items-center gap-1 text-[11px] sm:flex ${saveState === "error" ? "text-destructive" : "text-muted-foreground"}`}
        aria-live="polite"
        data-ocid="canvas_editor.save_state"
      >
        {saveState === "saving" && (
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
        )}
        {saveState === "saved" && (
          <Check className="h-3 w-3 text-success" aria-hidden />
        )}
        {saveState === "error" && (
          <AlertCircle className="h-3 w-3" aria-hidden />
        )}
        {SAVE_LABEL[saveState]}
      </span>
    </div>
  );
}
