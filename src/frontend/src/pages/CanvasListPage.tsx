import { Layout } from "@/components/Layout";
import { CanvasCard } from "@/components/canvas-list/CanvasCard";
import {
  DeleteDialog,
  RenameDialog,
} from "@/components/canvas-list/CanvasDialogs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCanvasList,
  useCreateCanvas,
  useDeleteCanvas,
  useExportCanvas,
  useImportCanvas,
  useRenameCanvas,
} from "@/hooks/useCanvasList";
import type { CanvasSummary } from "@/types/canvas";
import { useNavigate } from "@tanstack/react-router";
import { Clapperboard, FileUp, Plus, RotateCcw } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

const SKELETONS = Array.from({ length: 6 }, (_, i) => `skeleton-${i}`);

function errorText(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

export default function CanvasListPage() {
  const { data, isLoading, isError, error, refetch } = useCanvasList();
  const createCanvas = useCreateCanvas();
  const renameCanvas = useRenameCanvas();
  const deleteCanvas = useDeleteCanvas();
  const exportCanvas = useExportCanvas();
  const importCanvas = useImportCanvas();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [renaming, setRenaming] = useState<CanvasSummary | null>(null);
  const [deleting, setDeleting] = useState<CanvasSummary | null>(null);

  const canvases = data ?? [];

  const handleCreate = () => {
    createCanvas.mutate(undefined, {
      onSuccess: (c) =>
        void navigate({ to: "/canvas/$canvasId", params: { canvasId: c.id } }),
      onError: (e) => toast.error(errorText(e, "新建画布失败，请重试")),
    });
  };

  const handleImportFile = (file: File | undefined) => {
    if (!file) return;
    importCanvas.mutate(file, {
      onSuccess: (c) => toast.success(`已导入「${c.name}」`),
      onError: (e) => toast.error(errorText(e, "导入失败：文件无法读取")),
    });
  };

  const handleExport = (c: CanvasSummary) => {
    exportCanvas.mutate(c.id, {
      onSuccess: () => toast.success(`「${c.name}」已导出为备份文件`),
      onError: (e) => toast.error(errorText(e, "导出失败，请重试")),
    });
  };

  const handleRename = (id: string, name: string) => {
    renameCanvas.mutate(
      { id, name },
      {
        onSuccess: () => {
          setRenaming(null);
          toast.success("已重命名");
        },
        onError: (e) => toast.error(errorText(e, "重命名失败，请重试")),
      },
    );
  };

  const handleDelete = (id: string) => {
    deleteCanvas.mutate(id, {
      onSuccess: () => {
        setDeleting(null);
        toast.success("画布已删除");
      },
      onError: (e) => toast.error(errorText(e, "删除失败，请重试")),
    });
  };

  const actions = (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 gap-1.5 text-xs"
        onClick={() => fileRef.current?.click()}
        disabled={importCanvas.isPending}
        data-ocid="canvas_list.import.upload_button"
      >
        <FileUp className="h-3.5 w-3.5" aria-hidden />
        {importCanvas.isPending ? "导入中…" : "导入"}
      </Button>
      <Button
        type="button"
        size="sm"
        className="h-7 gap-1.5 text-xs"
        onClick={handleCreate}
        disabled={createCanvas.isPending}
        data-ocid="canvas_list.create.primary_button"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden />
        {createCanvas.isPending ? "创建中…" : "新建画布"}
      </Button>
    </>
  );

  return (
    <Layout actions={actions}>
      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        aria-label="选择画布备份文件"
        onChange={(e) => {
          handleImportFile(e.target.files?.[0]);
          e.target.value = "";
        }}
        data-ocid="canvas_list.import.input"
      />
      <div
        className="mx-auto max-w-6xl px-6 py-8 md:px-8"
        data-ocid="canvas_list.page"
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              我的画布
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              所有画布仅保存在本浏览器中 · 可导出为备份文件随时恢复
            </p>
          </div>
          {!isLoading && canvases.length > 0 && (
            <span className="font-mono text-xs text-muted-foreground">
              共 {canvases.length} 个画布
            </span>
          )}
        </div>

        {isLoading ? (
          <div
            className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            data-ocid="canvas_list.loading_state"
            aria-busy="true"
            aria-label="正在读取本地画布"
          >
            {SKELETONS.map((id) => (
              <div
                key={id}
                className="overflow-hidden rounded-lg border bg-card"
              >
                <Skeleton className="aspect-video w-full rounded-none" />
                <div className="space-y-2 p-3.5">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div
            className="mt-10 flex flex-col items-center rounded-lg border border-destructive/40 bg-card px-6 py-12 text-center"
            data-ocid="canvas_list.error_state"
          >
            <p className="font-display text-base font-semibold">
              无法读取本地画布
            </p>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              {errorText(error, "浏览器存储不可用，请检查是否禁用了站点数据。")}
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-5 gap-1.5"
              onClick={() => void refetch()}
              data-ocid="canvas_list.retry_button"
            >
              <RotateCcw className="h-4 w-4" aria-hidden />
              重新读取
            </Button>
          </div>
        ) : canvases.length === 0 ? (
          <div
            className="mt-10 flex flex-col items-center rounded-lg border border-dashed bg-card/60 px-6 py-16 text-center"
            data-ocid="canvas_list.empty_state"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Clapperboard className="h-6 w-6" aria-hidden />
            </span>
            <p className="mt-4 font-display text-lg font-semibold">
              还没有画布
            </p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              新建一个画布，把提示词、参考图、生图、视频与配音卡片连成你的分镜流程；或导入之前导出的备份。
            </p>
            <div className="mt-6 flex gap-2">
              <Button
                type="button"
                onClick={handleCreate}
                disabled={createCanvas.isPending}
                className="gap-1.5"
                data-ocid="canvas_list.empty.primary_button"
              >
                <Plus className="h-4 w-4" aria-hidden />
                新建画布
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => fileRef.current?.click()}
                className="gap-1.5"
                data-ocid="canvas_list.empty.secondary_button"
              >
                <FileUp className="h-4 w-4" aria-hidden />
                导入备份
              </Button>
            </div>
          </div>
        ) : (
          <div
            className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            data-ocid="canvas_list.list"
          >
            {canvases.map((c, i) => (
              <CanvasCard
                key={c.id}
                canvas={c}
                index={i}
                exporting={
                  exportCanvas.isPending && exportCanvas.variables === c.id
                }
                onRename={setRenaming}
                onExport={handleExport}
                onDelete={setDeleting}
              />
            ))}
          </div>
        )}
      </div>

      <RenameDialog
        canvas={renaming}
        pending={renameCanvas.isPending}
        onClose={() => setRenaming(null)}
        onSubmit={handleRename}
      />
      <DeleteDialog
        canvas={deleting}
        pending={deleteCanvas.isPending}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
      />
    </Layout>
  );
}
