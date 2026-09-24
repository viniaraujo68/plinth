<script lang="ts">
  import Dropdown from "./Dropdown.svelte";

  let { panelClass = "panel", atEdge = false }: { panelClass?: string; atEdge?: boolean } =
    $props();

  let menu = $state<ReturnType<typeof Dropdown>>();
</script>

<!--
@component
Test-only host for `Dropdown`. It exists for the snippet and for the imperative handle: `open()`
and `close()` are only reachable through `bind:this`, which a spec cannot express on its own.
Named `*.spec.svelte` so packaging drops it.
-->

<button type="button" onclick={() => menu?.open()}>Open from outside</button>

<span class:edge={atEdge}>
  <Dropdown bind:this={menu} {panelClass}>
    Actions
    {#snippet content()}
      <button type="button" onclick={() => menu?.close()}>Done</button>
    {/snippet}
  </Dropdown>
</span>

<style>
  /* The trigger against the right side of the screen, with a panel far wider than it: the shape
     a menu at the end of a toolbar takes on a phone. */
  .edge {
    position: fixed;
    top: 4rem;
    right: 0;
  }

  .edge :global([popover]) {
    width: 16rem;
  }
</style>
