<script lang="ts">
  import type { RoutingContext, ResolvedRoute } from "$lib/routing.svelte.js";
  import { AppShell, Breadcrumbs } from "$lib/shell/index.js";
  import { ThemeToggle } from "$lib/theme/index.js";
  import type { UserContext } from "$lib/user/index.js";
  import type { Attachment } from "svelte/attachments";
  import RoutingProvider from "../routing/RoutingProvider.svelte";
  import UserProvider from "../user/UserProvider.svelte";
  import { DEMO_ICONS } from "./demo-routes.js";

  interface Props {
    routing: RoutingContext;
    user: UserContext;
    /**
     * Both frames put a navigation landmark on the same page, so they are named apart. A real app
     * mounts one shell and leaves this at its default.
     */
    navLabel: string;
    /** `null` in the second frame: two shells on one page would otherwise fight over the same
     * remembered collapse state, and only one of them has a sidebar to remember it for. */
    storageKey?: string | null;
    /** Called with the pathname of whatever nav entry was clicked. */
    onnavigate: (pathname: string) => void;
  }

  const { routing, user, navLabel, storageKey, onnavigate }: Props = $props();

  /**
   * The shell emits real `<a href>`s, because that is what navigation is. The fake app they point
   * at has no pages in this site, so the click is intercepted in the capture phase and fed back
   * into the same state the route picker writes — the demo's stand-in for a router. Capture, not
   * bubble, so the shell's own handlers (the sheet dismissing itself) still run afterwards.
   */
  const demoRouter: Attachment<HTMLElement> = (node) => {
    const intercept = (event: MouseEvent) => {
      const link = (event.target as HTMLElement | null)?.closest("a[href]");
      if (!link) return;
      event.preventDefault();
      onnavigate(new URL(link.getAttribute("href")!, location.origin).pathname);
    };

    node.addEventListener("click", intercept, true);
    return () => node.removeEventListener("click", intercept, true);
  };
</script>

<!--
@component
One embedded instance of the shell, wrapped in the two contexts a real app installs in its root
layout. Both frames on the page render this same component against the same `RoutingContext` and
the same user store — the only difference between them is how wide the box around them is.
-->

<div class="h-full" {@attach demoRouter}>
  <UserProvider {user}>
    <RoutingProvider {routing}>
      <AppShell {navLabel} {storageKey} bottomBarSlots={5}>
        {#snippet brand({ collapsed })}
          <!-- The brand is entirely the app's: the library ships no mark, no wordmark and no link
             out to anywhere. Collapsing hands the snippet the state so it can shorten itself
             rather than be clipped. -->
          <span class="flex items-center gap-2 font-semibold tracking-tight">
            <span class="grid size-7 place-items-center rounded bg-primary text-primary-content">
              A
            </span>
            {#if !collapsed}<span>Acme</span>{/if}
          </span>
        {/snippet}

        {#snippet icon(route: ResolvedRoute)}
          <!-- `meta.icon` is an uninterpreted string, so this app made it a key into its own set.
             Leave the snippet out and the shell emits `<span class={meta.icon}>` instead, which is
             what an icon font or an Iconify utility class wants. -->
          {#if route.meta.icon}
            <svg
              class="size-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.7"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d={DEMO_ICONS[route.meta.icon]} />
            </svg>
          {/if}
        {/snippet}

        {#snippet footer()}
          <!-- The theme picker is dropped in by the app, not hardcoded by the shell. -->
          <ThemeToggle iconOnly />
        {/snippet}

        <div class="flex flex-col gap-4 p-5">
          <Breadcrumbs />
          <h2 class="text-xl font-semibold tracking-tight">
            {routing.matched.at(-1)?.label ?? "Not found"}
          </h2>
          <p class="text-sm text-base-content/70">
            The page. The shell owns the scroll container around it and reserves the height of the
            bottom bar underneath, so the last line here is never hidden behind it.
          </p>
          {#each [1, 2, 3, 4, 5, 6] as block (block)}
            <div class="rounded-box border border-base-content/10 bg-base-200/40 p-4 text-sm">
              Row {block}
            </div>
          {/each}
          <p class="text-sm font-medium">End of the page — still above the bar.</p>
        </div>
      </AppShell>
    </RoutingProvider>
  </UserProvider>
</div>
