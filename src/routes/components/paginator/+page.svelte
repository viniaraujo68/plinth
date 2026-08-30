<script lang="ts">
  import Paginator from "$lib/components/Paginator.svelte";

  const TOTAL_ITEMS = 113;

  let pageNumber = $state(1);
  let pageSize = $state(20);
  const totalPages = $derived(Math.ceil(TOTAL_ITEMS / pageSize));

  const items = $derived(
    Array.from(
      { length: Math.min(pageSize, TOTAL_ITEMS - (pageNumber - 1) * pageSize) },
      (_, i) => (pageNumber - 1) * pageSize + i + 1,
    ),
  );

  let keysetPage = $state(1);
  const LAST_KNOWN_KEYSET_PAGE = 4;
</script>

<main class="mx-auto flex w-full max-w-4xl flex-col gap-12 p-6 sm:p-10">
  <header class="flex flex-col gap-3">
    <h1 class="text-3xl font-semibold tracking-tight">Paginator</h1>
    <p class="max-w-2xl text-base-content/70">
      A page selector that holds no state of its own: the page number comes in as a prop, the pick
      goes out as an event, and the consumer decides what that means. Two flavours, chosen by which
      props are passed and made mutually exclusive in the type — a counted backend and one that only
      knows whether another page exists.
    </p>
  </header>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
      Counted, with a size picker
    </h2>
    <div class="card flex flex-col gap-4 rounded-box bg-base-200 p-4">
      <div class="flex flex-wrap gap-1.5" data-testid="items">
        {#each items as item (item)}
          <span class="badge w-14 font-mono tabular-nums">{item}</span>
        {/each}
      </div>

      <Paginator
        {pageNumber}
        {pageSize}
        {totalPages}
        totalItems={TOTAL_ITEMS}
        onPageChange={(page) => (pageNumber = page)}
        onPageSizeChange={(size) => {
          // The size and the page are one decision for the consumer: a new size invalidates the
          // arithmetic behind the current page, so it resets here rather than inside the component.
          pageSize = size;
          pageNumber = 1;
        }}
      />
    </div>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">Uncounted</h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      With keyset pagination the backend fetches one row more than it needs and reports only whether
      that row existed. There is no last page to jump to, and no summary to print — so the control
      drops both instead of inventing them.
    </p>
    <div class="card w-fit rounded-box bg-base-200 p-4">
      <Paginator
        pageNumber={keysetPage}
        hasNextPage={keysetPage < LAST_KNOWN_KEYSET_PAGE}
        onPageChange={(page) => (keysetPage = page)}
      />
    </div>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">Scale</h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      Every measurement in the strip is in <code class="kbd kbd-sm">em</code>, so it takes the size
      of whatever it sits in.
    </p>
    <div class="card flex flex-col gap-4 rounded-box bg-base-200 p-4">
      <div class="text-xs">
        <Paginator pageNumber={2} totalPages={5} />
      </div>
      <div class="text-lg">
        <Paginator pageNumber={2} totalPages={5} />
      </div>
    </div>
  </section>
</main>
