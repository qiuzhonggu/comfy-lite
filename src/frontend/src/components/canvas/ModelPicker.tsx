import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  decodeOption,
  encodeOption,
  listModelOptions,
  resolveModel,
} from "@/lib/modelResolve";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/store/settingsStore";
import {
  MODEL_KIND_LABELS,
  type ModelKind,
  type ModelSelection,
} from "@/types";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, Server, Settings } from "lucide-react";

const DEFAULT_VALUE = "__default__";

interface ModelPickerProps {
  kind: ModelKind;
  value: ModelSelection;
  onChange: (next: ModelSelection) => void;
  /** data-ocid prefix, e.g. "chat_node.1" */
  ocid?: string;
  className?: string;
  disabled?: boolean;
  /** Hides the "中转站 / 模型" caption */
  hideLabel?: boolean;
}

/** Compact 中转站 / 模型 select; empty value means "use the default" */
export function ModelPicker({
  kind,
  value,
  onChange,
  ocid = "model_picker",
  className,
  disabled,
  hideLabel,
}: ModelPickerProps) {
  const config = useSettingsStore((s) => s.config);
  const groups = listModelOptions(config, kind);
  const resolved = resolveModel(config, kind, value);
  const label = MODEL_KIND_LABELS[kind];

  if (groups.length === 0) {
    return (
      <div
        className={cn(
          "rounded-md border border-dashed border-border bg-muted/40 px-2.5 py-2 text-xs text-muted-foreground",
          className,
        )}
        data-ocid={`${ocid}.empty_state`}
      >
        <p>尚未添加任何{label}模型。</p>
        <Link
          to="/settings"
          className="mt-1 inline-flex items-center gap-1 font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
          data-ocid={`${ocid}.settings_link`}
        >
          <Settings className="h-3 w-3" aria-hidden />
          前往设置添加中转站与模型
        </Link>
      </div>
    );
  }

  const ownChoice =
    resolved.status === "ok" &&
    (resolved.source === "node" || resolved.source === "legacy");
  const selectValue = ownChoice
    ? encodeOption(resolved.relay.id, resolved.model)
    : DEFAULT_VALUE;
  const legacyOutside =
    resolved.status === "ok" &&
    resolved.source === "legacy" &&
    !groups.some(
      (g) =>
        g.relayId === resolved.relay.id && g.models.includes(resolved.model),
    );
  const d = config.defaults[kind];
  const defaultRelay = config.relays.find((r) => r.id === d?.relayId);
  const defaultText =
    d && defaultRelay ? `${defaultRelay.name} / ${d.model}` : "";

  return (
    <div className={cn("min-w-0 space-y-1", className)}>
      {!hideLabel && (
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Server className="h-3 w-3" aria-hidden />
          中转站 / 模型
        </span>
      )}
      <Select
        value={selectValue}
        disabled={disabled}
        onValueChange={(v) =>
          onChange(v === DEFAULT_VALUE ? {} : decodeOption(v))
        }
      >
        <SelectTrigger
          size="sm"
          className="h-7 w-full min-w-0 px-2 text-xs"
          aria-label={`${label}中转站与模型`}
          data-ocid={`${ocid}.select`}
        >
          <SelectValue placeholder="选择模型" />
        </SelectTrigger>
        <SelectContent data-ocid={`${ocid}.dropdown_menu`}>
          <SelectItem value={DEFAULT_VALUE} className="text-xs">
            默认{defaultText ? `（${defaultText}）` : ""}
          </SelectItem>
          {legacyOutside && resolved.status === "ok" && (
            <SelectItem
              value={encodeOption(resolved.relay.id, resolved.model)}
              className="text-xs"
            >
              {resolved.relay.name} / {resolved.model}（未在设置中）
            </SelectItem>
          )}
          {groups.map((g) => (
            <SelectGroup key={g.relayId}>
              <SelectSeparator />
              <SelectLabel className="text-[11px]">{g.relayName}</SelectLabel>
              {g.models.map((m) => (
                <SelectItem
                  key={m}
                  value={encodeOption(g.relayId, m)}
                  className="text-xs"
                >
                  <span className="truncate">
                    {g.relayName} / {m}
                  </span>
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
      {resolved.status === "ok" && resolved.warning && (
        <p
          className="flex items-start gap-1 text-[11px] text-warning"
          data-ocid={`${ocid}.warning_state`}
        >
          <AlertTriangle className="mt-px h-3 w-3 shrink-0" aria-hidden />
          {resolved.warning}
        </p>
      )}
    </div>
  );
}
