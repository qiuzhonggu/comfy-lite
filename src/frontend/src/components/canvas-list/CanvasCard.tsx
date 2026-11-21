import { useMediaUrl } from "@/hooks/useMediaUrl";
import type { CanvasSummary } from "@/types/canvas";
import { Link } from "@tanstack/react-router";
import { Download, Film, Loader2, Pencil, Trash2 } from "lucide-react";

interface CanvasCardProps {
  canvas: CanvasSummary;
  index: number;
  exporting: boolean;
  onRename: (canvas: CanvasSummary) => void;
  onExport: (canvas: CanvasSummary) => void;
  onDelete: (canvas: CanvasSummary) => void;
}

const timeFormat = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function formatUpdated(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "刚刚";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`;
  return timeFormat.format(new Date(ts));
}

const actionBtn =
  "flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-smooth hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95 disabled:opacity-50";

export function CanvasCard({
  canvas,
  index,
  exporting,
  onRename,
  onExport,
  onDelete,
}: CanvasCardProps) {
  const { url, loading } = useMediaUrl(canvas.coverMediaId);
  const n = index + 1;

  return (
    <article
      className="group flex flex-col overflow-hidden rounded-lg border bg-card transition-smooth hover:border-primary/50 focus-within:border-primary/50"
      data-ocid={`canvas_list.item.${n}`}
    >
      <Link
        to="/canvas/$canvasId"
        params={{ canvasId: canvas.id }}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        data-ocid={`canvas_list.open_link.${n}`}
        aria-label={`打开画布 ${canvas.name}`}
      >
        <div className="relative aspect-video overflow-hidden bg-muted">
          {url ? (
            <img
              src={url}
              alt={`${canvas.name} 封面`}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle,oklch(var(--border))_1px,transparent_1px)] [background-size:14px_14px]">
              {loading ? (
                <Loader2
                  className="h-5 w-5 animate-spin text-muted-foreground"
                  aria-hidden
                />
              ) : (
                <Film
                  className="h-7 w-7 text-muted-foreground/60"
                  aria-hidden
                />
              )}
            </div>
          )}
          <span className="absolute bottom-2 left-2 rounded-md bg-background/80 px-1.5 py-0.5 font-mono text-[10px] text-foreground backdrop-blur-sm">
            {canvas.nodeCount} 张卡片 · {canvas.edgeCount} 条连线
          </span>
        </div>
        <div className="px-3.5 pt-3">
          <h2 className="truncate font-display text-sm font-semibold text-foreground">
            {canvas.name}
          </h2>
        </div>
      </Link>
      <div className="flex items-center justify-between gap-2 px-3.5 pb-2.5 pt-1">
        <time
          dateTime={new Date(canvas.updatedAt).toISOString()}
          className="min-w-0 truncate font-mono text-[11px] text-muted-foreground"
        >
          更新于 {formatUpdated(canvas.updatedAt)}
        </time>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            className={actionBtn}
            onClick={() => onRename(canvas)}
            aria-label={`重命名 ${canvas.name}`}
            title="重命名"
            data-ocid={`canvas_list.edit_button.${n}`}
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden />
          </button>
          <button
            type="button"
            className={actionBtn}
            onClick={() => onExport(canvas)}
            disabled={exporting}
            aria-label={`导出 ${canvas.name}`}
            title="导出备份"
            data-ocid={`canvas_list.export_button.${n}`}
          >
            {exporting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <Download className="h-3.5 w-3.5" aria-hidden />
            )}
          </button>
          <button
            type="button"
            className={`${actionBtn} hover:bg-destructive/15 hover:text-destructive`}
            onClick={() => onDelete(canvas)}
            aria-label={`删除 ${canvas.name}`}
            title="删除"
            data-ocid={`canvas_list.delete_button.${n}`}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </div>
    </article>
  );
}
