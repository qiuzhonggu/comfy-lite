import { useCanvasStore } from "@/store/canvasStore";
import { type CanvasNode, NODE_META, RUN_STATUS_LABELS } from "@/types";
import { type PointerEvent, memo, useEffect, useRef } from "react";
import { RUN_NODE_EVENT, findRunButton } from "./CanvasContextMenu";
import { HANDLE_Y, nodeWidth } from "./geometry";
import { NODE_ICONS } from "./nodeIcons";
import { ChatBody } from "./nodes/ChatBody";
import { ImageGenBody } from "./nodes/ImageGenBody";
import { ImageRefBody } from "./nodes/ImageRefBody";
import { PromptBody } from "./nodes/PromptBody";
import { VideoBody } from "./nodes/VideoBody";
import { VoiceBody } from "./nodes/VoiceBody";

interface NodeCardProps {
  node: CanvasNode;
  index: number;
  title: string;
  selected: boolean;
  linkTarget: boolean;
  onPointerDown: (e: PointerEvent, id: string) => void;
  onStartLink: (e: PointerEvent, id: string) => void;
}

function NodeBody({
  node,
  ocid,
  title,
}: {
  node: CanvasNode;
  ocid: string;
  title: string;
}) {
  switch (node.type) {
    case "prompt":
      return <PromptBody node={node} ocid={ocid} />;
    case "imageRef":
      return <ImageRefBody node={node} ocid={ocid} />;
    case "chat":
      return <ChatBody node={node} ocid={ocid} />;
    case "imageGen":
      return <ImageGenBody node={node} ocid={ocid} title={title} />;
    case "video":
      return <VideoBody node={node} ocid={ocid} title={title} />;
    case "voice":
      return <VoiceBody node={node} ocid={ocid} title={title} />;
  }
}

const STATUS_DOT = {
  running: "bg-warning animate-run-pulse",
  success: "bg-success",
  error: "bg-destructive",
} as const;

export const NodeCard = memo(function NodeCard({
  node,
  index,
  title,
  selected,
  linkTarget,
  onPointerDown,
  onStartLink,
}: NodeCardProps) {
  const meta = NODE_META[node.type];
  const Icon = NODE_ICONS[node.type];
  const ocid = `canvas_editor.node.${index}`;
  const status = node.run.status;
  const aiTouched = useCanvasStore((s) => s.aiTouched.includes(node.id));
  const ref = useRef<HTMLElement>(null);
  const nodeId = node.id;

  // Context-menu 运行: press this card's own run button so it behaves identically
  useEffect(() => {
    const onRun = (e: Event) => {
      if ((e as CustomEvent<string>).detail !== nodeId) return;
      const btn = findRunButton(ref.current);
      if (btn && !btn.disabled) btn.click();
    };
    window.addEventListener(RUN_NODE_EVENT, onRun);
    return () => window.removeEventListener(RUN_NODE_EVENT, onRun);
  }, [nodeId]);

  return (
    <article
      ref={ref}
      data-node-id={node.id}
      aria-label={`${title}（${meta.label}）`}
      onPointerDown={(e) => onPointerDown(e, node.id)}
      className={`${meta.className} absolute animate-node-in rounded-lg bg-card text-card-foreground transition-shadow duration-150 ${
        selected
          ? "z-10 shadow-node-selected"
          : "shadow-node hover:shadow-float"
      } ${status === "error" ? "ring-1 ring-destructive/70" : ""} ${linkTarget ? "node-ring" : ""} ${aiTouched ? "ai-touched" : ""}`}
      style={{
        left: node.position.x,
        top: node.position.y,
        width: nodeWidth(node),
      }}
      data-ocid={`${ocid}.card`}
    >
      <span
        className="node-dot pointer-events-none absolute inset-x-0 top-0 h-[3px] rounded-t-lg"
        aria-hidden
      />
      <header className="flex h-11 cursor-grab items-center gap-2 px-3 active:cursor-grabbing">
        <span className="node-tint flex h-6 w-6 shrink-0 items-center justify-center rounded-md">
          <Icon className="node-text h-3.5 w-3.5" aria-hidden />
        </span>
        <h3 className="min-w-0 flex-1 truncate font-display text-sm font-semibold">
          {title}
        </h3>
        {status !== "idle" && (
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <span
              className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status]}`}
            />
            {RUN_STATUS_LABELS[status]}
          </span>
        )}
      </header>

      <div className="px-3 pb-3">
        <NodeBody node={node} ocid={ocid} title={title} />
      </div>

      <span
        data-port="in"
        className="absolute -left-[7px] flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-muted-foreground/60 bg-card"
        style={{ top: HANDLE_Y - 7 }}
        title="输入"
        aria-hidden
      />
      <button
        type="button"
        data-port="out"
        onPointerDown={(e) => {
          e.stopPropagation();
          if (e.button === 0) onStartLink(e, node.id);
        }}
        className="node-dot absolute -right-[7px] h-3.5 w-3.5 cursor-crosshair rounded-full border-2 border-card transition-transform duration-150 hover:scale-150 focus-visible:scale-150 focus-visible:outline-none"
        style={{ top: HANDLE_Y - 7 }}
        aria-label={`从 ${title} 拖出连线`}
        title="拖到另一张卡片以连接"
        data-ocid={`${ocid}.drag_handle`}
      />
    </article>
  );
});
