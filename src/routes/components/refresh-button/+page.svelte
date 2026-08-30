<script lang="ts">
  import RefreshButton from "$lib/components/RefreshButton.svelte";

  let loads = $state(0);
  let loadedAt = $state<number | null>(null);
  let rows = $state<number[]>([]);

  const reload = async () => {
    await new Promise((done) => setTimeout(done, 600));
    loads++;
    loadedAt = Date.now();
    rows = Array.from({ length: 4 }, () => Math.round(Math.random() * 1000));
  };
</script>

<main class="mx-auto flex w-full max-w-4xl flex-col gap-12 p-6 sm:p-10">
  <header class="flex flex-col gap-3">
    <h1 class="text-3xl font-semibold tracking-tight">RefreshButton</h1>
    <p class="max-w-2xl text-base-content/70">
      A freshness strip: when the data on screen last landed, a "refresh now" button, and an
      auto-refresh toggle with a period picker. It owns its schedule — this library ships no query
      layer to delegate one to — and suspends it while the tab is hidden, so a background tab never
      queues up a burst of requests to fire on focus.
    </p>
  </header>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">Live</h2>
    <div class="card flex flex-col gap-4 rounded-box bg-base-200 p-4">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <h3 class="font-medium">Latest readings</h3>
        <RefreshButton onRefresh={reload} lastSuccessAt={loadedAt} />
      </div>

      <div class="flex flex-wrap gap-2" data-testid="rows">
        {#each rows as row, slot (slot)}
          <span class="badge font-mono badge-lg tabular-nums">{row}</span>
        {:else}
          <span class="text-sm text-base-content/60">Nothing loaded yet.</span>
        {/each}
      </div>

      <p class="text-sm text-base-content/60">
        Reloaded <span class="badge badge-soft badge-primary" data-testid="load-count">{loads}</span
        > times. Arm the toggle and the timestamp gives way to the countdown, so the strip never shows
        a stale "last updated" beside a live counter.
      </p>
    </div>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
      Own periods
    </h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      The periods on offer are a prop; a screen watching something slow has no business offering ten
      seconds.
    </p>
    <div class="card w-fit rounded-box bg-base-200 p-4">
      <RefreshButton
        onRefresh={reload}
        lastSuccessAt={loadedAt}
        intervals={[
          { value: 60, label: "1m" },
          { value: 900, label: "15m" },
          { value: 3600, label: "1h" },
        ]}
        defaultInterval={900}
      />
    </div>
  </section>
</main>
