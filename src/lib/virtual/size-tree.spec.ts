import { describe, expect, it } from "vitest";
import { SizeTree } from "./size-tree.js";

const naiveStart = (sizes: number[], index: number) =>
  sizes.slice(0, index).reduce((sum, size) => sum + size, 0);

describe("SizeTree", () => {
  it("is empty without sizes", () => {
    const tree = new SizeTree([]);

    expect(tree.length).toBe(0);
    expect(tree.total).toBe(0);
    expect(tree.indexAt(100)).toBe(-1);
    expect(tree.set(0, 10)).toBe(false);
  });

  it("matches a naive prefix sum at every index", () => {
    const sizes = Array.from({ length: 37 }, (_, index) => 10 + ((index * 7) % 13));
    const tree = new SizeTree(sizes);

    for (let index = 0; index <= sizes.length; index++)
      expect(tree.startOf(index)).toBe(naiveStart(sizes, index));
    expect(tree.total).toBe(naiveStart(sizes, sizes.length));
  });

  it("finds the item under an offset, boundaries included", () => {
    const tree = new SizeTree([10, 20, 30, 40]);

    expect(tree.indexAt(-5)).toBe(0);
    expect(tree.indexAt(0)).toBe(0);
    expect(tree.indexAt(9.9)).toBe(0);
    expect(tree.indexAt(10)).toBe(1);
    expect(tree.indexAt(29)).toBe(1);
    expect(tree.indexAt(30)).toBe(2);
    expect(tree.indexAt(60)).toBe(3);
    expect(tree.indexAt(10_000)).toBe(3);
  });

  it("patches every later start when one size changes", () => {
    const sizes = Array.from({ length: 100 }, () => 48);
    const tree = new SizeTree(sizes);

    expect(tree.set(40, 120)).toBe(true);
    sizes[40] = 120;

    expect(tree.sizeAt(40)).toBe(120);
    expect(tree.startOf(40)).toBe(40 * 48);
    expect(tree.startOf(41)).toBe(40 * 48 + 120);
    expect(tree.total).toBe(naiveStart(sizes, 100));
    expect(tree.indexAt(40 * 48 + 119)).toBe(40);
    expect(tree.indexAt(40 * 48 + 120)).toBe(41);
  });

  it("reports an unchanged size, or an index out of range, as no change", () => {
    const tree = new SizeTree([48, 48]);

    expect(tree.set(1, 48)).toBe(false);
    expect(tree.set(5, 10)).toBe(false);
    expect(tree.total).toBe(96);
  });

  it("stays consistent with a naive sum across many updates", () => {
    let seed = 7;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const sizes = Array.from({ length: 1000 }, () => 20 + Math.floor(random() * 80));
    const tree = new SizeTree(sizes);

    for (let step = 0; step < 500; step++) {
      const index = Math.floor(random() * sizes.length);
      const size = 10 + Math.floor(random() * 200);
      sizes[index] = size;
      tree.set(index, size);
    }

    for (const index of [0, 1, 99, 500, 999, 1000])
      expect(tree.startOf(index)).toBe(naiveStart(sizes, index));
    expect(tree.indexAt(naiveStart(sizes, 640) + 1)).toBe(640);
  });
});
