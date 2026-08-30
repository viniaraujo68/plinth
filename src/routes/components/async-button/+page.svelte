<script lang="ts">
  import { resolve } from "$app/paths";
  import AsyncButton from "$lib/components/AsyncButton.svelte";
  import ErrorDisplay from "$lib/components/ErrorDisplay.svelte";

  let published = $state(0);
  let failure = $state<unknown>(null);

  const wait = (ms: number) =>
    new Promise((done) => {
      setTimeout(done, ms);
    });

  const succeed = async () => {
    await wait(900);
    published++;
  };

  const fail = async () => {
    await wait(900);
    throw new Error("The publishing service refused the request.");
  };
</script>

<main class="mx-auto flex w-full max-w-4xl flex-col gap-12 p-6 sm:p-10">
  <header class="flex flex-col gap-3">
    <h1 class="text-3xl font-semibold tracking-tight">AsyncButton</h1>
    <p class="max-w-2xl text-base-content/70">
      A <a class="link" href={resolve("/components/loading-button")}>LoadingButton</a> that derives its
      busy state from the handler it was given: the click is awaited, the spinner runs for exactly as
      long as the promise, and a second click cannot start while the first is in flight.
    </p>
  </header>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
      Success path
    </h2>
    <div class="card flex-row flex-wrap items-center gap-4 rounded-box bg-base-200 p-4">
      <AsyncButton class="btn btn-primary" onclick={succeed} data-testid="publish">
        Publish
      </AsyncButton>
      <span class="text-sm">
        Published <span class="badge badge-soft badge-primary" data-testid="published-count"
          >{published}</span
        > times
      </span>
      <span class="text-sm text-base-content/60">
        Clicking again while it is busy does nothing — the guard is in the action, not in the
        markup.
      </span>
    </div>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
      Failure path
    </h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      The rejection is caught for you — an event handler has no caller to catch for it — and handed
      to <code class="kbd kbd-sm">onerror</code>. Without one it goes to
      <code class="kbd kbd-sm">reportError</code>, so a failure is never swallowed in silence. Here
      it lands in local state and is rendered with
      <a class="link" href={resolve("/components/error-display")}>ErrorDisplay</a>.
    </p>
    <div class="card flex flex-col gap-4 rounded-box bg-base-200 p-4">
      <div class="flex flex-wrap items-center gap-4">
        <AsyncButton
          class="btn btn-error"
          onclick={fail}
          onerror={(error) => (failure = error)}
          data-testid="publish-failing"
        >
          Publish to a service that is down
        </AsyncButton>
        <span class="text-sm text-base-content/60">
          The button recovers on its own; what to show is the app's decision.
        </span>
      </div>

      {#if failure}
        <div class="rounded-box border border-base-content/10 bg-base-100" data-testid="failure">
          <ErrorDisplay
            title="Could not publish"
            message={failure instanceof Error ? failure.message : "Unknown failure."}
            reset={() => (failure = null)}
          />
        </div>
      {/if}
    </div>
  </section>
</main>
