import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  isRelayConfigured,
  normalizeBaseUrl,
  relayToSettings,
} from "@/lib/relay";
import { useSettingsStore } from "@/store/settingsStore";
import { MODEL_KINDS, MODEL_LIST_KEY, type Relay } from "@/types";
import { Eye, EyeOff, Server, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConnectionTest } from "./ConnectionTest";
import { ModelListEditor } from "./ModelListEditor";
import { SettingsField } from "./SettingsField";

interface RelayCardProps {
  relay: Relay;
  /** 1-based position */
  index: number;
}

export function RelayCard({ relay, index }: RelayCardProps) {
  const updateRelay = useSettingsStore((s) => s.updateRelay);
  const removeRelay = useSettingsStore((s) => s.removeRelay);
  const [showKey, setShowKey] = useState(false);
  const configured = isRelayConfigured(relay);
  const displayName = relay.name.trim() || `中转站 ${index}`;
  const endpoint = relay.baseUrl.trim()
    ? `${normalizeBaseUrl(relay.baseUrl)}/v1`
    : null;
  const modelCount = MODEL_KINDS.reduce(
    (n, k) => n + relay[MODEL_LIST_KEY[k]].length,
    0,
  );

  return (
    <article
      className="overflow-hidden rounded-lg border border-border bg-panel shadow-panel"
      data-ocid={`settings.relay.card.${index}`}
      aria-label={displayName}
    >
      <header className="flex flex-wrap items-center gap-3 border-b border-border bg-panel-header px-4 py-3 sm:px-5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
          <Server className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-sm font-semibold">
            {displayName}
          </h3>
          <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span
              className={`h-1.5 w-1.5 rounded-full ${configured ? "bg-success" : "bg-warning"}`}
              aria-hidden
            />
            {configured ? "已填写连接信息" : "未填写地址或 Key"} · {modelCount}{" "}
            个模型
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              data-ocid={`settings.relay.delete_button.${index}`}
              className="h-8 gap-1.5 rounded-md text-muted-foreground transition-smooth hover:bg-destructive/15 hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              删除中转站
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent data-ocid="settings.relay.delete.dialog">
            <AlertDialogHeader>
              <AlertDialogTitle>删除「{displayName}」？</AlertDialogTitle>
              <AlertDialogDescription>
                将同时删除它下面的 {modelCount}{" "}
                个模型。使用它的默认模型和节点会改用其他可用模型。此操作无法撤销。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-ocid="settings.relay.delete.cancel_button">
                取消
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  removeRelay(relay.id);
                  toast.success(`已删除「${displayName}」`);
                }}
                data-ocid="settings.relay.delete.confirm_button"
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </header>

      <div className="flex flex-col gap-5 p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <SettingsField
            id={`relay-${relay.id}-name`}
            label="中转站名称"
            value={relay.name}
            onChange={(v) => updateRelay(relay.id, { name: v })}
            placeholder={`中转站 ${index}`}
            ocid={`settings.relay.name.input.${index}`}
          />
          <SettingsField
            id={`relay-${relay.id}-url`}
            label="接口地址"
            type="url"
            value={relay.baseUrl}
            onChange={(v) => updateRelay(relay.id, { baseUrl: v })}
            placeholder="https://api.example-relay.com"
            ocid={`settings.relay.base_url.input.${index}`}
            hint={
              endpoint ? (
                <>
                  实际请求：
                  <span className="break-all font-mono text-foreground/80">
                    {endpoint}
                  </span>
                </>
              ) : (
                "填写根地址即可，末尾 /v1 可写可不写。"
              )
            }
          />
          <div className="sm:col-span-2">
            <SettingsField
              id={`relay-${relay.id}-key`}
              label="API Key"
              type={showKey ? "text" : "password"}
              value={relay.apiKey}
              onChange={(v) => updateRelay(relay.id, { apiKey: v })}
              placeholder="sk-..."
              ocid={`settings.relay.api_key.input.${index}`}
              trailing={
                <button
                  type="button"
                  onClick={() => setShowKey((s) => !s)}
                  aria-label={showKey ? "隐藏 API Key" : "显示 API Key"}
                  aria-pressed={showKey}
                  data-ocid={`settings.relay.api_key.toggle.${index}`}
                  className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-smooth hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {showKey ? (
                    <EyeOff className="h-4 w-4" aria-hidden />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden />
                  )}
                </button>
              }
            />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {MODEL_KINDS.map((kind) => (
            <ModelListEditor
              key={kind}
              relayId={relay.id}
              kind={kind}
              models={relay[MODEL_LIST_KEY[kind]]}
              index={index}
            />
          ))}
        </div>

        <div className="border-t border-border pt-4">
          <ConnectionTest draft={relayToSettings(relay)} index={index} />
        </div>
      </div>
    </article>
  );
}
