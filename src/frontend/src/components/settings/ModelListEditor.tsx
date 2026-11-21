import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSettingsStore } from "@/store/settingsStore";
import { MODEL_KIND_LABELS, type ModelKind } from "@/types";
import { Plus, X } from "lucide-react";
import { type KeyboardEvent, useState } from "react";
import { fieldInputClass } from "./SettingsField";

const KIND_META: Record<ModelKind, { nodeClass: string; placeholder: string }> =
  {
    chat: { nodeClass: "node-chat", placeholder: "如 gpt-4o-mini" },
    image: { nodeClass: "node-image-gen", placeholder: "如 gpt-image-1" },
    video: { nodeClass: "node-video", placeholder: "如 sora-2" },
  };

interface ModelListEditorProps {
  relayId: string;
  kind: ModelKind;
  models: string[];
  /** 1-based relay position used in data-ocid markers */
  index: number;
}

export function ModelListEditor({
  relayId,
  kind,
  models,
  index,
}: ModelListEditorProps) {
  const addModel = useSettingsStore((s) => s.addModel);
  const removeModel = useSettingsStore((s) => s.removeModel);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const label = `${MODEL_KIND_LABELS[kind]}模型`;
  const inputId = `relay-${relayId}-${kind}`;
  const meta = KIND_META[kind];

  function add() {
    const name = draft.trim();
    if (!name) {
      setError("请先填写模型名称");
      return;
    }
    if (models.includes(name)) {
      setError("该模型已在列表中");
      return;
    }
    if (addModel(relayId, kind, name)) {
      setDraft("");
      setError(null);
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      add();
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-md border border-border bg-background/60 p-3">
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor={inputId}
          className="flex items-center gap-2 text-xs font-medium text-foreground"
        >
          <span
            className={`${meta.nodeClass} node-dot h-2 w-2 rounded-full`}
            aria-hidden
          />
          {label}
        </label>
        <span className="font-mono text-[11px] text-muted-foreground">
          {models.length}
        </span>
      </div>

      {models.length > 0 ? (
        <ul
          className="flex flex-wrap gap-1.5"
          data-ocid={`settings.relay.${kind}_models.list.${index}`}
        >
          {models.map((m, i) => (
            <li
              key={m}
              className="group inline-flex max-w-full items-center gap-1 rounded border border-border bg-muted py-0.5 pl-2 pr-0.5 font-mono text-[12px] text-foreground"
              data-ocid={`settings.relay.${kind}_model.item.${i + 1}`}
            >
              <span className="min-w-0 truncate" title={m}>
                {m}
              </span>
              <button
                type="button"
                onClick={() => removeModel(relayId, kind, m)}
                aria-label={`移除${label} ${m}`}
                data-ocid={`settings.relay.${kind}_model.delete_button.${i + 1}`}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground transition-smooth hover:bg-destructive/15 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-3 w-3" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[11px] text-muted-foreground">
          还没有{label}，在下方填写名称后添加。
        </p>
      )}

      <div className="flex gap-2">
        <Input
          id={inputId}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={onKeyDown}
          placeholder={meta.placeholder}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          data-ocid={`settings.relay.${kind}_model.input.${index}`}
          className={`${fieldInputClass} h-8 min-w-0 flex-1`}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={add}
          data-ocid={`settings.relay.${kind}_model.add_button.${index}`}
          className="h-8 shrink-0 gap-1 rounded-md border border-border transition-smooth hover:border-primary/60 hover:text-foreground active:scale-[0.98]"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          添加
        </Button>
      </div>
      {error && (
        <p
          id={`${inputId}-error`}
          className="text-[11px] text-destructive"
          data-ocid={`settings.relay.${kind}_model.field_error.${index}`}
        >
          {error}
        </p>
      )}
    </div>
  );
}
