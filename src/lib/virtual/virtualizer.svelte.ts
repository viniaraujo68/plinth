import { untrack } from "svelte";
import type { Attachment } from "svelte/attachments";
import { KeyedCache } from "./keyed-cache.js";
import { alignedOffset, clampOffset, visibleRange, type ScrollAlign } from "./range.js";
import { SizeTree } from "./size-tree.js";

export type ItemKey = string | number;

export type ScrollAnchor = "start" | "end";

export interface VirtualItem {
  index: number;
  key: ItemKey;
  start: number;
  size: number;
}

export interface VirtualizerOptions {
  count: () => number;
  estimateSize?: number | ((index: number) => number);
  overscan?: number | (() => number);
  getItemKey?: (index: number) => ItemKey;
  horizontal?: boolean;
  anchorTo?: ScrollAnchor;
  followOnAppend?: boolean;
  initialOffset?: number | (() => number);
}

interface Layout {
  tree: SizeTree;
}

type ScrollTarget = () => number | null;

const DEFAULT_ESTIMATE = 48;
const DEFAULT_OVERSCAN = 6;
const SCROLL_IDLE_MS = 150;
const END_TOLERANCE = 4;
const SUBPIXEL = 0.5;

export class Virtualizer {
  readonly horizontal: boolean;
  readonly anchorTo: ScrollAnchor;

  readonly #count: () => number;
  readonly #estimate: (index: number) => number;
  readonly #overscan: () => number;
  readonly #keyOf: (index: number) => ItemKey;
  readonly #followOnAppend: boolean;
  readonly #initialOffset: number | (() => number) | undefined;

  #scrollOffset = $state(0);
  #viewportSize = $state(0);
  #isScrolling = $state(false);
  #measured = $state.raw(new KeyedCache<ItemKey, number>());

  readonly #measureAttachments = new KeyedCache<number, Attachment<HTMLElement>>();
  #element: HTMLElement | undefined;
  #idleTimer: ReturnType<typeof setTimeout> | undefined;
  #anchorIndex = 0;
  #anchorDelta = 0;
  #atEnd = false;
  #previousCount = 0;
  #skipNextFollow = false;
  #ownScrollOffset: number | null = null;
  #scrollRequest = 0;
  #deferredTarget: ScrollTarget | null = null;
  #initialApplied = false;

