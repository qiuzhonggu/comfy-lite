import { putMedia } from "@/lib/storage";
import { useCanvasStore } from "@/store/canvasStore";
import type { ImageRefNode } from "@/types";
import { ImageUp, RefreshCw } from "lucide-react";
import { type DragEvent, useRef, useState } from "react";
import { toast } from "sonner";
import { ImagePreviewDialog, MediaImage } from "../media";
import { ICON_BTN } from "./styles";

const MAX_BYTES = 20 * 1024 * 1024;

export function ImageRefBody({
  node,
  ocid,
}: {
  node: ImageRefNode;
  ocid: string;
}) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const { mediaId, fileName } = node.data;

  const accept = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("请选择图片文件（PNG、JPG、WebP 等）");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("图片超过 20MB，请压缩后再上传");
      return;
    }
    setBusy(true);
    try {
      const id = await putMedia(file);
      updateNodeData<"imageRef">(node.id, { mediaId: id, fileName: file.name });
    } catch {
      toast.error("保存图片失败，浏览器存储空间可能不足");
    } finally {
      setBusy(false);
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    void accept(e.dataTransfer.files[0]);
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void accept(e.target.files?.[0]);
          e.target.value = "";
        }}
        data-ocid={`${ocid}.upload_input`}
      />
      {mediaId ? (
        <>
          <button
            type="button"
            className="block w-full overflow-hidden rounded-md transition-smooth hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setPreview(mediaId)}
            aria-label="查看大图"
            data-ocid={`${ocid}.preview_button`}
          >
            <MediaImage
              mediaId={mediaId}
              alt={fileName ?? "参考图"}
              className="aspect-[4/3] w-full"
            />
          </button>
          <div className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-muted-foreground">
              {fileName ?? "本地图片"}
            </span>
            <button
              type="button"
              className={ICON_BTN}
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              data-ocid={`${ocid}.upload_button`}
            >
              <RefreshCw className="h-3 w-3" aria-hidden />
              更换
            </button>
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          disabled={busy}
          className="node-tint flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border text-xs text-muted-foreground transition-smooth hover:border-muted-foreground/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          data-ocid={`${ocid}.dropzone`}
        >
          <ImageUp className="node-text h-6 w-6" aria-hidden />
          {busy ? "正在保存…" : "点击上传或拖入本地图片"}
          <span className="text-[10px]">仅保存在本浏览器</span>
        </button>
      )}
      <ImagePreviewDialog
        mediaId={preview}
        title={fileName?.replace(/\.[^.]+$/, "") ?? "参考图"}
        onClose={() => setPreview(null)}
      />
    </div>
  );
}
