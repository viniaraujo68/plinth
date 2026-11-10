<script lang="ts">
  import Tabs from "$lib/components/Tabs.svelte";

  type Section = "matchdays" | "ranking" | "players" | "combinations" | "stats" | "settings";

  const SECTIONS: { id: Section; label: string }[] = [
    { id: "matchdays", label: "Matchdays" },
    { id: "ranking", label: "Ranking" },
    { id: "players", label: "Players" },
    { id: "combinations", label: "Combinations" },
    { id: "stats", label: "Group stats" },
    { id: "settings", label: "Settings" },
  ];

  let section = $state<Section>("ranking");
  let narrowSection = $state<Section>("matchdays");
</script>

<main class="mx-auto flex w-full max-w-4xl flex-col gap-12 p-6 sm:p-10">
  <header class="flex flex-col gap-3">
    <h1 class="text-3xl font-semibold tracking-tight">Tabs</h1>
    <p class="max-w-2xl text-base-content/70">
      A row of tabs that switches what one panel shows. A real <code class="kbd kbd-sm"
        >tablist</code
      >: Tab lands on the selected tab, and the arrow keys, Home and End move the selection along
      the row — the selection follows the focus, the pattern for panels that are cheap to show.
    </p>
  </header>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">One panel</h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      Every tab controls the same panel, and the panel names the selected tab back through
      <code class="kbd kbd-sm">aria-labelledby</code> — <code class="kbd kbd-sm">idPrefix</code> is
      what makes those ids predictable. A page that keeps its section in the URL passes
      <code class="kbd kbd-sm">value</code> in and navigates on
      <code class="kbd kbd-sm">onchange</code>.
    </p>
    <div class="flex flex-col gap-4 rounded-box border border-base-content/10 p-6">
      <Tabs
        tabs={SECTIONS}
        bind:value={section}
        label="Sections"
        controls="tabs-demo-panel"
        idPrefix="tabs-demo"
      />
      <div
        id="tabs-demo-panel"
        role="tabpanel"
        aria-labelledby="tabs-demo-{section}"
        class="text-sm"
        data-testid="panel"
      >
        Showing <code class="kbd kbd-sm">{section}</code>.
      </div>
    </div>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
      Phone width
    </h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      The row scrolls sideways rather than wrapping, and fades at the right edge while tabs are
      hidden past it — at this width, the fade is the only sign that more tabs exist. Scroll to the
      end and it goes away.
    </p>
    <div class="w-[375px] max-w-full rounded-box border border-base-content/10 p-4">
      <Tabs tabs={SECTIONS} bind:value={narrowSection} label="Sections, narrow" center />
    </div>
  </section>
</main>
