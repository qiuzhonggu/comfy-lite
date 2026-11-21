import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { legacyRelay, useSettingsStore } from "@/store/settingsStore";
import { selectTriggerClass } from "./DefaultModels";
import { SettingsField } from "./SettingsField";

const AUTO = "__auto__";

export function TtsSettings() {
  const config = useSettingsStore((s) => s.config);
  const updateTts = useSettingsStore((s) => s.updateTts);
  const effective = legacyRelay(config);

  return (
    <section
      className="rounded-lg border border-border bg-panel p-4 shadow-panel sm:p-5"
      aria-labelledby="tts-title"
      data-ocid="settings.tts.section"
    >
      <h2
        id="tts-title"
        className="flex items-center gap-2 font-display text-sm font-semibold"
      >
        <span
          className="node-voice node-dot h-2 w-2 rounded-full"
          aria-hidden
        />
        语音（TTS）
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        配音节点使用的中转站、模型与音色。
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor="tts-relay" className="text-xs font-medium">
            语音中转站
          </Label>
          <Select
            value={config.tts.relayId ?? AUTO}
            onValueChange={(v) =>
              updateTts({ relayId: v === AUTO ? undefined : v })
            }
            disabled={config.relays.length === 0}
          >
            <SelectTrigger
              id="tts-relay"
              className={selectTriggerClass}
              data-ocid="settings.tts.relay.select"
            >
              <SelectValue placeholder="请先新增中转站" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={AUTO}>自动（跟随默认对话中转站）</SelectItem>
              {config.relays.map((r, i) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name.trim() || `中转站 ${i + 1}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground">
            {effective
              ? `当前使用：${effective.name || "未命名中转站"}`
              : "还没有可用的中转站"}
          </p>
        </div>
        <SettingsField
          id="tts-model"
          label="语音模型"
          value={config.tts.model}
          onChange={(v) => updateTts({ model: v })}
          placeholder="tts-1"
          ocid="settings.tts.model.input"
        />
        <SettingsField
          id="tts-voice"
          label="配音音色"
          value={config.tts.voice}
          onChange={(v) => updateTts({ voice: v })}
          placeholder="alloy"
          ocid="settings.tts.voice.input"
          hint="如 alloy、echo、nova，以中转站支持为准。"
        />
      </div>
    </section>
  );
}
