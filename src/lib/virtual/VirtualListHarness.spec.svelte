<script lang="ts">
  import { untrack } from "svelte";
  import type { ScrollAlign } from "./range.js";
  import type { ScrollAnchor } from "./virtualizer.svelte.js";
  import VirtualList from "./VirtualList.svelte";

  interface Row {
    id: number;
    height: number;
  }

  interface Props {
    count?: number;
    varied?: boolean;
    anchorTo?: ScrollAnchor;
    followOnAppend?: boolean;
  }

  let {
    count = 1000,
    varied = false,
    anchorTo = "start",
    followOnAppend = false,
  }: Props = $props();

  const heightOf = (id: number) => (varied ? 30 + (Math.abs(id) % 5) * 15 : 40);
  const rowsBetween = (from: number, length: number): Row[] =>
    Array.from({ length }, (_, offset) => ({ id: from + offset, height: heightOf(from + offset) }));

  let rows = $state.raw<Row[]>(untrack(() => rowsBetween(0, count)));
  let list: ReturnType<typeof VirtualList> | undefined = $state();

  export function prepend(length: number): void {
    const first = rows[0]?.id ?? 0;
    rows = [...rowsBetween(first - length, length), ...rows];
    list?.prepend(length);
  }

  export function append(): void {
    const last = rows.at(-1)?.id ?? -1;
    rows = [...rows, ...rowsBetween(last + 1, 1)];
  }

  export function scrollToIndex(index: number, align?: ScrollAlign): void {
    list?.scrollToIndex(index, align);
  }

  export function scrollToEnd(): void {
    list?.scrollToEnd();
  }
</script>

<VirtualList
  bind:this={list}
  count={rows.length}
  itemSize={40}
  getItemKey={(index) => rows[index].id}
  {anchorTo}
  {followOnAppend}
  label="Rows"
  class="harness-viewport"
>
  {#snippet item(index)}
    {@const row = rows[index]}
    <div class="harness-row" data-key={row.id} style:height="{row.height}px">Row {row.id}</div>
  {/snippet}
</VirtualList>

<style>
  :global(.harness-viewport) {
    width: 320px;
    height: 400px;
  }
</style>
