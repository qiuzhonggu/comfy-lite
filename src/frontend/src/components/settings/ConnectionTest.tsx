import { Button } from "@/components/ui/button";
import { RelayError, isRelayConfigured, testConnection } from "@/lib/relay";
import type { RelaySettings } from "@/types";
import { CheckCircle2, Loader2, PlugZap, XCircle } from "lucide-react";
import { useState } from "react";

type TestState =
  | { kind: "idle" }
  | { kind: "pending" }
  | { kind: "success"; models: string[] }
  | { kind: "error"; message: string };

interface ConnectionTestProps {
  draft: RelaySettings;
  /** 1-based position used in data-ocid markers */
  index: number;
}

export function ConnectionTest({ draft, index }: ConnectionTestProps) {
  const [state, setState] = useState<TestState>({ kind: "idle" });
  const configured = isRelayConfigured(draft);

  async function run() {
    setState({ kind: "pending" });
    try {
      const { models } = await testConnection(draft);
      setState({ kind: "success", models });
    } catch (err) {
      const message =
        err instanceof RelayError || err instanceof Error
          ? err.message
          : "测试连接失败：未知错误";
      setState({ kind: "error", message });
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="min-w-0 text-[11px] text-muted-foreground">
          {configured ? (
            <>
              使用当前地址与 Key 请求{" "}
              <code className="font-mono text-foreground/80">/v1/models</code>
            </>
          ) : (
            "填写接口地址和 API Key 后即可测试连接。"
          )}
        </p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={run}
          disabled={!configured || state.kind === "pending"}
          data-ocid={`settings.relay.test_button.${index}`}
          className="h-8 gap-2 rounded-md border border-border transition-smooth hover:border-primary/60 hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]"
        >
          {state.kind === "pending" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <PlugZap className="h-3.5 w-3.5" aria-hidden />
          )}
          {state.kind === "pending" ? "连接中…" : "测试连接"}
        </Button>
      </div>

      <div aria-live="polite" className="empty:hidden">
        {state.kind === "success" && (
          <div
            className="rounded-md border border-border bg-background p-3"
            data-ocid={`settings.relay.test.success_state.${index}`}
          >
            <p className="flex items-center gap-2 text-sm font-medium text-success">
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
              连接成功，中转站返回 {state.models.length} 个模型
            </p>
            {state.models.length > 0 && (
              <ul className="mt-3 flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
                {state.models.slice(0, 60).map((m) => (
                  <li
                    key={m}
                    className="max-w-full truncate rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground"
                  >
                    {m}
                  </li>
                ))}
                {state.models.length > 60 && (
                  <li className="px-1.5 py-0.5 text-[11px] text-muted-foreground">
                    等 {state.models.length - 60} 个…
                  </li>
                )}
              </ul>
            )}
          </div>
        )}
        {state.kind === "error" && (
          <div
            className="flex gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
            data-ocid={`settings.relay.test.error_state.${index}`}
            role="alert"
          >
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <p className="min-w-0 break-words">{state.message}</p>
          </div>
        )}
      </div>
    </div>
  );
}
