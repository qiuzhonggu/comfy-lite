import { useCanvasStore } from "@/store/canvasStore";
import type { PromptNode } from "@/types";
import { FIELD } from "./styles";

export function PromptBody({ node, ocid }: { node: PromptNode; ocid: string }) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const count = node.data.text.length;

  return (
    <div className="space-y-1.5">
      <label htmlFor={`${node.id}-text`} className="sr-only">
        提示词内容
      </label>
      <textarea
        id={`${node.id}-text`}
        value={node.data.text}
        onChange={(e) =>
          updateNodeData<"prompt">(node.id, { text: e.target.value })
        }
        rows={5}
        placeholder="描述镜头：场景、人物、光线、机位…"
        className={`${FIELD} resize-none text-[13px]`}
        data-wheel-scroll
        data-ocid={`${ocid}.textarea`}
      />
      <p className="text-right font-mono text-[10px] text-muted-foreground">
        {count} 字
      </p>
    </div>
  );
}
