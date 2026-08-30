<script lang="ts">
  import Dropdown from "./Dropdown.svelte";

  let { panelClass = "panel" }: { panelClass?: string } = $props();

  let menu = $state<ReturnType<typeof Dropdown>>();
</script>

<!--
@component
Test-only host for `Dropdown`. It exists for the snippet and for the imperative handle: `open()`
and `close()` are only reachable through `bind:this`, which a spec cannot express on its own.
Named `*.spec.svelte` so packaging drops it.
-->

<button type="button" onclick={() => menu?.open()}>Open from outside</button>

<Dropdown bind:this={menu} {panelClass}>
  Actions
  {#snippet content()}
    <button type="button" onclick={() => menu?.close()}>Done</button>
  {/snippet}
</Dropdown>
