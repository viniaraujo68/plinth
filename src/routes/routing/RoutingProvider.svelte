<script lang="ts">
  import { RoutingContext, setRoutingContext } from "$lib/routing.svelte.js";
  import { untrack, type Snippet } from "svelte";

  const { routing, children }: { routing: RoutingContext; children: Snippet } = $props();

  // `setContext` is only legal while a component initialises, which is why this wrapper exists
  // at all: a `+page.svelte` can do it too, but an app puts it in the root layout so every route
  // below inherits the same instance. The showcase keeps it local so the demo does not have to
  // own the shared layout.
  //
  // The instance is installed once and then mutates internally, so reading the prop untracked is
  // the intent -- swapping the whole context on a live tree is not something to support.
  setRoutingContext(untrack(() => routing));
</script>

<!--
@component
Installs a `RoutingContext` for its subtree, the way a root `+layout.svelte` would.
-->

{@render children()}
