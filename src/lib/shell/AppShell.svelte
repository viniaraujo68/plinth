<script lang="ts">
  // `svelte/no-navigation-without-resolve` only recognises a literal `resolve()` call, and a
  // pathname assembled at runtime has no literal route to hand it. `resolvePathname` IS that call,
  // wrapped once so the unavoidable cast lives in a single place.
  /* eslint-disable svelte/no-navigation-without-resolve */
  import type { Snippet } from "svelte";
  import type { ClassValue } from "svelte/elements";
  import Dialog from "../components/Dialog.svelte";
  import { PICK_CLIP_PATH } from "../components/pick.js";
  import { tooltip } from "../attachments/tooltip.js";
  import { getRoutingContext, resolvePathname, type ResolvedRoute } from "../routing.svelte.js";
  import { getUserContext } from "../user/context.js";

  interface Props {
    /** The routed page. The shell owns the scroll container around it. */
    children: Snippet;
    /**
     * The sidebar header, and the bottom sheet's header on narrow screens. Receives the collapse
     * state so a caller can swap a wordmark for a mark instead of letting it be clipped.
     */
    brand?: Snippet<[{ collapsed: boolean }]>;
    /** Extra sidebar footer content, above the user block. A theme picker usually goes here. */
    footer?: Snippet;
    /**
     * Renders one entry's icon. Without it the shell emits `<span class={meta.icon}>`, which is
     * what an icon font or an Iconify/Tailwind class wants; supply it to render SVG components.
     */
    icon?: Snippet<[ResolvedRoute]>;
    /** Extra classes for the shell root — sizing, mostly. */
    class?: ClassValue;
    /**
     * How many slots the bottom bar has. Entries beyond it collapse into a trailing "More" item
     * that opens a sheet, so the last slot is spent on "More" only when there is an overflow:
     * five entries fill five slots, six entries render four plus "More".
     */
    bottomBarSlots?: number;
    /** Where the collapse state is remembered. `null` turns persistence off. */
    storageKey?: string | null;
    /** Whether the sidebar is collapsed to icons. Bindable, so a page can drive it too. */
    collapsed?: boolean;
    /** Accessible name of both navigations. A prop because the library ships no translations. */
    navLabel?: string;
    /** Accessible name of the collapse button. */
    collapseLabel?: string;
    /** Label of the bottom bar's overflow item, and heading of the sheet it opens. */
    moreLabel?: string;
    /** Accessible name of the sheet's close button. */
    closeLabel?: string;
    /** Label of the sign-out control, which only appears when the user context can sign out. */
    logoutLabel?: string;
  }

  /**
   * Reading the stored flag at init rather than in an effect is what keeps the first paint from
   * flashing an expanded sidebar shut. On the server there is no storage and no flash to avoid,
   * so it answers "expanded" and hydration corrects it.
   */
  const storedCollapsed = (key: string | null): boolean => {
    if (key === null || typeof localStorage === "undefined") return false;
    try {
      return localStorage.getItem(key) === "true";
    } catch {
      // Storage access throws outright in a sandboxed frame or with site data blocked.
      return false;
    }
  };

  let {
    children,
    brand,
    footer,
    icon,
    class: className,
    bottomBarSlots = 5,
    storageKey = "plinth:sidebar-collapsed",
    collapsed = $bindable(storedCollapsed(storageKey)),
    navLabel = "Main navigation",
    collapseLabel = "Toggle sidebar",
    moreLabel = "More",
    closeLabel = "Close",
    logoutLabel = "Sign out",
  }: Props = $props();

  const routing = getRoutingContext();
  const user = getUserContext();

  const titled = (route: ResolvedRoute) => route.meta.title !== undefined;

  /**
   * Home is the header entry, apart from the list — derived, never re-declared. The root is a
   * prefix of every route id, so it rides the trail whenever anything matched at all; on a 404
   * there is no trail and the header falls back to the brand alone.
   */
  const home = $derived(routing.matched.find((route) => route.routeId === "/" && titled(route)));
  const homeActive = $derived(routing.routeId === "/");

  /**
   * The role gate `ScopedComponent` applies, applied here instead — one step earlier, because the
   * bottom bar has to count the entries it will actually render before it can decide which ones
   * overflow. Wrapping each item in the component would leave the slot arithmetic counting entries
   * the user never sees, and "More" opening onto an empty sheet.
   */
  const items = $derived(
    routing
      .children("/")
      .filter((route) => titled(route) && user.hasAnyRole(route.meta.requiredRoles ?? [])),
  );

  /** An entry is current while the match sits anywhere on its subtree; among top-level siblings at
   * most one can. Home is the exception — everything is below the root, so it lights up on the
   * exact root only, and an undeclared route lights nothing at all. */
  const isActive = (route: ResolvedRoute) =>
    routing.matched.some((match) => match.routeId === route.routeId);

  // Home leads the bottom bar rather than heading it: a bar has no header to put it in.
  const barEntries = $derived(home ? [home, ...items] : items);
  const slots = $derived(Math.max(1, bottomBarSlots));
  const overflowing = $derived(barEntries.length > slots);
  const barItems = $derived(overflowing ? barEntries.slice(0, slots - 1) : barEntries);
  const overflowItems = $derived(overflowing ? barEntries.slice(slots - 1) : []);

  const initials = (name: string) => {
    const words = name.split(/\s+/).filter(Boolean);
    if (words.length === 0) return "?";
    const first = words[0][0];
    const last = words.length > 1 ? words[words.length - 1][0] : "";
    return `${first}${last}`.toUpperCase();
  };

  /* Per instance, not a constant: a page can mount two shells against one routing context — the
     showcase mounts exactly two — and a duplicated id would point both avatars at whichever
     `<clipPath>` the parser saw first. */
  const avatarClip = $props.id();

  let sheet = $state<Dialog>();

  $effect(() => {
    if (storageKey === null) return;
    try {
      localStorage.setItem(storageKey, String(collapsed));
    } catch {
      // Same sandbox as above; a sidebar that forgets its state is not worth an exception.
    }
  });