  #layout: Layout = $derived.by(() => {
    const count = Math.max(0, Math.floor(this.#count()));
    const measured = this.#measured;
    const sizes = new Float64Array(count);
    for (let index = 0; index < count; index++)
      sizes[index] = measured.get(this.#keyOf(index)) ?? this.#estimate(index);
    return { tree: new SizeTree(sizes) };
  });

  readonly items: VirtualItem[] = $derived.by(() => {
    const { tree } = this.#layout;
    const range = visibleRange(tree, this.#scrollOffset, this.#viewportSize, this.#overscan());
    if (!range) return [];
    const items: VirtualItem[] = [];
    let start = tree.startOf(range.from);
    for (let index = range.from; index < range.to; index++) {
      const size = tree.sizeAt(index);
      items.push({ index, key: this.#keyOf(index), start, size });
      start += size;
    }
    return items;
  });

  constructor(options: VirtualizerOptions) {
    const { estimateSize = DEFAULT_ESTIMATE, overscan = DEFAULT_OVERSCAN } = options;
    this.#count = options.count;
    this.#estimate = typeof estimateSize === "function" ? estimateSize : () => estimateSize;
    this.#overscan = typeof overscan === "function" ? overscan : () => overscan;
    this.#keyOf = options.getItemKey ?? ((index) => index);
    this.horizontal = options.horizontal ?? false;
    this.anchorTo = options.anchorTo ?? "start";
    this.#followOnAppend = options.followOnAppend ?? false;
    this.#initialOffset = options.initialOffset;

    $effect(() => {
      const { tree } = this.#layout;
      const viewportSize = this.#viewportSize;
      untrack(() => this.#holdAnchor(tree, viewportSize));
    });

    $effect(() => {
      const count = this.#count();
      untrack(() => this.#countChanged(count));
    });
  }

  get totalSize(): number {
    return this.#layout.tree.total;
  }

  get scrollOffset(): number {
    return this.#scrollOffset;
  }

  get viewportSize(): number {
    return this.#viewportSize;
  }

  get isScrolling(): boolean {
    return this.#isScrolling;
  }

  viewport: Attachment<HTMLElement> = (element) =>
    untrack(() => {
      this.#element = element;
      this.#viewportSize = this.#clientSize(element);
      this.#scrollOffset = this.#readScroll(element);
      this.#captureAnchor();

      const deferred = this.#deferredTarget;
      this.#deferredTarget = null;
      if (deferred) {
        this.#scrollTo(deferred);
      } else if (!this.#initialApplied && this.#initialOffset !== undefined) {
        const initial = this.#initialOffset;
        this.#scrollTo(typeof initial === "function" ? initial : () => initial);
      }
      this.#initialApplied = true;

      const onScroll = () => this.#userScrolled(element);
      const observer = new ResizeObserver(() => {
        this.#viewportSize = this.#clientSize(element);
      });
      element.addEventListener("scroll", onScroll, { passive: true });
      observer.observe(element);

      return () => {
        element.removeEventListener("scroll", onScroll);
        observer.disconnect();
        clearTimeout(this.#idleTimer);
        this.#isScrolling = false;
        if (this.#element === element) this.#element = undefined;
      };
    });

  measure = (index: number): Attachment<HTMLElement> =>
    this.#measureAttachments.getOrCreate(index, () => (element) => {
      const observer = new ResizeObserver(([entry]) => this.#report(index, element, entry));
      observer.observe(element);
      return () => observer.disconnect();
    });

  scrollToOffset(offset: number): void {
    if (Number.isNaN(offset)) return;
    this.#scrollTo(() => offset);
  }

  scrollToEnd(): void {
    this.#scrollTo(() => Number.POSITIVE_INFINITY);
  }

  scrollToIndex(index: number, align: ScrollAlign = "start"): void {
    if (Number.isNaN(index)) return;
    untrack(() => {
      const { tree } = this.#layout;
      if (tree.length === 0) return;
      const target = Math.min(Math.max(0, Math.trunc(index)), tree.length - 1);
      const resolved = align === "auto" ? this.#autoAlign(tree, target) : align;
      if (!resolved) return;
      this.#scrollTo(() => {
        const current = this.#layout.tree;
        if (target >= current.length) return null;
        return alignedOffset(
          current.startOf(target),
          current.sizeAt(target),
          this.#viewportSize,
          this.#scrollOffset,
          resolved,
        );
      });
    });
  }

  prepend(count: number): void {
    if (!(count > 0)) return;
    this.#anchorIndex += Math.floor(count);
    this.#skipNextFollow = true;
  }

  clearMeasurements(): void {
    untrack(() => {
      this.#measured = new KeyedCache<ItemKey, number>();
      this.#measureAttachments.clear();
      this.#captureAnchor();
    });
  }

  #autoAlign(tree: SizeTree, index: number): "start" | "end" | null {
    const start = tree.startOf(index);
    const end = start + tree.sizeAt(index);
    if (start < this.#scrollOffset) return "start";
    if (end > this.#scrollOffset + this.#viewportSize) return "end";
    return null;
  }

  #report(index: number, element: HTMLElement, entry: ResizeObserverEntry | undefined): void {
    untrack(() => {
      const size = this.#sizeOf(element, entry);
      if (!(size > 0)) return;
      const { tree } = this.#layout;
      if (index >= tree.length) return;
      this.#measured.set(this.#keyOf(index), size);
      if (tree.set(index, size)) this.#layout = { tree };
    });
  }

  #sizeOf(element: HTMLElement, entry: ResizeObserverEntry | undefined): number {
    const box = entry?.borderBoxSize[0];
    if (box) return this.horizontal ? box.inlineSize : box.blockSize;
    const rect = element.getBoundingClientRect();
    return this.horizontal ? rect.width : rect.height;
  }

  #userScrolled(element: HTMLElement): void {
    const offset = this.#readScroll(element);
    this.#scrollOffset = offset;
    const own = this.#ownScrollOffset;
    this.#ownScrollOffset = null;
    if (own !== null && Math.abs(offset - own) < SUBPIXEL) return;

    this.#scrollRequest++;
    this.#atEnd = this.#isAtEnd(offset);
    this.#captureAnchor();
    this.#isScrolling = true;
    clearTimeout(this.#idleTimer);
    this.#idleTimer = setTimeout(() => (this.#isScrolling = false), SCROLL_IDLE_MS);
  }

  #scrollTo(target: ScrollTarget): void {
    untrack(() => {
      const element = this.#element;
      if (!element) {
        this.#deferredTarget = target;
        return;
      }
      const request = ++this.#scrollRequest;
      this.#applyScroll(element, target);
      requestAnimationFrame(() => {
        const current = this.#element;
        if (request === this.#scrollRequest && current) this.#applyScroll(current, target);
      });
    });
  }

  #applyScroll(element: HTMLElement, target: ScrollTarget): void {
    untrack(() => {
      const offset = target();
      if (offset === null) return;
      this.#writeScroll(element, clampOffset(offset, this.totalSize, this.#viewportSize));
      this.#atEnd = this.#isAtEnd(this.#scrollOffset);
      this.#captureAnchor();
    });
  }

  #holdAnchor(tree: SizeTree, viewportSize: number): void {
    const element = this.#element;
    if (!element || tree.length === 0) return;
    if (this.#anchorIndex >= tree.length) {
      this.#anchorIndex = tree.length - 1;
      this.#anchorDelta = 0;
    }
    const desired = Math.max(0, this.#anchoredOffset(tree, viewportSize));
    if (Math.abs(desired - this.#readScroll(element)) > SUBPIXEL)
      this.#writeScroll(element, desired);
  }

  #countChanged(count: number): void {
    const grew = count > this.#previousCount;
    const skip = this.#skipNextFollow;
    this.#previousCount = count;
    this.#skipNextFollow = false;
    if (count === 0) {
      this.#anchorIndex = 0;
      this.#anchorDelta = 0;
    }
    if (grew && !skip && this.#followOnAppend && this.#atEnd) this.scrollToEnd();
  }

  #anchoredOffset(tree: SizeTree, viewportSize: number): number {
    if (this.anchorTo === "end")
      return tree.startOf(this.#anchorIndex + 1) - viewportSize - this.#anchorDelta;
    return tree.startOf(this.#anchorIndex) - this.#anchorDelta;
  }

  #captureAnchor(): void {
    const { tree } = this.#layout;
    if (tree.length === 0) {
      this.#anchorIndex = 0;
      this.#anchorDelta = 0;
      return;
    }
    if (this.anchorTo === "end") {
      const bottom = this.#scrollOffset + this.#viewportSize;
      this.#anchorIndex = tree.indexAt(Math.max(0, bottom - 1));
      this.#anchorDelta = tree.startOf(this.#anchorIndex + 1) - bottom;
      return;
    }
    this.#anchorIndex = tree.indexAt(this.#scrollOffset);
    this.#anchorDelta = tree.startOf(this.#anchorIndex) - this.#scrollOffset;
  }

  #isAtEnd(offset: number): boolean {
    return offset + this.#viewportSize >= this.totalSize - END_TOLERANCE;
  }

  #clientSize(element: HTMLElement): number {
    return this.horizontal ? element.clientWidth : element.clientHeight;
  }

  #readScroll(element: HTMLElement): number {
    return this.horizontal ? element.scrollLeft : element.scrollTop;
  }

  #writeScroll(element: HTMLElement, offset: number): void {
    if (this.horizontal) element.scrollLeft = offset;
    else element.scrollTop = offset;
    this.#ownScrollOffset = this.#readScroll(element);
    this.#scrollOffset = this.#ownScrollOffset;
  }
}
