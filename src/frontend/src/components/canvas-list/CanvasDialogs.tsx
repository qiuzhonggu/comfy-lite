import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CanvasSummary } from "@/types/canvas";
import { useState } from "react";

interface RenameDialogProps {
  canvas: CanvasSummary | null;
  pending: boolean;
  onClose: () => void;
  onSubmit: (id: string, name: string) => void;
}

export function RenameDialog({
  canvas,
  pending,
  onClose,
  onSubmit,
}: RenameDialogProps) {
  return (
    <Dialog open={!!canvas} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="sm:max-w-md"
        data-ocid="canvas_list.rename.dialog"
      >
        {canvas && (
          <RenameForm
            key={canvas.id}
            canvas={canvas}
            pending={pending}
            onClose={onClose}
            onSubmit={onSubmit}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function RenameForm({
  canvas,
  pending,
  onClose,
  onSubmit,
}: RenameDialogProps & { canvas: CanvasSummary }) {
  const [name, setName] = useState(canvas.name);
  const trimmed = name.trim();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (trimmed) onSubmit(canvas.id, trimmed);
      }}
    >
      <DialogHeader>
        <DialogTitle className="font-display">重命名画布</DialogTitle>
        <DialogDescription>新名称会立即保存到本地。</DialogDescription>
      </DialogHeader>
      <div className="my-4 space-y-2">
        <Label htmlFor="canvas-name">画布名称</Label>
        <Input
          id="canvas-name"
          value={name}
          maxLength={60}
          autoFocus
          onChange={(e) => setName(e.target.value)}
          data-ocid="canvas_list.rename.input"
        />
        {!trimmed && (
          <p
            className="text-xs text-destructive"
            data-ocid="canvas_list.rename.field_error"
          >
            名称不能为空
          </p>
        )}
      </div>
      <DialogFooter>
        <Button
          type="button"
          variant="ghost"
          onClick={onClose}
          data-ocid="canvas_list.rename.cancel_button"
        >
          取消
        </Button>
        <Button
          type="submit"
          disabled={!trimmed || pending}
          data-ocid="canvas_list.rename.save_button"
        >
          {pending ? "保存中…" : "保存"}
        </Button>
      </DialogFooter>
    </form>
  );
}

interface DeleteDialogProps {
  canvas: CanvasSummary | null;
  pending: boolean;
  onClose: () => void;
  onConfirm: (id: string) => void;
}

export function DeleteDialog({
  canvas,
  pending,
  onClose,
  onConfirm,
}: DeleteDialogProps) {
  return (
    <AlertDialog open={!!canvas} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent data-ocid="canvas_list.delete.dialog">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display">
            删除画布「{canvas?.name}」？
          </AlertDialogTitle>
          <AlertDialogDescription>
            画布中的 {canvas?.nodeCount ?? 0}{" "}
            张卡片及其生成的图片、视频、音频将从本浏览器永久删除，无法恢复。建议先导出备份。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel data-ocid="canvas_list.delete.cancel_button">
            取消
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={(e) => {
              e.preventDefault();
              if (canvas) onConfirm(canvas.id);
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            data-ocid="canvas_list.delete.confirm_button"
          >
            {pending ? "删除中…" : "永久删除"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
