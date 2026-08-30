<script lang="ts">
  /* Same reason as in `AppShell`: the lint rule can only see a literal `resolve()`, and a runtime
     pathname has no literal route to give it. */
  /* eslint-disable svelte/no-navigation-without-resolve */
  import { getRoutingContext, resolvePathname } from "../routing.svelte.js";
  import type { Crumb } from "./crumbs.js";

  interface Props {
    /**
     * A trail to render verbatim, root first. Nothing is filtered — the caller already chose what
     * to show — so keep `routeId` unique across entries. Omit it and the trail comes from the
     * routing context, which then has to be set.
     */
    crumbs?: Crumb[];
    /** Accessible name of the landmark. A prop because the library ships no translations. */
    label?: string;
  }

  const { crumbs: custom, label = "Breadcrumb" }: Props = $props();

  // The context getter THROWS when nothing set one, so it is only reached for when the caller did
  // not bring their own trail. That is what lets custom breadcrumbs work in an app with no routing
  // context at all. Whether an instance is custom or context-driven is settled at init, on purpose:
  // swapping a live component between the two modes is not a thing worth supporting.
  // svelte-ignore state_referenced_locally
  const routing = custom === undefined ? getRoutingContext() : null;

  // Plumbing entries stay in `matched` so a role gate declared halfway up the tree remains
  // reachable; they have no business being a crumb.
  const trail = $derived(custom ?? routing!.matched.filter((r) => r.meta.title !== undefined));
</script>

<!--
@component
The page's breadcrumb trail, derived from the routing context: every titled entry on the current
match, root first, each one a link except the last and except any section with no page behind it.

Pass `crumbs` to render a trail of your own instead — same grammar, caller-owned content. An entry
only needs `routeId` and `label`, so appending a leaf the route tree cannot know about is cheap:

```svelte
<Breadcrumbs crumbs={[...routing.matched, { routeId: "leaf", label: order.reference }]} />
```
-->

<nav class="breadcrumbs py-1 text-sm" aria-label={label}>
  <ul>
    {#each trail as crumb, index (crumb.routeId)}
      {@const isLast = index === trail.length - 1}
      {@const isLink = !isLast && crumb.navigable === true && crumb.pathname !== undefined}
      <li>
        {#if isLink}
          <a class="crumb gap-1.5 text-base-content/50" href={resolvePathname(crumb.pathname!)}>
            {#if crumb.routeId === "/" && crumb.meta?.icon}
              <span class="size-4 {crumb.meta.icon}" aria-hidden="true"></span>
            {/if}
            {crumb.label}
          </a>
        {:else}
          <!-- The last crumb names the page the user is already on, which is what `aria-current`
               is for; the intermediate non-links are headings and get neither. -->
          <span
            class={[
              "crumb gap-1.5",
              isLast ? "cursor-default text-base-content" : "text-base-content/50",
            ]}
            aria-current={isLast ? "page" : undefined}
          >
            {#if crumb.routeId === "/" && crumb.meta?.icon}
              <span class="size-4 {crumb.meta.icon}" aria-hidden="true"></span>
            {/if}
            {crumb.label}
          </span>
        {/if}
      </li>
    {/each}
  </ul>
</nav>
