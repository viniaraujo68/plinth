<script lang="ts">
  import ErrorDisplay from "$lib/components/ErrorDisplay.svelte";
  import { reportError, setErrorReporter } from "$lib/error.js";

  let crashed = $state(false);
  let reported = $state<string[]>([]);

  // Standing in for the app's telemetry client, so the page can show that a report happens exactly
  // once per crash rather than once per render of the fallback.
  $effect(() => {
    setErrorReporter((error) => {
      reported = [...reported, error instanceof Error ? error.message : String(error)];
    });
    return () => setErrorReporter(null);
  });

  const explode = (): never => {
    throw new Error("The chart could not be built from this dataset.");
  };
</script>

<main class="mx-auto flex w-full max-w-4xl flex-col gap-12 p-6 sm:p-10">
  <header class="flex flex-col gap-3">
    <h1 class="text-3xl font-semibold tracking-tight">ErrorDisplay</h1>
    <p class="max-w-2xl text-base-content/70">
      The in-place fallback for a subtree that crashed. It says what happened and offers the way
      out, and deliberately shows no stack: it is not source-mapped in production, and the message
      was written for whoever wrote the code rather than for whoever is reading the screen.
    </p>
  </header>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
      Inside a boundary
    </h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      Reporting is not this component's job — it renders again on every retry, so a report from here
      would be counted once per render. The single channel is
      <code class="kbd kbd-sm">reportError</code>, wired to the boundary's
      <code class="kbd kbd-sm">onerror</code>, which fires once per crash.
    </p>
    <div class="card flex flex-col gap-4 rounded-box bg-base-200 p-4">
      <button
        class="btn w-fit btn-error btn-sm"
        onclick={() => (crashed = true)}
        data-testid="crash"
      >
        Break the panel
      </button>

      <div class="min-h-56 rounded-box border border-base-content/10 bg-base-100">
        <svelte:boundary onerror={reportError}>
          {#if crashed}
            {explode()}
          {/if}
          <div class="flex h-56 flex-col items-center justify-center gap-1">
            <p class="text-lg font-medium">Quarterly revenue</p>
            <p class="text-sm text-base-content/60">A panel that renders fine until it does not.</p>
          </div>

          {#snippet failed(_error, reset)}
            <ErrorDisplay
              reset={() => {
                crashed = false;
                reset();
              }}
            />
          {/snippet}
        </svelte:boundary>
      </div>

      <p class="text-sm text-base-content/60">
        Reported <span class="badge badge-soft badge-primary" data-testid="report-count"
          >{reported.length}</span
        > times.
      </p>
    </div>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">Variants</h2>
    <div class="grid gap-4 md:grid-cols-2">
      <div class="rounded-box border border-base-content/10 bg-base-200">
        <ErrorDisplay />
      </div>
      <div class="rounded-box border border-base-content/10 bg-base-200">
        <ErrorDisplay
          title="Report unavailable"
          message="The export service is offline. Nothing was lost — try again in a few minutes."
          reset={() => undefined}
        />
      </div>
    </div>
    <p class="max-w-2xl text-sm text-base-content/70">
      With no <code class="kbd kbd-sm">reset</code> there is no retry button: a fallback that cannot recover
      should not pretend it can.
    </p>
  </section>
</main>
