import { describe, expect, it } from "vitest";
import { alignedOffset, clampOffset, visibleRange } from "./range.js";
import { SizeTree } from "./size-tree.js";

const uniform = (count: number, size: number) =>
  new SizeTree(Array.from({ length: count }, () => size));

describe("visibleRange", () => {
  it("is null for an empty list", () => {
    expect(visibleRange(new SizeTree([]), 0, 400, 6)).toBeNull();
  });

  it("covers the viewport plus the overscan on each side", () => {
    expect(visibleRange(uniform(1000, 50), 5000, 400, 3)).toEqual({ from: 97, to: 111 });
  });

  it("clamps the overscan at both ends of the list", () => {
    expect(visibleRange(uniform(10, 50), 0, 120, 6)).toEqual({ from: 0, to: 9 });
    expect(visibleRange(uniform(10, 50), 400, 100, 6)).toEqual({ from: 2, to: 10 });
  });

  it("renders the first item even before the viewport has a size", () => {
    expect(visibleRange(uniform(100, 50), 0, 0, 0)).toEqual({ from: 0, to: 1 });
  });

  it("follows measured sizes rather than the estimate", () => {
    const tree = uniform(100, 50);
    tree.set(0, 500);

    expect(visibleRange(tree, 0, 400, 0)).toEqual({ from: 0, to: 1 });
    expect(visibleRange(tree, 500, 100, 0)).toEqual({ from: 1, to: 3 });
  });
});

describe("alignedOffset", () => {
  it("aligns the item to the start, centre or end of the viewport", () => {
    expect(alignedOffset(1000, 50, 400, 0, "start")).toBe(1000);
    expect(alignedOffset(1000, 50, 400, 0, "end")).toBe(650);
    expect(alignedOffset(1000, 50, 400, 0, "center")).toBe(825);
  });

  it("scrolls the least amount on auto, and not at all when already visible", () => {
    expect(alignedOffset(100, 50, 400, 500, "auto")).toBe(100);
    expect(alignedOffset(1000, 50, 400, 0, "auto")).toBe(650);
    expect(alignedOffset(200, 50, 400, 100, "auto")).toBeNull();
  });
});

describe("clampOffset", () => {
  it("keeps an offset inside the scrollable range", () => {
    expect(clampOffset(-10, 1000, 400)).toBe(0);
    expect(clampOffset(300, 1000, 400)).toBe(300);
    expect(clampOffset(Number.POSITIVE_INFINITY, 1000, 400)).toBe(600);
    expect(clampOffset(50, 100, 400)).toBe(0);
  });
});
