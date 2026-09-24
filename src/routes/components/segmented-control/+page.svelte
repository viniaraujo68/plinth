<script lang="ts">
  import SegmentedControl from "$lib/components/SegmentedControl.svelte";

  type Unit = "total" | "match" | "day";

  const UNITS = [
    { id: "total", label: "Total" },
    { id: "match", label: "Per match" },
    { id: "day", label: "Per day" },
  ] as const;

  const GOALS = 42;
  const MATCHES = 120;
  const DAYS = 20;

  let unit = $state<Unit>("match");
  let density = $state<"comfortable" | "compact" | "dense">("comfortable");

  const value = $derived(
    unit === "total" ? String(GOALS) : (GOALS / (unit === "match" ? MATCHES : DAYS)).toFixed(2),
  );
</script>

<main class="mx-auto flex w-full max-w-4xl flex-col gap-12 p-6 sm:p-10">
  <header class="flex flex-col gap-3">
    <h1 class="text-3xl font-semibold tracking-tight">SegmentedControl</h1>
    <p class="max-w-2xl text-base-content/70">
      A row of mutually exclusive buttons for a small, fixed set of views of the same thing. Every
      option is on screen, which is the point: a <code class="kbd kbd-sm">Select</code> would hide choices
      that cost less to see than to open a list for.
    </p>
  </header>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
      With a caption
    </h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      The caption is visible text, not the group's name — <code class="kbd kbd-sm">label</code> is, so
      the caption can stay terse without a screen reader announcing half a sentence. Pressing the current
      option again reports nothing.
    </p>
    <div class="flex flex-col gap-4 rounded-box border border-base-content/10 p-6">
      <SegmentedControl bind:value={unit} options={UNITS} label="Unit" caption="Goals:" />
      <p class="text-sm">
        Goals shown as <code class="kbd kbd-sm" data-testid="unit">{unit}</code>:
        <span class="font-semibold tabular-nums" data-testid="goals">{value}</span>
      </p>
    </div>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
      Small, with a disabled option
    </h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      <code class="kbd kbd-sm">size="sm"</code> is for a control that sits inside a card header, where
      the default height would outweigh the title next to it. A disabled option stays in the row, so the
      set of views does not change shape when one of them has nothing to show.
    </p>
    <div
      class="flex items-center justify-between gap-4 rounded-box border border-base-content/10 p-4"
    >
      <span class="text-xs font-semibold tracking-[0.06em] text-base-content/60 uppercase">
        Matches
      </span>
      <SegmentedControl
        bind:value={density}
        size="sm"
        label="Density"
        options={[
          { id: "comfortable", label: "Comfortable" },
          { id: "compact", label: "Compact" },
          { id: "dense", label: "Dense", disabled: true },
        ]}
      />
    </div>
  </section>
</main>
