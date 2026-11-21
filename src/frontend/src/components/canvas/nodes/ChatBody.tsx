import { type RelayChatMessage, chatCompletion } from "@/lib/relay";
import { useCanvasStore } from "@/store/canvasStore";
import { type ChatMessage, type ChatNode, createId } from "@/types";
import { Copy, FilePlus2, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ModelPicker } from "../ModelPicker";
import { RunFooter } from "../RunFooter";
import { UpstreamSummary } from "../UpstreamSummary";
import { nodeWidth } from "../geometry";
import { useNodeRun } from "../useNodeRun";
import { readUpstream, toDataUrls, useUpstream } from "../useUpstream";
import { FIELD, ICON_BTN } from "./styles";

function message(role: ChatMessage["role"], content: string): ChatMessage {
  return { id: createId("msg"), role, content, createdAt: Date.now() };
}

export function ChatBody({ node, ocid }: { node: ChatNode; ocid: string }) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const addNode = useCanvasStore((s) => s.addNode);
  const connect = useCanvasStore((s) => s.connect);
  const upstream = useUpstream(node.id);
  const { execute, ready, needsSetup } = useNodeRun(node.id);
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const { messages } = node.data;
  const visible = messages.filter((m) => m.role !== "system");
  const lastIsUser = visible[visible.length - 1]?.role === "user";
  const running = node.run.status === "running";

  const count = visible.length;
  useEffect(() => {
    if (count > 0) listRef.current?.scrollTo({ top: 1e6 });
  }, [count]);

  const reply = () =>
    void execute(async ({ settings, model, progress }) => {
      const current = useCanvasStore.getState().getNode(node.id);
      if (!current || current.type !== "chat") return;
      const up = readUpstream(node.id);
      const system = [
        current.data.systemPrompt?.trim(),
        up.texts.length
          ? `以下是画布上游卡片提供的参考内容：\n${up.texts.map((t, i) => `[${i + 1}] ${t}`).join("\n\n")}`
          : "",
      ]
        .filter(Boolean)
        .join("\n\n");
      const payload: RelayChatMessage[] = [
        ...(system ? [{ role: "system" as const, content: system }] : []),
        ...current.data.messages
          .filter((m) => m.role !== "system")
          .map(({ role, content }) => ({ role, content })),
      ];
      progress(up.imageMediaIds.length ? "读取上游图片…" : "AI 正在回复…");
      const images = await toDataUrls(up.imageMediaIds);
      progress("AI 正在回复…");
      const content = await chatCompletion({
        settings,
        messages: payload,
        model,
        images,
      });
      const latest = useCanvasStore.getState().getNode(node.id);
      if (!latest || latest.type !== "chat") return;
      updateNodeData<"chat">(node.id, {
        messages: [...latest.data.messages, message("assistant", content)],
      });
    });

  const send = () => {
    const text = draft.trim();
    if (!text) {
      if (lastIsUser) reply();
      return;
    }
    if (running || !ready()) return;
    setDraft("");
    updateNodeData<"chat">(node.id, {
      messages: [...messages, message("user", text)],
    });
    reply();
  };

  const copy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success("已复制回复");
    } catch {
      toast.error("复制失败，请手动选择文字复制");
    }
  };

  const toPrompt = (content: string) => {
    const id = addNode(
      "prompt",
      {
        x: node.position.x + nodeWidth(node) + 90,
        y: node.position.y + 40,
      },
      { text: content },
    );
    connect(node.id, id);
    toast.success("已创建并连接提示词卡片");
  };

  return (
    <div className="space-y-2.5">
      <div data-nodrag>
        <ModelPicker
          kind="chat"
          value={{ relayId: node.data.relayId, model: node.data.model }}
          onChange={(next) =>
            updateNodeData<"chat">(node.id, {
              relayId: next.relayId,
              model: next.model,
            })
          }
          ocid={`${ocid}.model`}
          disabled={running}
        />
      </div>
      <UpstreamSummary upstream={upstream} />
      <div
        ref={listRef}
        className="max-h-72 min-h-16 space-y-2 overflow-y-auto pr-0.5"
        data-wheel-scroll
        data-ocid={`${ocid}.list`}
      >
        {visible.length === 0 ? (
          <p
            className="py-4 text-center text-[11px] text-muted-foreground"
            data-ocid={`${ocid}.empty_state`}
          >
            向 AI 描述你的故事，让它帮你拆分镜头
          </p>
        ) : (
          visible.map((m, i) =>
            m.role === "user" ? (
              <div key={m.id} className="flex justify-end">
                <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-lg rounded-br-sm bg-accent px-2.5 py-1.5 text-xs text-accent-foreground">
                  {m.content}
                </p>
              </div>
            ) : (
              <div
                key={m.id}
                className="rounded-lg rounded-bl-sm bg-muted px-2.5 py-2"
                data-ocid={`${ocid}.item.${i + 1}`}
              >
                <p className="select-text whitespace-pre-wrap break-words text-xs leading-relaxed">
                  {m.content}
                </p>
                <div className="mt-1.5 flex justify-end gap-1">
                  <button
                    type="button"
                    className={ICON_BTN}
                    onClick={() => void copy(m.content)}
                    data-ocid={`${ocid}.copy_button.${i + 1}`}
                  >
                    <Copy className="h-3 w-3" aria-hidden />
                    复制
                  </button>
                  <button
                    type="button"
                    className={`${ICON_BTN} hover:text-primary`}
                    onClick={() => toPrompt(m.content)}
                    data-ocid={`${ocid}.to_prompt_button.${i + 1}`}
                  >
                    <FilePlus2 className="h-3 w-3" aria-hidden />
                    转为提示词
                  </button>
                </div>
              </div>
            ),
          )
        )}
      </div>

      <div className="flex items-end gap-1.5">
        <label htmlFor={`${node.id}-draft`} className="sr-only">
          输入消息
        </label>
        <textarea
          id={`${node.id}-draft`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              !e.shiftKey &&
              !e.nativeEvent.isComposing
            ) {
              e.preventDefault();
              send();
            }
          }}
          rows={2}
          placeholder="输入消息，Enter 发送，Shift+Enter 换行"
          className={`${FIELD} resize-none`}
          data-wheel-scroll
          data-ocid={`${ocid}.input`}
        />
        {visible.length > 0 && (
          <button
            type="button"
            className={`${ICON_BTN} h-8 w-8 justify-center px-0 hover:text-destructive`}
            onClick={() => updateNodeData<"chat">(node.id, { messages: [] })}
            disabled={running}
            aria-label="清空对话"
            data-ocid={`${ocid}.clear_button`}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          </button>
        )}
      </div>

      <RunFooter
        node={node}
        ocid={ocid}
        onRun={send}
        needsSetup={needsSetup}
        canRun={draft.trim().length > 0 || lastIsUser}
        hint="输入消息后发送"
        runLabel={draft.trim() || !lastIsUser ? "发送" : "重新回复"}
      />
    </div>
  );
}
