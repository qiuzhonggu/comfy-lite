import { Button } from "@/components/ui/button";
import { type CanvasNode, RUN_STATUS_LABELS } from "@/types";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Loader2,
  Play,
  RotateCcw,
  Settings,
} from "lucide-react";
import type { ReactNode } from "react";

interface RunFooterProps {
  node: CanvasNode;
  ocid: string;
  onRun: () => void;
  needsSetup: boolean;
  canRun: boolean;
  /** Explains what is missing when the run button is disabled */
  hint?: string;
  runLabel?: string;
  extra?: ReactNode;
}

const STATUS_TONE = {
  idle: "text-muted-foreground",
  running: "text-warning",
  success: "text-success",
  error: "text-destructive",
} as const;

export function RunFooter({
  node,
  ocid,
  onRun,
  needsSetup,
  canRun,
  hint,
  runLabel = "运行",
  extra,
}: RunFooterProps) {
  const { run } = node;
  const running = run.status === "running";
  const percent = run.progress?.match(/(\d+)%/)?.[1];

  return (
    <div className="space-y-2">
      {needsSetup && (
        <div
          className="rounded-md border border-primary/40 bg-primary/10 p-2.5 text-xs"
          data-ocid={`${ocid}.setup_prompt`}
        >
          <p className="flex items-start gap-1.5 text-foreground">
            <AlertTriangle
              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning"
              aria-hidden
            />
            尚未配置中转站，填写地址和 API Key 后才能运行。
          </p>
          <Link
            to="/settings"
            className="mt-2 inline-flex h-7 items-center gap-1 rounded-md bg-primary px-2.5 font-medium text-primary-foreground transition-smooth hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            data-ocid={`${ocid}.settings_link`}
          >
            <Settings className="h-3 w-3" aria-hidden />
            前往设置
          </Link>
        </div>
      )}

      {running && (
        <div className="space-y-1.5" data-ocid={`${ocid}.loading_state`}>
          <p className="flex items-center gap-1.5 text-xs text-warning">
            <span className="h-1.5 w-1.5 animate-run-pulse rounded-full bg-warning" />
            {run.progress ?? "运行中…"}
          </p>
          <div className="h-1 overflow-hidden rounded-full bg-muted">
            {percent ? (
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${Math.min(100, Number(percent))}%` }}
              />
            ) : (
              <div className="h-full w-full animate-shimmer bg-gradient-to-r from-transparent via-primary/70 to-transparent bg-[length:200%_100%]" />
            )}
          </div>
        </div>
      )}

      {run.status === "error" && run.error && (
        <div
          className="rounded-md border border-destructive/40 bg-destructive/10 p-2.5"
          data-ocid={`${ocid}.error_state`}
        >
          <p className="max-h-24 overflow-y-auto break-words text-xs leading-relaxed text-foreground">
            {run.error}
          </p>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="mt-2 h-7 gap-1 px-2.5 text-xs"
            onClick={onRun}
            data-ocid={`${ocid}.retry_button`}
          >
            <RotateCcw className="h-3 w-3" aria-hidden />
            重试
          </Button>
        </div>
      )}

      <div className="flex items-center gap-2">
        <span
          className={`min-w-0 flex-1 truncate text-[11px] ${canRun || running ? STATUS_TONE[run.status] : "text-muted-foreground"}`}
        >
          {!canRun && !running && hint ? hint : RUN_STATUS_LABELS[run.status]}
        </span>
        {extra}
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="h-7 gap-1 px-2.5 text-xs hover:bg-primary hover:text-primary-foreground"
          disabled={running || !canRun}
          onClick={onRun}
          data-ocid={`${ocid}.run_button`}
        >
          {running ? (
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
          ) : (
            <Play className="h-3 w-3" aria-hidden />
          )}
          {running ? "运行中" : runLabel}
        </Button>
      </div>
    </div>
  );
}
