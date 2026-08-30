<script lang="ts">
  import Skeleton from "$lib/components/Skeleton.svelte";
  import { PICK_CLIP_PATH } from "$lib/components/pick.js";

  let loading = $state(true);

  const RELEASES = [
    { id: "b7f1c0a4", title: "Bridge take 4", status: "published" },
    { id: "0a3d9e51", title: "Chorus stack", status: "mastering" },
    { id: "e2c8b410", title: "Outro solo", status: "published" },
  ];
</script>

<!-- Defined once for the whole page, and referenced by every placeholder below that wants the
     brand silhouette instead of a rectangle. The outline comes from the library rather than from a
     copy of the curve pasted in here. -->
<svg class="absolute size-0" aria-hidden="true" focusable="false">
  <clipPath id="pick-mask" clipPathUnits="objectBoundingBox">
    <path d={PICK_CLIP_PATH} />
  </clipPath>
</svg>

<main class="mx-auto flex w-full max-w-4xl flex-col gap-12 p-6 sm:p-10">
  <header class="flex flex-col gap-3">
    <h1 class="text-3xl font-semibold tracking-tight">Skeleton</h1>
    <p class="max-w-2xl text-base-content/70">
      The block that holds a shape open while its content is on the way. A resting wash with a band
      of <code class="kbd kbd-sm">--color-primary</code> sweeping left to right across it, on the same
      1.7s linear cycle the logo orbits on — one tempo for every loading state on a page.
    </p>
  </header>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">Lines</h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      Size is entirely the caller's: the component sets no width and no height, because a component
      rule would beat a utility class and lock the size in. Ragged widths read as text; three
      identical bars read as a table.
    </p>
    <div class="flex flex-col gap-3 rounded-box border border-base-content/10 p-6">
      <Skeleton class="h-4 w-3/4" data-testid="skeleton-line" />
      <Skeleton class="h-4 w-full" data-testid="skeleton-line" />
      <Skeleton class="h-4 w-5/6" data-testid="skeleton-line" />
      <Skeleton class="h-4 w-2/5" data-testid="skeleton-line" />
    </div>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">Shape</h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      Corners are the one piece of geometry the component owns, as
      <code class="kbd kbd-sm">rounded</code>. Set it to
      <code class="kbd kbd-sm">"none"</code> and hand the block a
      <code class="kbd kbd-sm">clip-path</code> to cut it to a silhouette of your own — the sweep is painted
      on the element itself, so it follows the cut.
    </p>
    <div class="flex flex-wrap items-end gap-8 rounded-box border border-base-content/10 p-6">
      <figure class="flex flex-col items-center gap-2">
        <Skeleton class="h-10 w-24" />
        <figcaption class="font-mono text-xs text-base-content/50">field</figcaption>
      </figure>
      <figure class="flex flex-col items-center gap-2">
        <Skeleton class="size-10" rounded="full" />
        <figcaption class="font-mono text-xs text-base-content/50">full</figcaption>
      </figure>
      <figure class="flex flex-col items-center gap-2">
        <Skeleton class="h-10 w-24" rounded="none" />
        <figcaption class="font-mono text-xs text-base-content/50">none</figcaption>
      </figure>
      <figure class="flex flex-col items-center gap-2">
        <Skeleton
          class="size-10"
          rounded="none"
          style="clip-path: url(#pick-mask)"
          data-testid="skeleton-avatar"
        />
        <figcaption class="font-mono text-xs text-base-content/50">clipped to the pick</figcaption>
      </figure>
    </div>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">In place</h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      A placeholder earns its keep by having the proportions of what replaces it, so the page does
      not jump when the data lands. The skeletons themselves stay silent to assistive technology;
      the region that knows what is loading is the one carrying the label.
    </p>
    <button
      type="button"
      class="btn w-fit btn-sm"
      data-testid="toggle-loading"
      onclick={() => (loading = !loading)}
    >
      {loading ? "Show the loaded state" : "Show the loading state"}
    </button>

    <div
      class="flex flex-col gap-4 rounded-box border border-base-content/10 p-6"
      role="status"
      aria-label="Loading releases"
      aria-busy={loading}
    >
      {#if loading}
        <div class="flex items-center gap-3">
          <Skeleton
            class="size-10"
            rounded="none"
            style="clip-path: url(#pick-mask)"
            data-testid="skeleton-avatar"
          />
          <div class="flex flex-1 flex-col gap-2">
            <Skeleton class="h-4 w-40" data-testid="skeleton-line" />
            <Skeleton class="h-3 w-56" data-testid="skeleton-line" />
          </div>
        </div>
        {#each RELEASES as release (release.id)}
          <!-- The row, not the bar, is what has to match the line box of the text it stands in
               for; a bar as tall as a line of type would read as a block, not as a line. -->
          <div class="flex h-5 items-center justify-between gap-4">
            <Skeleton class="h-3.5 w-48" data-testid="skeleton-line" />
            <Skeleton class="h-3.5 w-20" data-testid="skeleton-line" />
          </div>
        {/each}
      {:else}
        <div class="flex items-center gap-3">
          <span
            class="grid size-10 place-items-center bg-primary text-xs font-medium text-primary-content"
            style="clip-path: url(#pick-mask)"
          >
            AL
          </span>
          <div class="flex flex-1 flex-col">
            <span class="text-sm">Ada Lovelace</span>
            <span class="text-xs text-base-content/60">ada@example.test</span>
          </div>
        </div>
        {#each RELEASES as release (release.id)}
          <div class="flex h-5 items-center justify-between gap-4 text-sm">
            <span>{release.title}</span>
            <span class="text-base-content/60">{release.status}</span>
          </div>
        {/each}
      {/if}
    </div>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
      Reduced motion
    </h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      Under <code class="kbd kbd-sm">prefers-reduced-motion</code> the sweep stops dead and the block
      settles on the tone it averages to. That is the opposite of what the logo does, and on purpose:
      an outline that stops moving has stopped indicating anything, while a skeleton still holds the space
      its content will take.
    </p>
  </section>
</main>
