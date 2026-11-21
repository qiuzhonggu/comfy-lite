import { useMediaUrl } from "@/hooks/useMediaUrl";
import { textToSpeech } from "@/lib/relay";
import { putMedia } from "@/lib/storage";
import { useCanvasStore } from "@/store/canvasStore";
import { useSettingsStore } from "@/store/settingsStore";
import type { VoiceNode } from "@/types";
import { Download } from "lucide-react";
import { RunFooter } from "../RunFooter";
import { UpstreamSummary } from "../UpstreamSummary";
import { downloadMedia } from "../media";
import { useNodeRun } from "../useNodeRun";
import { readUpstream, useUpstream } from "../useUpstream";
import { FIELD, ICON_BTN } from "./styles";

export function VoiceBody({
  node,
  ocid,
  title,
}: {
  node: VoiceNode;
  ocid: string;
  title: string;
}) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const defaultVoice = useSettingsStore((s) => s.settings.ttsVoice);
  const upstream = useUpstream(node.id);
  const { execute, needsSetup } = useNodeRun(node.id);
  const audio = useMediaUrl(node.data.resultMediaId);
  const { data } = node;
  const typed = data.text.trim();
  const canRun = typed.length > 0 || upstream.texts.length > 0;

  const run = () =>
    void execute(async ({ settings, progress }) => {
      const current = useCanvasStore.getState().getNode(node.id);
      if (!current || current.type !== "voice") return;
      const text =
        current.data.text.trim() || readUpstream(node.id).texts.join("\n");
      if (!text)
        throw new Error("没有可配音的文字：请输入台词或连接上游文字。");
      progress("正在合成语音…");
      const blob = await textToSpeech({
        settings,
        text,
        voice: current.data.voice,
        model: current.data.model,
      });
      progress("保存音频…");
      const id = await putMedia(blob);
      updateNodeData<"voice">(node.id, { resultMediaId: id });
    });

  return (
    <div className="space-y-2.5">
      <UpstreamSummary upstream={upstream} accepts={{ text: true }} />
      <label htmlFor={`${node.id}-text`} className="sr-only">
        台词
      </label>
      <textarea
        id={`${node.id}-text`}
        value={data.text}
        onChange={(e) =>
          updateNodeData<"voice">(node.id, { text: e.target.value })
        }
        rows={3}
        placeholder={
          upstream.texts.length ? "留空则使用上游文字配音" : "输入要配音的台词…"
        }
        className={`${FIELD} resize-none`}
        data-wheel-scroll
        data-ocid={`${ocid}.textarea`}
      />
      <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
        音色
        <input
          value={data.voice ?? ""}
          onChange={(e) =>
            updateNodeData<"voice">(node.id, { voice: e.target.value })
          }
          placeholder={defaultVoice || "默认音色"}
          className={`${FIELD} h-7 py-1 font-mono`}
          data-ocid={`${ocid}.voice_input`}
        />
      </label>

      {data.resultMediaId && (
        <div
          className="space-y-1.5 rounded-md bg-muted/60 p-2"
          data-ocid={`${ocid}.success_state`}
        >
          {audio.url ? (
            // biome-ignore lint/a11y/useMediaCaption: generated speech has no caption track
            <audio controls src={audio.url} className="h-8 w-full" />
          ) : (
            <p className="text-[11px] text-muted-foreground">
              {audio.loading ? "加载音频…" : "音频文件已丢失"}
            </p>
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
              下载音频
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
        hint="输入台词或连接上游文字"
        runLabel={data.resultMediaId ? "重新配音" : "配音"}
      />
    </div>
  );
}
