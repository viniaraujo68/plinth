<script lang="ts">
  import { untrack, type Snippet } from "svelte";
  import type { ClassValue } from "svelte/elements";
  import type { ScrollAlign } from "./range.js";
  import { Virtualizer, type ItemKey, type ScrollAnchor } from "./virtualizer.svelte.js";

  interface SharedProps {
    item: Snippet<[number]>;
    class?: ClassValue;
    crossSize?: number | string;
    label?: string;
  }

  interface OwnedProps {
    count: number;
    itemSize?: number | ((index: number) => number);
    overscan?: number;
    getItemKey?: (index: number) => ItemKey;
    horizontal?: boolean;
    anchorTo?: ScrollAnchor;
    followOnAppend?: boolean;
    initialOffset?: number;
    virtualizer?: never;
  }

  interface ExternalProps {
    virtualizer: Virtualizer;
    count?: never;
    itemSize?: never;
    overscan?: never;
    getItemKey?: never;
    horizontal?: never;
    anchorTo?: never;
    followOnAppend?: never;
    initialOffset?: never;
  }

  type Props = SharedProps & (OwnedProps | ExternalProps);

  let {
    item,
    class: className,
    crossSize,
    label,
    virtualizer: external,
    count,
    itemSize,
    overscan,
    getItemKey,
    horizontal,
    anchorTo,
    followOnAppend,
    initialOffset,
  }: Props = $props();

  const owned = () =>
    new Virtualizer({
      count: () => count ?? 0,
      estimateSize: (index) =>
        typeof itemSize === "function" ? itemSize(index) : (itemSize ?? 48),
      overscan: () => overscan ?? 6,
      getItemKey: (index) => getItemKey?.(index) ?? index,
      horizontal,
      anchorTo,
      followOnAppend,
      initialOffset,
    });

  const virtualizer = untrack(() => external ?? owned());

  const crossLength = $derived(typeof crossSize === "number" ? `${crossSize}px` : crossSize);
  const axis = $derived(virtualizer.horizontal ? "X" : "Y");

  export function scrollToIndex(index: number, align?: ScrollAlign): void {
    virtualizer.scrollToIndex(index, align);
  }

  export function scrollToOffset(offset: number): void {
    virtualizer.scrollToOffset(offset);
  }

  export function scrollToEnd(): void {
    virtualizer.scrollToEnd();
  }

  export function prepend(count: number): void {
    virtualizer.prepend(count);
  }

  export function clearMeasurements(): void {
    virtualizer.clearMeasurements();
  }
</script>

<div
  class={["plinth-virtual", className]}
  class:plinth-virtual-horizontal={virtualizer.horizontal}
  role={label === undefined ? undefined : "region"}
  aria-label={label}
  {@attach virtualizer.viewport}
>
  <div
    class="plinth-virtual-content"
    style:block-size={virtualizer.horizontal ? undefined : `${virtualizer.totalSize}px`}
    style:inline-size={virtualizer.horizontal ? `${virtualizer.totalSize}px` : undefined}
    style:min-inline-size={virtualizer.horizontal ? undefined : crossLength}
    style:min-block-size={virtualizer.horizontal ? crossLength : undefined}
  >
    {#each virtualizer.items as entry (entry.key)}
      <div
        class="plinth-virtual-item"
        data-index={entry.index}
        style:transform="translate{axis}({entry.start}px)"
        {@attach virtualizer.measure(entry.index)}
      >
        {@render item(entry.index)}
      </div>
    {/each}
  </div>
</div>

<style>
  .plinth-virtual {
    display: block;
    position: relative;
    overflow: auto;
    overflow-anchor: none;
  }

  .plinth-virtual-content {
    position: relative;
    inline-size: 100%;
  }

  .plinth-virtual-horizontal > .plinth-virtual-content {
    block-size: 100%;
  }

  .plinth-virtual-item {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
  }

  .plinth-virtual-horizontal .plinth-virtual-item {
    right: auto;
    bottom: 0;
  }
</style>
