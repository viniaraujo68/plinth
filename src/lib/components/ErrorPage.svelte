<script lang="ts">
  interface Props {
    /** HTTP status behind the failure. 404 gets its own wording and icon. */
    status: number;
    /** Message from `error(status, message)`. Ignored for a 404, where the path says more. */
    message?: string;
    /** Path that was asked for. Shown only on a 404. */
    pathname?: string;
    /** Where "back to start" goes. Pass `resolve("/")` from an app with a base path. */
    homeHref?: string;
  }

  let { status, message, pathname, homeHref = "/" }: Props = $props();

  const notFound = $derived(status === 404);
</script>

<!--
@component
Route-level error page: status-aware, human-facing, rendered from an app's `+error.svelte`.

Everything it shows arrives as a prop rather than being read from `$app/state` inside the
component. That keeps it renderable — and testable — outside a SvelteKit navigation, and it keeps
the choice of what to reveal at the app's own `+error.svelte`, which is where the app can tell an
intentional `error(403, "...")` message apart from one it would rather not print.

```svelte
<script lang="ts">
  import { page } from "$app/state";
  import { resolve } from "$app/paths";
</script>

<ErrorPage status={page.status} message={page.error?.message} pathname={page.url.pathname}
  homeHref={resolve("/")} />
```
-->

<div class="flex h-full w-full flex-col items-center justify-center gap-2 p-8 text-center">
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
    {#if notFound}
      <path d="m16.24 7.76-1.8 5.41a2 2 0 0 1-1.27 1.27l-5.41 1.8 1.8-5.41a2 2 0 0 1 1.27-1.27z" />
      <circle cx="12" cy="12" r="10" />
    {:else}
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    {/if}
  </svg>
  <p class="text-xs font-medium tracking-widest text-base-content/55 uppercase">Error {status}</p>
  <h1 class="text-xl font-semibold">
    {notFound ? "Page not found" : "Something went wrong"}
  </h1>
  <p class="max-w-md text-sm text-base-content/60">
    {#if notFound}
      The address {#if pathname}<span class="font-mono break-all">{pathname}</span>{:else}you asked
        for{/if} does not exist, or has moved.
    {:else}
      {message ?? "The application ran into an unexpected problem."}
    {/if}
  </p>
  <div class="mt-4 flex gap-2">
    <!-- The link is resolved by the app, which is the side that knows its route ids and its base
         path; the library only renders what it was handed. -->
    <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
    <a class="btn btn-primary" href={homeHref}>Back to start</a>
    {#if !notFound}
      <!-- A reload is worth offering only for a failure that might not repeat; a 404 will. -->
      <button type="button" class="btn" onclick={() => location.reload()}>Reload</button>
    {/if}
  </div>
</div>
