<script lang="ts">
  import Dialog from "./Dialog.svelte";

  let dialog = $state<Dialog>();
</script>

<!--
@component
Test-only wiring for `Dialog`: the opener has to be a real button so the browser has something to
hand focus back to when the dialog closes. Named `*.spec.svelte` so packaging drops it.
-->

<button data-testid="opener" onclick={() => dialog?.show()}>Open</button>

<Dialog bind:this={dialog} class="rounded-box bg-base-100 p-6">
  <p data-testid="content">Dialog content</p>
  <button data-testid="inner-close" onclick={() => dialog?.close()}>Close</button>
</Dialog>
