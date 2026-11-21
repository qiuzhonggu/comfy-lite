import { Layout } from "@/components/Layout";
import { CanvasStage } from "@/components/canvas/CanvasStage";
import { CanvasTitle } from "@/components/canvas/CanvasTitle";
import { AiDock } from "@/components/canvas/ai/AiDock";
import { AiToggleButton } from "@/components/canvas/ai/AiToggleButton";
import { Button } from "@/components/ui/button";
import { exportCanvas } from "@/lib/storage";
import { useAiAssistantStore } from "@/store/aiAssistantStore";
import { useCanvasStore } from "@/store/canvasStore";
import { Link, useParams } from "@tanstack/react-router";
import { Download, FileWarning, Loader2 } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";

export default function CanvasEditorPage() {
  const { canvasId } = useParams({ from: "/canvas/$canvasId" });
  const canvas = useCanvasStore((s) => s.canvas);
  const loading = useCanvasStore((s) => s.loading);
  const loadError = useCanvasStore((s) => s.loadError);
  const openCanvas = useCanvasStore((s) => s.openCanvas);
  const flushSave = useCanvasStore((s) => s.flushSave);
  const loadAiCanvas = useAiAssistantStore((s) => s.loadCanvas);

  useEffect(() => {
    void openCanvas(canvasId);
    return () => {
      void flushSave();
    };
  }, [canvasId, openCanvas, flushSave]);

  useEffect(() => {
    loadAiCanvas(canvasId);
  }, [canvasId, loadAiCanvas]);

  useEffect(() => {
    const onUnload = () => void flushSave();
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [flushSave]);

  const ready = canvas && canvas.id === canvasId;

  const onExport = async () => {
    try {
      await flushSave();
      await exportCanvas(canvasId);
    } catch {
      toast.error("导出失败，请重试");
    }
  };

  return (
    <Layout
      variant="compact"
      title={
        ready ? (
          <CanvasTitle key={canvas.id} name={canvas.name} />
        ) : (
          <span className="text-sm text-muted-foreground">加载画布…</span>
        )
      }
      actions={
        ready && (
          <>
            <AiToggleButton />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 gap-1.5 px-2.5 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => void onExport()}
              data-ocid="canvas_editor.export.button"
            >
              <Download className="h-3.5 w-3.5" aria-hidden />
              导出
            </Button>
          </>
        )
      }
    >
      {ready ? (
        <div className="absolute inset-0 flex">
          <div className="relative min-w-0 flex-1">
            <CanvasStage key={canvas.id} initialViewport={canvas.viewport} />
          </div>
          <AiDock key={canvas.id} />
        </div>
      ) : loadError && !loading ? (
        <div
          className="canvas-grid absolute inset-0 flex items-center justify-center"
          data-ocid="canvas_editor.error_state"
        >
          <div className="surface-float max-w-sm rounded-2xl p-6 text-center shadow-float">
            <FileWarning
              className="mx-auto h-8 w-8 text-destructive"
              aria-hidden
            />
            <h2 className="mt-3 font-display text-lg font-semibold">
              打不开这块画布
            </h2>
            <p className="mt-1.5 text-xs text-muted-foreground">{loadError}</p>
            <Button asChild size="sm" className="mt-4">
              <Link to="/" data-ocid="canvas_editor.error_back.link">
                返回画布列表
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <div
          className="canvas-grid absolute inset-0 flex items-center justify-center"
          data-ocid="canvas_editor.loading_state"
        >
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            正在打开画布…
          </p>
        </div>
      )}
    </Layout>
  );
}
