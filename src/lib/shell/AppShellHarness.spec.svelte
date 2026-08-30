<script lang="ts">
  import { untrack } from "svelte";
  import { setRoutingContext, type RoutingContext, type ResolvedRoute } from "../routing.svelte.js";
  import { setUserContext, type UserContext } from "../user/context.js";
  import AppShell from "./AppShell.svelte";

  interface Props {
    routing: RoutingContext;
    /** Left out to exercise the anonymous fallback, which is what an app with no auth gets. */
    user?: UserContext;
    /** The box the shell sits in. The container query reads this, not the window. */
    width: string;
    bottomBarSlots?: number;
    storageKey?: string | null;
    /** Renders icons through the snippet instead of the default `<span class={meta.icon}>`. */
    customIcons?: boolean;
    withBrand?: boolean;
    /** A stand-in for the language or theme toggle an app drops into the footer slot. */
    withFooter?: boolean;
  }

  const {
    routing,
    user,
    width,
    bottomBarSlots,
    storageKey,
    customIcons = false,
    withBrand = false,
    withFooter = false,
  }: Props = $props();

  let footerClicks = $state(0);

  // Both contexts are installed once and then mutate internally, exactly as an app's root layout
  // does it; reading the props untracked says so.
  setRoutingContext(untrack(() => routing));
  // svelte-ignore state_referenced_locally
  if (user) setUserContext(untrack(() => user));
</script>

<div style="width: {width}; height: 420px;">
  <AppShell
    {bottomBarSlots}
    {storageKey}
    brand={withBrand ? brand : undefined}
    footer={withFooter ? footer : undefined}
    icon={customIcons ? icon : undefined}
  >
    <p>page body</p>
  </AppShell>
</div>

{#snippet brand()}
  <span data-testid="brand">Acme</span>
{/snippet}

{#snippet footer()}
  <button
    type="button"
    data-testid="footer-control"
    data-clicks={footerClicks}
    onclick={() => (footerClicks += 1)}
  >
    Language
  </button>
{/snippet}

{#snippet icon(route: ResolvedRoute)}
  <i data-testid="custom-icon" data-icon={route.meta.icon}></i>
{/snippet}
