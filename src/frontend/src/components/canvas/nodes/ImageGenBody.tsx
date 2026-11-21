import { generateImage } from "@/lib/relay";
import { putMedia } from "@/lib/storage";
import { useCanvasStore } from "@/store/canvasStore";
import type { ImageGenNode } from "@/types";
import { Download, Maximize2 } from "lucide-react";
import { useState } from "react";
import { ModelPicker } from "../ModelPicker";
import { RunFooter } from "../RunFooter";
import { UpstreamSummary } from "../UpstreamSummary";
import { ImagePreviewDialog, MediaImage, downloadMedia } from "../media";
import { useNodeRun } from "../useNodeRun";
import { readUpstream, toDataUrls, useUpstream } from "../useUpstream";
import { FIELD, SELECT } from "./styles";

const SIZES = ["1024x1024", "1536x1024", "1024x1536", "1792x1024", "1024x1792"];

export function ImageGenBody({
  node,
  ocid,
  title,
}: {
  node: ImageGenNode;
  ocid: string;
  title: string;
}) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const upstream = useUpstream(node.id);
  const { execute, needsSetup } = useNodeRun(node.id);
  const [preview, setPreview] = useState<string | null>(null);
  const { data } = node;
  const canRun = upstream.texts.length > 0 || data.prompt.trim().length > 0;

  const run = () =>
    void execute(async ({ settings, model, progress }) => {
      const current = useCanvasStore.getState().getNode(node.id);
      if (!current || current.type !== "imageGen") return;
      const up = readUpstream(node.id);
      const prompt = [...up.texts, current.data.prompt.trim()]
        .filter(Boolean)
        .join("\n\n");
      if (!prompt)
        throw new Error("缺少画面描述：请连接提示词卡片或填写补充描述。");
      progress(up.imageMediaIds.length ? "读取参考图…" : "正在生成图片…");
      const referenceImages = await toDataUrls(up.imageMediaIds);
      progress("正在生成图片…");
      const blobs = await generateImage({
        settings,
        prompt,
        model,
        size: current.data.size,
        n: current.data.n,
        referenceImages,
      });
      progress("保存结果…");
      const ids: string[] = [];
      for (const b of blobs) ids.push(await putMedia(b));
      updateNodeData<"imageGen">(node.id, { resultMediaIds: ids });
    });

  return (
    <div className="space-y-2.5">
      <div data-nodrag>
        <ModelPicker
          kind="image"
          value={{ relayId: data.relayId, model: data.model }}
          onChange={(next) =>
            updateNodeData<"imageGen">(node.id, {
              relayId: next.relayId,
              model: next.model,
            })
          }
          ocid={`${ocid}.model`}
          disabled={node.run.status === "running"}
        />
      </div>
      <UpstreamSummary upstream={upstream} />
      <label htmlFor={`${node.id}-prompt`} className="sr-only">
        补充描述
      </label>
      <textarea
        id={`${node.id}-prompt`}
        value={data.prompt}
        onChange={(e) =>
          updateNodeData<"imageGen">(node.id, { prompt: e.target.value })
        }
        rows={2}
        placeholder="补充描述（可选）：画风、镜头、色调…"
        className={`${FIELD} resize-none`}
        data-wheel-scroll
        data-ocid={`${ocid}.textarea`}
      />
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
          尺寸
          <select
            value={data.size}
            onChange={(e) =>
              updateNodeData<"imageGen">(node.id, { size: e.target.value })
            }
            className={`${SELECT} font-mono`}
            data-ocid={`${ocid}.size_select`}
          >
            {SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
          张数
          <select
            value={data.n}
            onChange={(e) =>
              updateNodeData<"imageGen">(node.id, { n: Number(e.target.value) })
            }
            className={`${SELECT} font-mono`}
            data-ocid={`${ocid}.count_select`}
          >
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>

      {data.resultMediaIds.length > 0 && (
        <div
          className={`grid gap-1.5 ${data.resultMediaIds.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}
          data-ocid={`${ocid}.success_state`}
        >
          {data.resultMediaIds.map((id, i) => (
            <div key={id} className="group relative overflow-hidden rounded-md">
              <button
                type="button"
                onClick={() => setPreview(id)}
                className="block w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`放大查看第 ${i + 1} 张`}
                data-ocid={`${ocid}.result.${i + 1}`}
              >
                <MediaImage
                  mediaId={id}
                  alt={`${title} 结果 ${i + 1}`}
                  className="aspect-square w-full"
                />
              </button>
              <div className="pointer-events-none absolute right-1 top-1 flex gap-1 opacity-0 transition-smooth group-focus-within:opacity-100 group-hover:opacity-100">
                <span className="surface-float flex h-6 w-6 items-center justify-center rounded-md">
                  <Maximize2 className="h-3 w-3" aria-hidden />
                </span>
                <button
                  type="button"
                  onClick={() => void downloadMedia(id, `${title}-${i + 1}`)}
                  className="surface-float pointer-events-auto flex h-6 w-6 items-center justify-center rounded-md transition-smooth hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`下载第 ${i + 1} 张`}
                  data-ocid={`${ocid}.download_button.${i + 1}`}
                >
                  <Download className="h-3 w-3" aria-hidden />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <RunFooter
        node={node}
        ocid={ocid}
        onRun={run}
        needsSetup={needsSetup}
        canRun={canRun}
        hint="连接提示词或填写描述"
        runLabel={data.resultMediaIds.length ? "重新生成" : "生成"}
      />
      <ImagePreviewDialog
        mediaId={preview}
        title={title}
        onClose={() => setPreview(null)}
      />
    </div>
  );
}
