<script lang="ts">
  import RequestErrorDisplay from "$lib/components/RequestErrorDisplay.svelte";
  import { ApiError, classifyError, createHttpClient } from "$lib/http.js";

  const SAMPLES: { label: string; error: unknown }[] = [
    { label: "Chrome, offline", error: new TypeError("Failed to fetch") },
    {
      label: "Firefox, offline",
      error: new TypeError("NetworkError when attempting to fetch resource."),
    },
    { label: "Safari, offline", error: new TypeError("Load failed") },
    { label: "ApiError 401", error: new ApiError(401, "Token expired") },
    { label: "ApiError 403", error: new ApiError(403, "Not a member of this workspace") },
    { label: "ApiError 404", error: new ApiError(404, "Order 7841 not found") },
    { label: "ApiError 503", error: new ApiError(503, "Service Unavailable") },
    { label: "A plain Error", error: new Error("Cannot read properties of undefined") },
  ];

  const api = createHttpClient({ baseUrl: "/plinth-demo-missing-api" });
  const unreachable = createHttpClient({ baseUrl: "http://127.0.0.1:9" });

  let live = $state<Promise<unknown> | null>(null);
  let lastRequest = $state<() => Promise<unknown>>(() => Promise.resolve());

  const request = (run: () => Promise<unknown>) => {
    lastRequest = run;
    live = run();
  };
</script>

<main class="mx-auto flex w-full max-w-5xl flex-col gap-12 p-6 sm:p-10">
  <header class="flex flex-col gap-3">
    <h1 class="text-3xl font-semibold tracking-tight">RequestErrorDisplay</h1>
    <p class="max-w-2xl text-base-content/70">
      The panel for a request that failed: it sorts the error into a handful of kinds with
      <code class="kbd kbd-sm">classifyError</code> from
      <code class="kbd kbd-sm">@viniaraujo68/plinth/http</code>, and gives each its own icon, title
      and message. Anything it cannot place gets the generic fallback — it never rethrows, so it is
      safe to render on the server, where a boundary would not catch a throw.
    </p>
  </header>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">Every kind</h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      A failed <code class="kbd kbd-sm">fetch</code> rejects with a
      <code class="kbd kbd-sm">TypeError</code> whose message every engine words differently, so the
      three offline cards below are three browsers saying the same thing. A
      <code class="kbd kbd-sm">TypeError</code> with any other message is a bug rather than a
      network failure — unless <code class="kbd kbd-sm">navigator.onLine</code> says the browser is
      offline, which settles it. Anything with a numeric <code class="kbd kbd-sm">status</code> is
      read by its status, an <code class="kbd kbd-sm">ApiError</code> or SvelteKit's own
      <code class="kbd kbd-sm">HttpError</code> alike.
    </p>
    <ul class="grid gap-4 md:grid-cols-2" data-testid="kinds">
      {#each SAMPLES as sample (sample.label)}
        <li
          class="flex flex-col rounded-box border border-base-content/10 bg-base-200"
          data-testid="kind-sample"
        >
          <p
            class="border-b border-base-content/10 px-4 py-2 font-mono text-xs text-base-content/60"
          >
            {sample.label} → {classifyError(sample.error)}
          </p>
          <RequestErrorDisplay error={sample.error} reset={() => undefined} />
        </li>
      {/each}
    </ul>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
      A real request
    </h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      These go over the wire. The first asks this site for an endpoint it does not have, which comes
      back a 404 <code class="kbd kbd-sm">ApiError</code>; the second asks a port nothing listens
      on, which the browser rejects with its own offline message. "Try again" repeats the request.
    </p>
    <div class="flex flex-wrap gap-2">
      <button
        type="button"
        class="btn btn-sm"
        data-testid="request-missing"
        onclick={() => request(() => api.get("/orders"))}
      >
        Request a missing endpoint
      </button>
      <button
        type="button"
        class="btn btn-sm"
        data-testid="request-unreachable"
        onclick={() => request(() => unreachable.get("/orders"))}
      >
        Request an unreachable host
      </button>
    </div>
    <div
      class="flex min-h-64 items-center justify-center rounded-box border border-base-content/10 bg-base-200"
      data-testid="live-request"
    >
      {#if live}
        {#await live}
          <span class="loading loading-md loading-spinner"></span>
        {:then}
          <p class="text-sm text-base-content/60">Loaded.</p>
        {:catch error}
          <RequestErrorDisplay {error} reset={() => request(lastRequest)} />
        {/await}
      {:else}
        <p class="text-sm text-base-content/60">Nothing requested yet.</p>
      {/if}
    </div>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">Wording</h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      Every word is a prop with an English default:
      <code class="kbd kbd-sm">labels</code> overrides the title or the message of any kind, and
      <code class="kbd kbd-sm">eyebrow</code> and <code class="kbd kbd-sm">retryLabel</code> the rest.
    </p>
    <div class="rounded-box border border-base-content/10 bg-base-200">
      <RequestErrorDisplay
        error={new TypeError("Failed to fetch")}
        reset={() => undefined}
        eyebrow="Erro"
        retryLabel="Tentar novamente"
        labels={{
          offline: {
            title: "Sem conexão",
            message: "Verifique sua internet e tente novamente.",
          },
        }}
      />
    </div>
  </section>
</main>
