import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useMediaUrl } from "@/hooks/useMediaUrl";
import { getMediaBlob } from "@/lib/storage";
import { Download, ImageOff } from "lucide-react";
import { toast } from "sonner";

const EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/ogg": "ogg",
  "audio/aac": "aac",
  "audio/flac": "flac",
};

/** Saves a stored media blob to the user's device */
export async function downloadMedia(mediaId: string, baseName: string) {
  try {
    const blob = await getMediaBlob(mediaId);
    if (!blob) {
      toast.error("文件已丢失，无法下载");
      return;
    }
    const ext = EXT[blob.type] ?? blob.type.split("/")[1] ?? "bin";
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${baseName}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch {
    toast.error("下载失败，请重试");
  }
}

interface MediaImageProps {
  mediaId: string;
  alt: string;
  className?: string;
}

export function MediaImage({ mediaId, alt, className = "" }: MediaImageProps) {
  const { url, loading, missing } = useMediaUrl(mediaId);
  if (loading) return <Skeleton className={`${className} rounded-md`} />;
  if (missing || !url) {
    return (
      <div
        className={`${className} flex flex-col items-center justify-center gap-1 rounded-md bg-muted text-[11px] text-muted-foreground`}
      >
        <ImageOff className="h-4 w-4" aria-hidden />
        文件已丢失
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={alt}
      draggable={false}
      className={`${className} rounded-md object-cover`}
    />
  );
}

interface PreviewProps {
  mediaId: string | null;
  title: string;
  onClose: () => void;
}

export function ImagePreviewDialog({ mediaId, title, onClose }: PreviewProps) {
  return (
    <Dialog open={!!mediaId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-4xl gap-3 border-border bg-popover p-4"
        data-ocid="canvas_editor.image_preview.dialog"
      >
        <DialogTitle className="font-display text-sm font-semibold">
          {title}
        </DialogTitle>
        <DialogDescription className="sr-only">图片大图预览</DialogDescription>
        {mediaId && (
          <>
            <MediaImage
              mediaId={mediaId}
              alt={title}
              className="max-h-[70vh] w-full !object-contain bg-background"
            />
            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                onClick={() => void downloadMedia(mediaId, title)}
                data-ocid="canvas_editor.image_preview.download_button"
              >
                <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                下载图片
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
