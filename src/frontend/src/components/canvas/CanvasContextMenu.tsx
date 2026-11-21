import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAiAssistantStore } from "@/store/aiAssistantStore";
import { useCanvasStore } from "@/store/canvasStore";
import { NODE_META, NODE_TYPES, type NodeType, type XY } from "@/types";
import {
  BoxSelect,
  ClipboardPaste,
  Copy,
  CopyPlus,
  Maximize,
  Play,
  Sparkles,
  Trash2,
  Unlink,
} from "lucide-react";
import { toast } from "sonner";
import { NODE_ICONS } from "./nodeIcons";

/** Window event a NodeCard listens for to press its own run button */
export const RUN_NODE_EVENT = "canvas:run-node";

export function requestNodeRun(nodeId: string) {
  window.dispatchEvent(
    new CustomEvent<string>(RUN_NODE_EVENT, { detail: nodeId }),
  );
}

/** The run button inside a card body, found under the card's root element */
export function findRunButton(root: ParentNode | null) {
  return (
    root?.querySelector<HTMLButtonElement>('[data-ocid$=".run_button"]') ?? null
  );
}

export function canRunNode(nodeId: string): boolean {
  const card = document.querySelector(`[data-node-id="${CSS.escape(nodeId)}"]`);
  const btn = findRunButton(card);
  return !!btn && !btn.disabled;
}

export const MOD_KEY =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform)
    ? "⌘"
    : "Ctrl+";

export type ContextMenuState =
  | { key: number; kind: "canvas"; client: XY; world: XY }
  | {
      key: number;
      kind: "node";
      client: XY;
      world: XY;
      nodeId: string;
      nodeType: NodeType;
      ids: string[];
      canRun: boolean;
    };

interface CanvasContextMenuProps {
  menu: ContextMenuState;
  onClose: () => void;
  onAddNode: (type: NodeType, world: XY) => void;
  onFitAll: () => void;
}

const ITEM = "gap-2 text-[13px]";

export function CanvasContextMenu({
  menu,
  onClose,
  onAddNode,
  onFitAll,
}: CanvasContextMenuProps) {
  const hasClipboard = useCanvasStore((s) => s.hasClipboard);
  const hasNodes = useCanvasStore((s) => (s.canvas?.nodes.length ?? 0) > 0);
  const ai = useAiAssistantStore.getState;
  const st = useCanvasStore.getState;

  const paste = () => {
    const ids = st().paste(menu.world);
    if (ids.length) toast.success(`已粘贴 ${ids.length} 张卡片`);
  };

  const ocid = `canvas_editor.${menu.kind}_menu`;
  const multi = menu.kind === "node" && menu.ids.length > 1;
  const suffix = multi && menu.kind === "node" ? `（${menu.ids.length}）` : "";

  return (
    <DropdownMenu
      open
      modal={false}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DropdownMenuTrigger asChild>
        <span
          aria-hidden
          className="pointer-events-none fixed h-0 w-0"
          style={{ left: menu.client.x, top: menu.client.y }}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        side="bottom"
        sideOffset={2}
        className="bg-panel w-56 rounded-lg p-1 shadow-float"
        onCloseAutoFocus={(e) => e.preventDefault()}
        onContextMenu={(e) => e.preventDefault()}
        data-ocid={`${ocid}.dropdown_menu`}
      >
        {menu.kind === "canvas" ? (
          <>
            <DropdownMenuLabel className="text-[11px] font-medium text-muted-foreground">
              新增节点
            </DropdownMenuLabel>
            {NODE_TYPES.map((t) => {
              const Icon = NODE_ICONS[t];
              return (
                <DropdownMenuItem
                  key={t}
                  className={`${NODE_META[t].className} ${ITEM}`}
                  onSelect={() => onAddNode(t, menu.world)}
                  data-ocid={`${ocid}.add_${t}.button`}
                >
                  <Icon className="node-text" aria-hidden />
                  新增{NODE_META[t].label}节点
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className={ITEM}
              disabled={!hasClipboard}
              onSelect={paste}
              data-ocid={`${ocid}.paste.button`}
            >
              <ClipboardPaste aria-hidden />
              {hasClipboard ? "粘贴到此处" : "粘贴（剪贴板为空）"}
              <DropdownMenuShortcut>{MOD_KEY}V</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem
              className={ITEM}
              disabled={!hasNodes}
              onSelect={() => st().selectAll()}
              data-ocid={`${ocid}.select_all.button`}
            >
              <BoxSelect aria-hidden />
              全选
            </DropdownMenuItem>
            <DropdownMenuItem
              className={ITEM}
              onSelect={onFitAll}
              data-ocid={`${ocid}.fit.button`}
            >
              <Maximize aria-hidden />
              适配视图
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className={`${ITEM} text-primary`}
              onSelect={() => ai().requestCanvas()}
              data-ocid={`${ocid}.ai_canvas.button`}
            >
              <Sparkles className="text-primary" aria-hidden />
              交给 AI 处理整个画布
            </DropdownMenuItem>
          </>
        ) : (
          <>
            {NODE_META[menu.nodeType].runnable && !multi && (
              <>
                <DropdownMenuItem
                  className={ITEM}
                  disabled={!menu.canRun}
                  onSelect={() => requestNodeRun(menu.nodeId)}
                  data-ocid={`${ocid}.run.button`}
                >
                  <Play aria-hidden />
                  {menu.canRun ? "运行" : "运行（暂不可用）"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem
              className={ITEM}
              onSelect={() => {
                const n = st().copy(menu.ids);
                if (n) toast.success(`已复制 ${n} 张卡片`);
              }}
              data-ocid={`${ocid}.copy.button`}
            >
              <Copy aria-hidden />
              复制{suffix}
              <DropdownMenuShortcut>{MOD_KEY}C</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem
              className={ITEM}
              disabled={!hasClipboard}
              onSelect={paste}
              data-ocid={`${ocid}.paste.button`}
            >
              <ClipboardPaste aria-hidden />
              {hasClipboard ? "粘贴" : "粘贴（剪贴板为空）"}
              <DropdownMenuShortcut>{MOD_KEY}V</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem
              className={ITEM}
              onSelect={() => st().duplicate(menu.ids)}
              data-ocid={`${ocid}.duplicate.button`}
            >
              <CopyPlus aria-hidden />
              复制副本{suffix}
              <DropdownMenuShortcut>{MOD_KEY}D</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem
              className={ITEM}
              onSelect={() => {
                for (const id of menu.ids) st().disconnectAll(id);
              }}
              data-ocid={`${ocid}.disconnect.button`}
            >
              <Unlink aria-hidden />
              {multi ? `断开所选卡片的全部连线${suffix}` : "断开全部连线"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className={`${ITEM} text-primary`}
              onSelect={() => ai().requestNodes(menu.ids)}
              data-ocid={`${ocid}.ai_nodes.button`}
            >
              <Sparkles className="text-primary" aria-hidden />
              发送给 AI 助手{suffix}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              className={ITEM}
              onSelect={() => st().deleteNodes(menu.ids)}
              data-ocid={`${ocid}.delete_button`}
            >
              <Trash2 aria-hidden />
              删除{suffix}
              <DropdownMenuShortcut>Del</DropdownMenuShortcut>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
