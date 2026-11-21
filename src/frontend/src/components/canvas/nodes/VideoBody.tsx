import { useMediaUrl } from "@/hooks/useMediaUrl";
import { type VideoPollResult, submitVideo, waitForVideo } from "@/lib/relay";
import { putMedia } from "@/lib/storage";
import { useCanvasStore } from "@/store/canvasStore";
import type { VideoNode } from "@/types";
import { Download, Search } from "lucide-react";
import { ModelPicker } from "../ModelPicker";
import { RunFooter } from "../RunFooter";
import { UpstreamSummary } from "../UpstreamSummary";
import { downloadMedia } from "../media";
import { type RunContext, useNodeRun } from "../useNodeRun";
import { readUpstream, toDataUrls, useUpstream } from "../useUpstream";
import { FIELD, ICON_BTN, SELECT } from "./styles";

const STATE_LABEL: Record<VideoPollResult["state"], string> = {
  pending: "排队中",
  running: "生成中",
  success: "下载视频中",
  error: "失败",
};

const SIZES = ["1280x720", "720x1280", "1920x1080", "1024x1024"];

export function VideoBody({
  node,
  ocid,
  title,
}: {
  node: VideoNode;
  ocid: string;
  title: string;
}) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const upstream = useUpstream(node.id);
  const { execute, needsSetup } = useNodeRun(node.id);
  const video = useMediaUrl(node.data.resultMediaId);
  const { data } = node;
  const canRun = upstream.texts.length > 0 || data.prompt.trim().length > 0;
  const canResume =
    !!data.taskId && !data.resultMediaId && node.run.status !== "running";

  const follow = async (taskId: string, { settings, progress }: RunContext) => {
    progress("等待任务开始…");
    const blob = await waitForVideo({
      settings,
      taskId,
      onProgress: (r) => {
        updateNodeData<"video">(node.id, { taskStatus: r.rawStatus });
        progress(
          r.progress !== undefined
            ? `${STATE_LABEL[r.state]} ${r.progress}%`
            : `${STATE_LABEL[r.state]}…`,
        );
      },
    });
    progress("保存视频…");
    const id = await putMedia(blob);
    updateNodeData<"video">(node.id, { resultMediaId: id });
  };

  const run = () =>
    void execute(async (ctx) => {
      const current = useCanvasStore.getState().getNode(node.id);
      if (!current || current.type !== "video") return;
      const up = readUpstream(node.id);
      const prompt = [...up.texts, current.data.prompt.trim()]
        .filter(Boolean)
        .join("\n\n");
      if (!prompt)
        throw new Error("缺少视频描述：请连接提示词卡片或填写描述。");
      ctx.progress("提交任务…");
      const [image] = await toDataUrls(up.imageMediaIds.slice(0, 1));
      const taskId = await submitVideo({
        settings: ctx.settings,
        prompt,
        model: ctx.model,
        seconds: current.data.seconds,
        size: current.data.size,
        image,
      });
      updateNodeData<"video">(node.id, {
        taskId,
        taskStatus: "submitted",
        resultMediaId: undefined,
      });
      await follow(taskId, ctx);
    });

  const resume = () =>
    void execute(async (ctx) => {
      if (data.taskId) await follow(data.taskId, ctx);
    });

  return (
    <div className="space-y-2.5">
      <div data-nodrag>
        <ModelPicker
          kind="video"
          value={{ relayId: data.relayId, model: data.model }}
          onChange={(next) =>
            updateNodeData<"video">(node.id, {
              relayId: next.relayId,
              model: next.model,
            })
          }
          ocid={`${ocid}.model`}
          disabled={node.run.status === "running"}
        />
      </div>
      <UpstreamSummary upstream={upstream} />
      {upstream.imageMediaIds.length > 0 && (
        <p className="text-[10px] text-muted-foreground">
          第一张上游图片将作为首帧参考
        </p>
      )}
      <label htmlFor={`${node.id}-prompt`} className="sr-only">
        视频描述
      </label>
      <textarea
        id={`${node.id}-prompt`}
        value={data.prompt}
        onChange={(e) =>
          updateNodeData<"video">(node.id, { prompt: e.target.value })
        }
        rows={2}
        placeholder="运动与镜头（可选）：缓慢推近、雨滴滑落…"
        className={`${FIELD} resize-none`}
        data-wheel-scroll
        data-ocid={`${ocid}.textarea`}
      />
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
          时长
          <select
            value={data.seconds}
            onChange={(e) =>
              updateNodeData<"video">(node.id, {
                seconds: Number(e.target.value),
              })
            }
            className={`${SELECT} font-mono`}
            data-ocid={`${ocid}.seconds_select`}
          >
            {[4, 5, 8, 10, 12].map((s) => (
              <option key={s} value={s}>
                {s}s
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
          画幅
          <select
            value={data.size}
            onChange={(e) =>
              updateNodeData<"video">(node.id, { size: e.target.value })
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
      </div>

      {data.taskId && (
        <p
          className="truncate font-mono text-[10px] text-muted-foreground"
          title={data.taskId}
          data-ocid={`${ocid}.task_status`}
        >
          任务 {data.taskId.slice(0, 18)} · {data.taskStatus ?? "未知"}
        </p>
      )}
      {node.run.status === "idle" && node.run.progress && (
        <p className="text-[11px] text-warning">{node.run.progress}</p>
      )}

      {data.resultMediaId && (
        <div className="space-y-1.5" data-ocid={`${ocid}.success_state`}>
          {video.url ? (
            // biome-ignore lint/a11y/useMediaCaption: generated clips have no caption track
            <video
              controls
              src={video.url}
              className="aspect-video w-full rounded-md bg-background"
            />
          ) : (
            <div className="flex aspect-video items-center justify-center rounded-md bg-muted text-[11px] text-muted-foreground">
              {video.loading ? "加载视频…" : "视频文件已丢失"}
            </div>
          )}
          <div className="flex justify-end">
            <button
              type="button"
              className={ICON_BTN}
              onClick={() =>
                data.resultMediaId &&
                void downloadMedia(data.resultMediaId, title)
              }
              data-ocid={`${ocid}.download_button`}
            >
              <Download className="h-3 w-3" aria-hidden />
              下载视频
            </button>
          </div>
        </div>
      )}

      <RunFooter
        node={node}
        ocid={ocid}
        onRun={run}
        needsSetup={needsSetup}
        canRun={canRun}
        hint="连接提示词或填写描述"
        runLabel={data.resultMediaId ? "重新生成" : "生成"}
        extra={
          canResume && (
            <button
              type="button"
              className={ICON_BTN}
              onClick={resume}
              data-ocid={`${ocid}.resume_button`}
            >
              <Search className="h-3 w-3" aria-hidden />
              继续查询
            </button>
          )
        }
      />
    </div>
  );
}
