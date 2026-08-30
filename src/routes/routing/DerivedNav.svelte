<script lang="ts">
  // `svelte/no-navigation-without-resolve` only recognises a literal `resolve()` call, and it
  // cannot: a pathname built at runtime has no literal route to hand it. `resolvePathname` is
  // that call, wrapped once so the unavoidable cast lives in one place.
  /* eslint-disable svelte/no-navigation-without-resolve */
  import { getRoutingContext, resolvePathname } from "$lib/routing.svelte.js";

  const routing = getRoutingContext();

  // Both lists are derived, never declared. A plumbing entry -- meta without a title -- is what
  // gets filtered here: it stays in `matched` so its role gate is still reachable, but it has no
  // business appearing as a crumb or a nav item.
  const crumbs = $derived(routing.matched.filter((route) => route.meta.title !== undefined));
  const sections = $derived(
    routing.children("/").filter((route) => route.meta.title !== undefined),
  );
</script>

<!--
@component
Breadcrumbs and a top-level nav, both read out of the routing context. Nothing here knows the
shape of the route tree; it asks.
-->

<nav aria-label="Breadcrumb" class="breadcrumbs text-sm">
  <ul>
    {#each crumbs as crumb (crumb.routeId)}
      <li>
        {#if crumb.navigable}
          <a href={resolvePathname(crumb.pathname)}>{crumb.label}</a>
        {:else}
          <span class="text-base-content/50">{crumb.label}</span>
        {/if}
      </li>
    {/each}
  </ul>
</nav>

<nav aria-label="Sections" class="flex flex-wrap gap-2">
  {#each sections as section (section.routeId)}
    {@const current = routing.matched.some((route) => route.routeId === section.routeId)}
    <a
      class="btn btn-sm {current ? 'btn-primary' : 'btn-ghost'}"
      href={resolvePathname(section.pathname)}
      aria-current={current ? "page" : undefined}
    >
      {section.label}
    </a>
  {/each}
</nav>
