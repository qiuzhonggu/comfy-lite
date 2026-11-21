import { type CanvasNode, NODE_META, type Viewport } from "@/types";
import type { PointerEvent as ReactPointerEvent } from "react";

/** Vertical offset of the in/out handles from the card top (header center) */
export const HANDLE_Y = 22;
export const MIN_ZOOM = 0.2;
export const MAX_ZOOM = 2.5;
export const GRID_SIZE = 22;

export function nodeWidth(node: CanvasNode): number {
  return node.size?.width ?? NODE_META[node.type].width;
}

export function clampZoom(z: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
}

/** Zooms around a screen point (relative to the stage) keeping it fixed */
export function zoomAt(
  v: Viewport,
  px: number,
  py: number,
  nextZoom: number,
): Viewport {
  const zoom = clampZoom(nextZoom);
  const wx = (px - v.x) / v.zoom;
  const wy = (py - v.y) / v.zoom;
  return { x: px - wx * zoom, y: py - wy * zoom, zoom };
}

export function edgePath(sx: number, sy: number, tx: number, ty: number) {
  const dx = Math.max(60, Math.abs(tx - sx) / 2);
  return `M ${sx} ${sy} C ${sx + dx} ${sy}, ${tx - dx} ${ty}, ${tx} ${ty}`;
}

interface DragHandlers {
  move: (ev: PointerEvent, dx: number, dy: number) => void;
  up?: (ev: PointerEvent, moved: boolean) => void;
}

/** Tracks a pointer drag on window until release */
export function startDrag(e: ReactPointerEvent, handlers: DragHandlers) {
  const startX = e.clientX;
  const startY = e.clientY;
  let lastX = startX;
  let lastY = startY;
  let moved = false;

  const onMove = (ev: PointerEvent) => {
    const dx = ev.clientX - lastX;
    const dy = ev.clientY - lastY;
    lastX = ev.clientX;
    lastY = ev.clientY;
    if (Math.abs(ev.clientX - startX) + Math.abs(ev.clientY - startY) > 3) {
      moved = true;
    }
    handlers.move(ev, dx, dy);
  };
  const onUp = (ev: PointerEvent) => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onUp);
    handlers.up?.(ev, moved);
  };
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);
}

const INTERACTIVE =
  "button, input, textarea, select, video, audio, a, label, [data-nodrag]";

export function isInteractiveTarget(target: EventTarget | null): boolean {
  return target instanceof Element && !!target.closest(INTERACTIVE);
}

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
  );
}