</script>

<!--
@component
The application shell: a collapsible sidebar on wide viewports, a fixed bottom bar on narrow ones,
both fed by the same `RoutingContext`. The route tree is declared once, by the filesystem and the
routing config; nothing here re-states it.

Which form shows is decided by a **container query on the shell root**, not by JavaScript. There is
no resize listener and no `matchMedia`, so nothing flashes the wrong layout on the first paint —
and because the root is its own container, the shell can be dropped into a narrow box to render its
mobile form on a desktop, which is exactly what the showcase does.

Entries come from `routing.children("/")`, minus plumbing (no `title`) and minus anything the user
context gates out. Home, when declared, is derived off the trail and rendered as the sidebar's
header entry and as the bottom bar's first item. Entries past `bottomBarSlots` collapse into a
"More" item that opens a bottom sheet.

Icons: `meta.icon` is an uninterpreted string, so by default it is handed straight to markup as
`<span class={meta.icon}>` — the shape an icon font or an Iconify/Tailwind class wants. Pass the
`icon` snippet to render something else, an SVG component for instance, and `meta.icon` becomes
whatever the app wants it to mean.

The shell fills its parent, so give it one with a height (`<div class="h-dvh">`, or `html, body {
height: 100% }`). It owns the page's scroll container — the bar is pinned to the bottom of the
shell rather than to the window, and the content area reserves its height plus
`env(safe-area-inset-bottom)` so nothing ends up underneath it.

```svelte
<AppShell>
  {#snippet brand({ collapsed })}
    <a href="/">{collapsed ? "A" : "Acme"}</a>
  {/snippet}
  {#snippet footer()}
    <ThemeToggle />
  {/snippet}
  {@render page()}
</AppShell>
```
-->

