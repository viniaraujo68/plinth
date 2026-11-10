<script lang="ts" generics="Row">
  import { untrack, type Snippet } from "svelte";
  import type { ClassValue } from "svelte/elements";
  import Skeleton from "../components/Skeleton.svelte";
  import { DEFAULT_DATA_LIST_LABELS, type DataListFailure, type DataListLabels } from "./labels.js";
  import type { ScrollAlign } from "./range.js";
  import VirtualList from "./VirtualList.svelte";
  import type { WindowedData } from "./windowed-data.svelte.js";
  import { WindowedVirtualizer } from "./windowed-virtualizer.svelte.js";

  type PlaceholderStatus = "loading" | "error";

  interface Props {
    data: WindowedData<Row>;
    row: Snippet<[Row, number]>;
    placeholder?: Snippet<[number, PlaceholderStatus]>;
    empty?: Snippet;
    error?: Snippet<[DataListFailure]>;
    itemSize?: number | ((index: number) => number);
    overscan?: number;
    placeholderCount?: number;
    class?: ClassValue;
    crossSize?: number | string;
    label?: string;
    labels?: Partial<DataListLabels>;
  }

  let {
    data,
    row,
    placeholder,
    empty,
    error,
    itemSize = 48,
    overscan = 6,
    placeholderCount = 8,
    class: className,
    crossSize,
    label,
    labels,
  }: Props = $props();

  const text = $derived({ ...DEFAULT_DATA_LIST_LABELS, ...labels });

  const estimate = (index: number) => (typeof itemSize === "function" ? itemSize(index) : itemSize);

  const virtualizer = untrack(
    () => new WindowedVirtualizer({ data, estimateSize: estimate, overscan: () => overscan }),
  );

  const retryPages = () => data.retry();

  const failure: DataListFailure | null = $derived(
    data.failures.length === 0
      ? null
      : { error: data.error, pages: data.failedPages, retry: retryPages },
  );

  const phase = $derived.by(() => {
    if (data.resolved) return data.count === 0 ? "empty" : "ready";
    return failure ? "failed" : "pending";
  });

  const placeholderIndices = $derived(
    Array.from({ length: Math.max(0, placeholderCount) }, (_, index) => index),
  );

  export function scrollToIndex(index: number, align?: ScrollAlign): void {
    virtualizer.scrollToIndex(index, align);
  }

  export function scrollToOffset(offset: number): void {
    virtualizer.scrollToOffset(offset);
  }

  export function scrollToEnd(): void {
    virtualizer.scrollToEnd();
  }

  export function retry(): void {
    retryPages();
  }
</script>

{#snippet placeholderView(index: number, status: PlaceholderStatus)}
  {#if placeholder}
    {@render placeholder(index, status)}
  {:else}
    <div
      class="plinth-data-placeholder"
      data-status={status}
      style:block-size="{estimate(index)}px"
    >
      {#if status === "error"}
        <span class="plinth-data-failed"></span>
      {:else}
        <Skeleton class="plinth-data-skeleton" />
      {/if}
    </div>
  {/if}
{/snippet}

{#snippet failureView(current: DataListFailure)}
  {#if error}
    {@render error(current)}
  {:else}
    <span>{text.error}</span>
    <button type="button" class="btn btn-ghost btn-xs" onclick={current.retry}>{text.retry}</button>
  {/if}
{/snippet}

<div
  class={["plinth-data-list", className]}
  aria-busy={phase === "pending" || data.loading}
  data-phase={phase}
>
  {#if phase === "failed" && failure}
    <div class="plinth-data-state plinth-data-error" role="alert">
      {@render failureView(failure)}
    </div>
  {:else if phase === "pending"}
    <div class="plinth-data-placeholders" role="status" aria-label={text.loading}>
      {#each placeholderIndices as index (index)}
        {@render placeholderView(index, "loading")}
      {/each}
    </div>
  {:else if phase === "empty"}
    <div class="plinth-data-state">
      {#if empty}{@render empty()}{:else}{text.empty}{/if}
    </div>
  {:else}
    {#if failure}
      <div class="plinth-data-banner plinth-data-error" role="alert">
        {@render failureView(failure)}
      </div>
    {/if}
    <VirtualList {virtualizer} class="plinth-data-viewport" {crossSize} {label}>
      {#snippet item(index)}
        {@const value = data.get(index)}
        {#if value !== undefined}
          {@render row(value, index)}
        {:else}
          {@render placeholderView(index, data.statusOf(index) === "error" ? "error" : "loading")}
        {/if}
      {/snippet}
    </VirtualList>
  {/if}
</div>

<style>
  .plinth-data-list {
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
  }

  .plinth-data-list > :global(.plinth-data-viewport) {
    flex: 1 1 auto;
    min-height: 0;
  }

  .plinth-data-placeholders {
    flex: 1 1 auto;
    min-height: 0;
    overflow: hidden;
  }

  .plinth-data-placeholder {
    display: flex;
    align-items: center;
    padding-inline: 1rem;
  }

  .plinth-data-placeholder :global(.plinth-data-skeleton) {
    inline-size: 60%;
    block-size: 0.75rem;
  }

  .plinth-data-failed {
    display: block;
    inline-size: 60%;
    block-size: 0.75rem;
    border: 1px dashed color-mix(in oklch, var(--color-error) 45%, transparent);
    border-radius: var(--radius-field, 0.5rem);
  }

  .plinth-data-state {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    padding: 2rem 1rem;
    color: color-mix(in oklch, var(--color-base-content) 60%, transparent);
    text-align: center;
  }

  .plinth-data-banner {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.375rem 0.75rem;
    border-bottom: 1px solid color-mix(in oklch, var(--color-error) 30%, transparent);
    background: color-mix(in oklch, var(--color-error) 10%, transparent);
    font-size: 0.875rem;
  }

  .plinth-data-state.plinth-data-error {
    color: var(--color-base-content);
  }
</style>
