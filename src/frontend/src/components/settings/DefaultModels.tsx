import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  decodeOption,
  encodeOption,
  listModelOptions,
} from "@/lib/modelResolve";
import { useSettingsStore } from "@/store/settingsStore";
import { MODEL_KINDS, MODEL_KIND_LABELS, type ModelKind } from "@/types";

const NODE_CLASS: Record<ModelKind, string> = {
  chat: "node-chat",
  image: "node-image-gen",
  video: "node-video",
};

export const selectTriggerClass =
  "h-9 rounded-md border-input bg-background text-[13px] transition-smooth hover:border-muted-foreground/50 focus:ring-2 focus:ring-ring/40 focus:ring-offset-0";

export function DefaultModels() {
  const config = useSettingsStore((s) => s.config);
  const setDefault = useSettingsStore((s) => s.setDefault);

  return (
    <section
      className="rounded-lg border border-border bg-panel p-4 shadow-panel sm:p-5"
      aria-labelledby="defaults-title"
      data-ocid="settings.defaults.section"
    >
      <h2 id="defaults-title" className="font-display text-sm font-semibold">
        默认模型
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        节点和 AI 面板未单独选择时，使用这里的“中转站 + 模型”组合。
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {MODEL_KINDS.map((kind) => {
          const groups = listModelOptions(config, kind);
          const current = config.defaults[kind];
          const label = `默认${MODEL_KIND_LABELS[kind]}模型`;
          const id = `default-${kind}`;
          return (
            <div key={kind} className="flex min-w-0 flex-col gap-1.5">
              <Label
                htmlFor={id}
                className="flex items-center gap-2 text-xs font-medium"
              >
                <span
                  className={`${NODE_CLASS[kind]} node-dot h-2 w-2 rounded-full`}
                  aria-hidden
                />
                {label}
              </Label>
              <Select
                value={
                  current ? encodeOption(current.relayId, current.model) : ""
                }
                onValueChange={(v) => {
                  const sel = decodeOption(v);
                  if (sel.relayId && sel.model)
                    setDefault(kind, {
                      relayId: sel.relayId,
                      model: sel.model,
                    });
                }}
                disabled={groups.length === 0}
              >
                <SelectTrigger
                  id={id}
                  className={selectTriggerClass}
                  data-ocid={`settings.defaults.${kind}.select`}
                >
                  <SelectValue
                    placeholder={`先在中转站下添加${MODEL_KIND_LABELS[kind]}模型`}
                  />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((g) => (
                    <SelectGroup key={g.relayId}>
                      <SelectLabel className="text-[11px] text-muted-foreground">
                        {g.relayName}
                      </SelectLabel>
                      {g.models.map((m) => (
                        <SelectItem
                          key={m}
                          value={encodeOption(g.relayId, m)}
                          className="font-mono text-[13px]"
                        >
                          {g.relayName} / {m}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        })}
      </div>
    </section>
  );
}
