import { BoxSelect, Hand, Maximize, Minus, Plus, Trash2 } from "lucide-react";

interface ViewControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onFit: () => void;
  boxMode: boolean;
  onToggleBox: () => void;
  deleteLabel: string | null;
  onDelete: () => void;
}

const BTN =
  "flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-smooth hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95 disabled:pointer-events-none disabled:opacity-40";

export function ViewControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onReset,
  onFit,
  boxMode,
  onToggleBox,
  deleteLabel,
  onDelete,
}: ViewControlsProps) {
  return (
    <div
      className="surface-float absolute bottom-4 right-4 z-20 flex items-center gap-0.5 rounded-xl p-1 shadow-float"
      data-ocid="canvas_editor.view_controls.panel"
    >
      <button
        type="button"
        className={`${BTN} ${boxMode ? "" : "bg-accent text-accent-foreground"}`}
        onClick={boxMode ? onToggleBox : undefined}
        aria-pressed={!boxMode}
        aria-label="平移模式：拖动空白处移动画布"
        title="平移模式（拖动空白处移动画布）"
        data-ocid="canvas_editor.pan_mode.toggle"
      >
        <Hand className="h-4 w-4" aria-hidden />
      </button>
      <button
        type="button"
        className={`${BTN} ${boxMode ? "bg-accent text-accent-foreground" : ""}`}
        onClick={boxMode ? undefined : onToggleBox}
        aria-pressed={boxMode}
        aria-label="框选模式：拖动空白处框选卡片"
        title="框选模式（也可按住 Shift 拖动）"
        data-ocid="canvas_editor.box_mode.toggle"
      >
        <BoxSelect className="h-4 w-4" aria-hidden />
      </button>
      <span className="mx-1 h-5 w-px bg-border" aria-hidden />
      <button
        type="button"
        className={BTN}
        onClick={onZoomOut}
        aria-label="缩小"
        data-ocid="canvas_editor.zoom_out.button"
      >
        <Minus className="h-4 w-4" aria-hidden />
      </button>
      <button
        type="button"
        className="h-8 min-w-14 rounded-lg px-1 font-mono text-xs text-foreground transition-smooth hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={onReset}
        title="重置为 100%"
        data-ocid="canvas_editor.zoom_reset.button"
      >
        {Math.round(zoom * 100)}%
      </button>
      <button
        type="button"
        className={BTN}
        onClick={onZoomIn}
        aria-label="放大"
        data-ocid="canvas_editor.zoom_in.button"
      >
        <Plus className="h-4 w-4" aria-hidden />
      </button>
      <button
        type="button"
        className={BTN}
        onClick={onFit}
        aria-label="显示全部卡片"
        title="显示全部卡片"
        data-ocid="canvas_editor.zoom_fit.button"
      >
        <Maximize className="h-4 w-4" aria-hidden />
      </button>
      <span className="mx-1 h-5 w-px bg-border" aria-hidden />
      <button
        type="button"
        className={`${BTN} hover:bg-destructive/15 hover:text-destructive`}
        onClick={onDelete}
        disabled={!deleteLabel}
        aria-label={deleteLabel ?? "删除（请先选中卡片或连线）"}
        title={deleteLabel ?? "先选中卡片或连线（Delete 键）"}
        data-ocid="canvas_editor.delete_button"
      >
        <Trash2 className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
