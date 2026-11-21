import type { UpstreamInputs } from "@/types";
import { Link2, Link2Off } from "lucide-react";
import { MediaImage } from "./media";

interface UpstreamSummaryProps {
  upstream: UpstreamInputs;
  /** Only show the parts this card consumes */
  accepts?: { text?: boolean; images?: boolean };
}

export function UpstreamSummary({
  upstream,
  accepts = { text: true, images: true },
}: UpstreamSummaryProps) {
  const texts = accepts.text ? upstream.texts : [];
  const images = accepts.images ? upstream.imageMediaIds : [];

  if (texts.length === 0 && images.length === 0) {
    return (
      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Link2Off className="h-3 w-3" aria-hidden />
        {upstream.sources.length > 0
          ? "上游卡片暂无可用内容"
          : "未连接上游卡片"}
      </p>
    );
  }

  return (
    <div className="space-y-1.5 rounded-md bg-muted/60 p-2">
      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Link2 className="h-3 w-3 text-primary" aria-hidden />
        上游输入
        {texts.length > 0 && ` · ${texts.length} 段文字`}
        {images.length > 0 && ` · ${images.length} 张图片`}
      </p>
      {texts.length > 0 && (
        <p className="line-clamp-2 break-words text-xs text-foreground/80">
          {texts[0]}
        </p>
      )}
      {images.length > 0 && (
        <div className="flex gap-1">
          {images.slice(0, 4).map((id) => (
            <MediaImage
              key={id}
              mediaId={id}
              alt="上游图片"
              className="h-8 w-8"
            />
          ))}
        </div>
      )}
    </div>
  );
}
