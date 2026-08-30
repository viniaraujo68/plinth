<script lang="ts">
  interface Props {
    /** Wire the `reset` a `svelte:boundary` hands to its `failed` snippet. Omitted, no button. */
    reset?: () => void;
    title?: string;
    message?: string;
  }

  let {
    reset,
    title = "Something went wrong",
    message = "The application ran into an unexpected problem.",
  }: Props = $props();
</script>

<!--
@component
Calm in-place fallback for a crashed subtree: it says what happened and offers the way out.

It shows no technical detail on purpose — a stack is not source-mapped in production and the
message was written for whoever wrote the code, not for whoever is reading the screen. Reporting
is not this component's job either: it renders on every retry, so a report from here would be
counted once per render. Wire `reportError` on the boundary's `onerror` instead.

```svelte
<svelte:boundary onerror={reportError}>
  {@render children()}
  {#snippet failed(_error, reset)}<ErrorDisplay {reset} />{/snippet}
</svelte:boundary>
```
-->

<div
  class="flex h-full w-full flex-col items-center justify-center gap-2 p-8 text-center"
  role="alert"
>
  <svg
    class="size-12 text-base-content/40"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </svg>
  <p class="text-xs font-medium tracking-widest text-base-content/55 uppercase">Error</p>
  <p class="text-xl font-semibold">{title}</p>
  <p class="max-w-md text-sm text-base-content/60">{message}</p>
  {#if reset}
    <div class="mt-4">
      <button type="button" class="btn btn-primary" onclick={reset}>Try again</button>
    </div>
  {/if}
</div>
