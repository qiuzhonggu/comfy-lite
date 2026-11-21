import { NODE_META, NODE_TYPES, type NodeType } from "@/types";
import { NODE_ICONS } from "./nodeIcons";

export function NodeToolbar({ onAdd }: { onAdd: (type: NodeType) => void }) {
  return (
    <nav
      aria-label="添加卡片"
      className="surface-float absolute left-4 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-0.5 rounded-2xl p-1.5 shadow-float"
      data-ocid="canvas_editor.add_toolbar.panel"
    >
      {NODE_TYPES.map((type) => {
        const meta = NODE_META[type];
        const Icon = NODE_ICONS[type];
        return (
          <button
            key={type}
            type="button"
            onClick={() => onAdd(type)}
            title={`${meta.label}：${meta.description}`}
            className={`${meta.className} group relative flex w-16 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[11px] text-muted-foreground transition-smooth hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95`}
            data-ocid={`canvas_editor.add_${type}.button`}
          >
            <span
              className="node-dot absolute right-2 top-2 h-1.5 w-1.5 rounded-full"
              aria-hidden
            />
            <Icon
              className="h-5 w-5 transition-transform duration-150 group-hover:node-text group-hover:scale-110"
              aria-hidden
            />
            {meta.label}
          </button>
        );
      })}
    </nav>
  );
}
