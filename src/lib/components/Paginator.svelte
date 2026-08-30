<script lang="ts">
  import type { ClassValue } from "svelte/elements";

  /** The server answered with a count: the last page is reachable and the summary is exact. */
  interface CountedPages {
    totalPages: number;
    totalItems?: number;
    hasNextPage?: never;
  }

  /** Keyset or "one row too many" pagination: only the existence of a next page is known. */
  interface UncountedPages {
    hasNextPage: boolean;
    totalPages?: never;
    totalItems?: never;
  }

  type Props = {
    class?: ClassValue;
    /** One-based. */
    pageNumber: number;
    pageSize?: number;
    /** Sizes offered by the picker. */
    pageSizes?: number[];
    /**
     * Fires when the user picks a different page. Never fires for a size change — that is a
     * separate event with a separate payload ({@link Props.onPageSizeChange}).
     */
    onPageChange?: (page: number) => void;
    /**
     * Fires when the user picks a new page size. The consumer owns the state: both the refetch
     * and the reset back to page 1, since a new size invalidates the old page arithmetic.
     */
    onPageSizeChange?: (size: number) => void;
  } & (CountedPages | UncountedPages);

  let {
    class: cls,
    pageNumber,
    pageSize,
    pageSizes = [10, 20, 50, 100],
    onPageChange,
    onPageSizeChange,
    totalPages,
    totalItems,
    hasNextPage,
  }: Props = $props();

  const range = (start: number, end: number): number[] =>
    Array.from({ length: Math.max(0, end - start + 1) }, (_, i) => start + i);

  const canGoNext = $derived(
    hasNextPage ?? (totalPages !== undefined && totalPages > 0 && pageNumber < totalPages),
  );

  const [firstShown, lastShown] = $derived(
    pageSize === undefined || totalItems === undefined
      ? [undefined, undefined]
      : [(pageNumber - 1) * pageSize + 1, Math.min(pageNumber * pageSize, totalItems)],
  );

  const setPage = (page: number) => {
    const clamped = Math.max(1, totalPages === undefined ? page : Math.min(page, totalPages));

    // Clicking the current page, or an arrow at a bound, is not a change — staying silent here is
    // what keeps a consumer from refetching the page it is already showing.
    if (clamped === pageNumber) return;

    onPageChange?.(clamped);
  };

  // `null` is the ellipsis. Around the current page the window is always the same width, so the
  // buttons under the cursor do not shift as the user walks through the pages.
  const pages = $derived.by((): (number | null)[] => {
    if (totalPages === undefined) {
      const leading =
        pageNumber <= 3 ? range(1, pageNumber) : [1, null, pageNumber - 1, pageNumber];
      return hasNextPage ? [...leading, pageNumber + 1, null] : leading;
    }

    if (totalPages <= 5) return range(1, totalPages);
    if (pageNumber < 4) return [...range(1, 5), null, totalPages];
    if (pageNumber > totalPages - 4) return [1, null, ...range(totalPages - 4, totalPages)];

    return [1, null, pageNumber - 1, pageNumber, pageNumber + 1, null, totalPages];
  });
</script>

<!--
@component
Page selector for a list, in two flavours picked by which props are passed: `totalPages`
(optionally with `totalItems`, which turns on the size picker and the "showing x to y" summary),
or `hasNextPage` alone when the backend only knows whether one more page exists. The two are
mutually exclusive in the type, so a partially-wired paginator is a compile error.

It holds no state: `pageNumber` comes in, `onPageChange` goes out, and the consumer decides what
that means. Sizing is in `em`, so the whole strip scales with the font size around it.

```svelte
<Paginator pageNumber={page} totalPages={data.pages} totalItems={data.count}
  pageSize={size} onPageChange={(p) => (page = p)} onPageSizeChange={(s) => { size = s; page = 1; }} />
```
-->

{#snippet chevron(direction: "left" | "right")}
  <svg
    class="size-[1em]"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d={direction === "left" ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"} />
  </svg>
{/snippet}

{#snippet pageButton(page: number)}
  <button
    type="button"
    class="btn h-[1.75em] min-w-[1.75em] px-2 tabular-nums btn-primary aria-[current=false]:btn-ghost"
    onclick={() => setPage(page)}
    aria-current={page === pageNumber}
    aria-label={`Page ${page}`}
  >
    {page}
  </button>
{/snippet}

{#snippet pageSelector()}
  <button
    type="button"
    class="btn size-[1.75em] btn-ghost px-1"
    aria-label="Previous page"
    disabled={pageNumber <= 1}
    onclick={() => setPage(pageNumber - 1)}
  >
    {@render chevron("left")}
  </button>

  <!-- Keyed by position: the list is a pure projection of `pageNumber`, and the ellipsis entries
       are indistinguishable from one another by value. -->
  {#each pages as page, slot (slot)}
    {#if page === null}
      <span class="mx-2 inline-block text-center" aria-hidden="true">...</span>
    {:else}
      {@render pageButton(page)}
    {/if}
  {/each}

  <button
    type="button"
    class="btn size-[1.75em] btn-ghost px-1"
    aria-label="Next page"
    disabled={!canGoNext}
    onclick={() => setPage(pageNumber + 1)}
  >
    {@render chevron("right")}
  </button>
{/snippet}

{#if totalItems === undefined || pageSize === undefined}
  <nav class={["flex place-content-center gap-px", cls]} aria-label="Pagination">
    {@render pageSelector()}
  </nav>
{:else}
  <nav class={["@container", cls]} aria-label="Pagination">
    <div class="grid items-center justify-items-center gap-1 @min-[45rem]:grid-cols-3">
      <!-- Narrow, the summary and the size picker fall below the buttons: the control the user
           came for stays at the top of the block rather than being pushed off by chrome. -->
      <div class="flex items-center gap-1 @max-[45rem]:order-last @min-[45rem]:mr-auto">
        <span class="text-nowrap">Items per page:</span>
        <select
          class="select box-content w-[3ch] select-xs"
          aria-label="Items per page"
          value={pageSize}
          onchange={({ currentTarget }) => onPageSizeChange?.(Number(currentTarget.value))}
        >
          {#each pageSizes as size (size)}
            <option value={size}>{size}</option>
          {/each}
        </select>
      </div>

      <div class="text-center tabular-nums" data-testid="paginator-summary">
        Showing {firstShown} to {lastShown} of {totalItems} items
      </div>

      <div class="flex items-center gap-px @max-[45rem]:order-first @min-[45rem]:ml-auto">
        {@render pageSelector()}
      </div>
    </div>
  </nav>
{/if}

<style>
  /* The strip sizes itself in `em`, so every control has to inherit the surrounding font size
     rather than fall back to the browser default for form elements. */
  button,
  span {
    font-size: inherit;
  }
</style>
