import type { SizeTree } from "./size-tree.js";

export type ScrollAlign = "start" | "center" | "end" | "auto";

export interface IndexRange {
  from: number;
  to: number;
}

export const visibleRange = (
  tree: SizeTree,
  scrollOffset: number,
  viewportSize: number,
  overscan: number,
): IndexRange | null => {
  if (tree.length === 0) return null;
  const first = tree.indexAt(scrollOffset);
  const viewEnd = scrollOffset + viewportSize;
  let last = first;
  let edge = tree.startOf(first);
  while (last < tree.length && edge < viewEnd) {
    edge += tree.sizeAt(last);
    last++;
  }
  const extra = Math.max(0, Math.floor(overscan));
  return {
    from: Math.max(0, first - extra),
    to: Math.min(tree.length, Math.max(last, first + 1) + extra),
  };
};

export const alignedOffset = (
  start: number,
  size: number,
  viewportSize: number,
  scrollOffset: number,
  align: ScrollAlign,
): number | null => {
  if (align === "start") return start;
  if (align === "end") return start + size - viewportSize;
  if (align === "center") return start + size / 2 - viewportSize / 2;
  if (start < scrollOffset) return start;
  if (start + size > scrollOffset + viewportSize) return start + size - viewportSize;
  return null;
};

export const clampOffset = (offset: number, totalSize: number, viewportSize: number): number =>
  Math.min(Math.max(0, offset), Math.max(0, totalSize - viewportSize));
