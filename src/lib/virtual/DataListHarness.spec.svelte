<script lang="ts">
  import { untrack } from "svelte";
  import DataList from "./DataList.svelte";
  import { WindowedData, type PageRequest, type WindowedPage } from "./windowed-data.svelte.js";

  interface Props {
    total?: number;
    pageSize?: number;
    failingPages?: number[];
    withErrorSnippet?: boolean;
  }

  let { total = 500, pageSize = 20, failingPages = [], withErrorSnippet = false }: Props = $props();

  let broken = $state<number[]>(untrack(() => [...failingPages]));
  const waiting: (() => void)[] = [];

  const fetchPage = (request: PageRequest) =>
    new Promise<WindowedPage<string>>((resolve, reject) => {
      waiting.push(() => {
        if (broken.includes(request.page)) {
          reject(new Error(`Page ${request.page} failed`));
          return;
        }
        const length = Math.max(0, Math.min(request.limit, total - request.offset));
        const items = Array.from({ length }, (_, index) => `Item ${request.offset + index}`);
        resolve({ items, total });
      });
    });

  const data = untrack(() => new WindowedData<string>({ pageSize, fetchPage }));

  export function pending(): number {
    return waiting.length;
  }

  export function answer(): void {
    for (const settle of waiting.splice(0)) settle();
  }

  export function heal(): void {
    broken = [];
  }
</script>

<DataList
  {data}
  itemSize={32}
  label="Items"
  class="harness-list"
  error={withErrorSnippet ? failureSnippet : undefined}
>
  {#snippet row(value, index)}
    <div class="harness-item" data-row={index}>{value}</div>
  {/snippet}
</DataList>

{#snippet failureSnippet(failure: { pages: number[]; retry: () => void })}
  <span data-testid="failed-pages">{failure.pages.join(",")}</span>
  <button type="button" onclick={failure.retry}>Try again</button>
{/snippet}

<style>
  :global(.harness-list) {
    width: 320px;
    height: 320px;
  }

  .harness-item {
    height: 32px;
  }
</style>