<div class={["plinth-shell", className]} class:collapsed>
  <aside class="shell-sidebar">
    <div class="sidebar-header">
      {#if brand}
        <div class="brand-slot">{@render brand({ collapsed })}</div>
      {/if}
      <button
        type="button"
        class="btn btn-square btn-ghost btn-sm"
        aria-label={collapseLabel}
        aria-pressed={collapsed}
        onclick={() => (collapsed = !collapsed)}
      >
        <svg
          class="size-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.75"
          stroke-linecap="round"
          aria-hidden="true"
        >
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
    </div>

    {#if home}
      <a
        class="nav-link"
        href={resolvePathname(home.pathname)}
        aria-current={homeActive ? "page" : undefined}
        {@attach tooltip(home.label, { disabled: !collapsed })}
      >
        <span class="nav-icon">{@render routeIcon(home)}</span>
        <span class="nav-label collapsible">{home.label}</span>
      </a>
      <hr class="nav-separator" />
    {/if}

    <nav class="sidebar-nav" aria-label={navLabel}>
      <ul>
        {#each items as item (item.routeId)}
          <li>
            <a
              class="nav-link"
              href={resolvePathname(item.pathname)}
              aria-current={isActive(item) ? "page" : undefined}
              {@attach tooltip(item.label, { disabled: !collapsed })}
            >
              <span class="nav-icon">{@render routeIcon(item)}</span>
              <span class="nav-label collapsible">{item.label}</span>
            </a>
          </li>
        {/each}
      </ul>
    </nav>

    <div class="sidebar-footer">
      {#if footer}
        <div class="footer-slot">{@render footer()}</div>
      {/if}

      {#if user.status === "authenticated" && user.data}
        {@const data = user.data}
        <div class="user-card">
          <!-- A `<clipPath>` rather than CSS `clip-path: path()`, because `path()` takes user
               units and never scales: it would fit one avatar size and no other.
               `clipPathUnits="objectBoundingBox"` reads the same outline in 0..1 and follows
               whatever box the span turns out to be. -->
          <svg class="avatar-clip" aria-hidden="true" focusable="false">
            <clipPath id={avatarClip} clipPathUnits="objectBoundingBox">
              <path d={PICK_CLIP_PATH} />
            </clipPath>
          </svg>
          <span class="avatar-initials" aria-hidden="true" style:clip-path="url(#{avatarClip})">
            {initials(data.name)}
          </span>
          <span class="user-identity collapsible">
            <span class="user-name">{data.name}</span>
            <span class="user-email">{data.email}</span>
          </span>
          {#if user.logout}
            <!-- Only rendered when the context can actually sign out; a button that does nothing
                 is worse than no button. -->
            <button
              type="button"
              class="collapsible btn btn-square btn-ghost btn-sm"
              aria-label={logoutLabel}
              onclick={() => void user.logout?.()}
            >
              <svg
                class="size-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.75"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
            </button>
          {/if}
        </div>
      {/if}
    </div>
  </aside>

  <main class="shell-content">
    {@render children()}
  </main>

  <nav class="shell-bottom-bar" aria-label={navLabel}>
    {#each barItems as item (item.routeId)}
      <a
        class="bar-link"
        href={resolvePathname(item.pathname)}
        aria-current={isActive(item) ? "page" : undefined}
      >
        <span class="bar-icon">{@render routeIcon(item)}</span>
        <span class="bar-text">{item.label}</span>
      </a>
    {/each}

    {#if overflowItems.length > 0}
      <button type="button" class="bar-link" aria-haspopup="dialog" onclick={() => sheet?.show()}>
        <span class="bar-icon" aria-hidden="true">
          <svg
            class="size-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          >
            <circle cx="5" cy="12" r="1" />
            <circle cx="12" cy="12" r="1" />
            <circle cx="19" cy="12" r="1" />
          </svg>
        </span>
        <span class="bar-text">{moreLabel}</span>
      </button>
    {/if}
  </nav>

  <!-- A native modal dialog rather than a hand-rolled panel: modality, the focus trap, Escape and
       returning focus to the "More" button are the browser's, and the top layer settles the
       stacking against the fixed bar without a z-index. The trade is that the top layer is anchored
       to the viewport, not to the shell — visible only when the shell is embedded in a box smaller
       than the window, as in the showcase. -->
  <Dialog bind:this={sheet} class="plinth-sheet" aria-label={moreLabel}>
    <div class="sheet-header">
      {#if brand}
        <div class="brand-slot">{@render brand({ collapsed: false })}</div>
      {:else}
        <span class="sheet-title">{moreLabel}</span>
      {/if}
      <button
        type="button"
        class="btn size-11 btn-ghost"
        aria-label={closeLabel}
        onclick={() => sheet?.close()}
      >
        ✕
      </button>
    </div>
    <ul class="sheet-list">
      {#each overflowItems as item (item.routeId)}
        <li>
          <a
            class="sheet-link"
            href={resolvePathname(item.pathname)}
            aria-current={isActive(item) ? "page" : undefined}
            onclick={() => sheet?.close()}
          >
            <span class="nav-icon">{@render routeIcon(item)}</span>
            <span>{item.label}</span>
          </a>
        </li>
      {/each}
    </ul>
  </Dialog>
</div>

{#snippet routeIcon(route: ResolvedRoute)}
  {#if icon}
    {@render icon(route)}
  {:else if route.meta.icon}
    <span class={route.meta.icon} aria-hidden="true"></span>
  {/if}
{/snippet}

<style>
  .plinth-shell {
    --plinth-sidebar-width: 16rem;
    --plinth-sidebar-collapsed-width: 4rem;
    --plinth-bottom-bar-height: 3.5rem;
    /* Behind a custom property rather than inlined at each use: `env()` resolves to zero on
       everything without a notch, which makes the inset impossible to see in a browser and
       impossible to assert in a test. One name gives an app — and a spec — somewhere to override
       it, and keeps the bar and the content reserve reading the same number. */
    --plinth-safe-area-bottom: env(safe-area-inset-bottom, 0px);
    --plinth-shell-line: color-mix(in oklch, var(--color-base-content) 12%, transparent);

    /* The whole breakpoint. Querying the container rather than the viewport is also what lets the
       shell be dropped into a narrow box and render its phone form on a desktop, which is how the
       showcase demonstrates both at once and how a test reaches either. */
    container: plinth-shell / inline-size;

    /* The bar is anchored to this box, not to the window. `position: fixed` would have been the
       obvious spelling and is wrong here twice over: browsers do not treat a query container as a
       containing block for fixed descendants, so the bar would escape an embedded shell entirely,
       and it does not need to -- the root never scrolls, only `.shell-content` inside it does. */
    position: relative;
    display: flex;
    height: 100%;
    min-height: 0;
    background-color: var(--color-base-200);
    color: var(--color-base-content);
  }

  .shell-content {
    flex: 1;
    min-width: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    background-color: var(--color-base-100);
    /* The bar is out of flow, so the room under it has to be reserved here or the last line of
       every page hides behind it. */
    padding-bottom: calc(var(--plinth-bottom-bar-height) + var(--plinth-safe-area-bottom));
  }

  .shell-sidebar {
    display: none;
    flex-direction: column;
    flex-shrink: 0;
    width: var(--plinth-sidebar-width);
    overflow-x: hidden;
    border-right: 1px solid var(--plinth-shell-line);
    background-color: var(--color-base-100);
    transition: width 200ms ease;
  }

  .plinth-shell.collapsed .shell-sidebar {
    width: var(--plinth-sidebar-collapsed-width);
  }

  .plinth-shell.collapsed .collapsible {
    display: none;
  }

  .sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    /* Matched to the icon column so the toggle lines up with the icons below it. */
    min-height: var(--plinth-sidebar-collapsed-width);
    padding: 0 0.625rem;
  }

  /* A brand and a toggle do not both fit across a 4rem rail, and squeezing them is how the mark
     ends up a sliver. Stacking keeps the brand slot at full rail width and leaves the toggle
     reachable, which is the one control that must never collapse out of existence. */
  .plinth-shell.collapsed .sidebar-header {
    flex-direction: column;
    justify-content: center;
    gap: 0.25rem;
    min-height: 0;
    padding: 0.5rem 0;
  }

  .brand-slot {
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
  }

  .plinth-shell.collapsed .brand-slot {
    display: flex;
    justify-content: center;
    width: 100%;
  }

  .sidebar-nav {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  }

  .sidebar-nav ul {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .nav-separator {
    height: 1px;
    margin: 0.75rem 0.875rem;
    border: 0;
    background-color: var(--plinth-shell-line);
  }

  .nav-link {
    display: flex;
    align-items: center;
    height: 2.5rem;
    white-space: nowrap;
    color: color-mix(in oklch, var(--color-base-content) 65%, transparent);
    transition: background-color 120ms ease;
  }

  .nav-icon {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    /* The icon column is exactly the collapsed width, so collapsing moves nothing. */
    width: var(--plinth-sidebar-collapsed-width);
    font-size: 1.25rem;
  }

  .nav-label {
    min-width: 0;
    overflow: hidden;
    font-size: 0.875rem;
    text-overflow: ellipsis;
  }

  .nav-link:hover:not([aria-current="page"]) {
    background-color: var(--color-base-200);
    color: var(--color-base-content);
  }

  .nav-link[aria-current="page"] {
    background-color: var(--color-base-300);
    color: var(--color-base-content);
  }

  .nav-link[aria-current="page"] .nav-icon {
    color: var(--color-primary);
  }

  .sidebar-footer {
    border-top: 1px solid var(--plinth-shell-line);
  }

  .footer-slot {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.5rem;
  }

  .user-card {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    padding: 0.625rem;
  }

  /* Carries the definition only; the shape is painted by the span that references it. Zero-sized
     rather than `display: none`, which is the one way of hiding it that some engines take as
     licence to skip the subtree the reference needs. */
  .avatar-clip {
    position: absolute;
    width: 0;
    height: 0;
  }

  .avatar-initials {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    /* Wider than the circle it replaces: the outline is inset inside its own 32-unit square, so
       the pick drawn in a 2rem box would have come out visibly smaller than the disc did. */
    width: 2.5rem;
    height: 2.5rem;
    /* The silhouette tapers to a point at the top, which puts its mass below the middle of the
       box. A few pixels of head room is what centres the initials in the shape rather than in the
       box that contains it. */
    padding-top: 0.25rem;
    /* Solid, where the disc was a 15% wash: a clipped shape is only readable by its edge, and a
       wash that faint leaves the edge to guesswork. `--color-primary-content` is the pair the
       theme guarantees against it in both modes. */
    background-color: var(--color-primary);
    color: var(--color-primary-content);
    font-size: 0.75rem;
    font-weight: 500;
  }

  .user-identity {
    display: flex;
    flex: 1;
    min-width: 0;
    flex-direction: column;
  }

  .user-name,
  .user-email {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .user-name {
    font-size: 0.875rem;
  }

  .user-email {
    color: color-mix(in oklch, var(--color-base-content) 60%, transparent);
    font-size: 0.75rem;
  }

  .shell-bottom-bar {
    position: absolute;
    inset-inline: 0;
    bottom: 0;
    z-index: 30;
    display: flex;
    align-items: stretch;
    border-top: 1px solid var(--plinth-shell-line);
    background-color: var(--color-base-100);
    padding-bottom: var(--plinth-safe-area-bottom);
  }

  .bar-link {
    display: flex;
    flex: 1 1 0;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.125rem;
    /* 44px is the floor for a touch target; the bar is taller than that on purpose, so the label
       under the icon has somewhere to sit. */
    min-width: 2.75rem;
    min-height: var(--plinth-bottom-bar-height);
    padding: 0 0.25rem;
    overflow: hidden;
    color: color-mix(in oklch, var(--color-base-content) 65%, transparent);
  }

  .bar-icon {
    display: flex;
    align-items: center;
    font-size: 1.125rem;
    line-height: 1;
  }

  .bar-text {
    max-width: 100%;
    overflow: hidden;
    font-size: 0.6875rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .bar-link[aria-current="page"] {
    color: var(--color-primary);
  }

  /* The sheet is rendered by `Dialog`, so its class never appears in this component's markup and
     the compiler would prune every rule below as unused. */
  :global(dialog.plinth-sheet) {
    /* Bottom-anchored and full-bleed: a sheet, not a centred box. */
    margin: auto auto 0;
    width: 100%;
    max-width: 100%;
    max-height: 80dvh;
    padding: 0 0 var(--plinth-safe-area-bottom);
    border: 0;
    border-radius: var(--radius-box, 1rem) var(--radius-box, 1rem) 0 0;
    background-color: var(--color-base-100);
    color: var(--color-base-content);
  }

  :global(dialog.plinth-sheet::backdrop) {
    background-color: rgb(0 0 0 / 0.4);
  }

  .sheet-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.5rem 0.5rem 0.5rem 1rem;
    border-bottom: 1px solid var(--plinth-shell-line);
  }

  .sheet-title {
    font-size: 1rem;
    font-weight: 600;
  }

  .sheet-list {
    margin: 0;
    padding: 0.5rem 0;
    list-style: none;
    overflow-y: auto;
  }

  .sheet-link {
    display: flex;
    align-items: center;
    /* Same 44px floor as the bar it overflows from. */
    min-height: 2.75rem;
    font-size: 0.9375rem;
  }

  .sheet-link[aria-current="page"] {
    background-color: var(--color-base-300);
  }

  @container plinth-shell (min-width: 48rem) {
    .shell-sidebar {
      display: flex;
    }

    .shell-bottom-bar {
      display: none;
    }

    .shell-content {
      padding-bottom: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .shell-sidebar {
      transition: none;
    }
  }
</style>
