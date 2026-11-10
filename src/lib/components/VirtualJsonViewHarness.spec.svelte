<script lang="ts">
  import VirtualJsonView from "./VirtualJsonView.svelte";

  const { value }: { value: unknown } = $props();
</script>

<div class="harness">
  <VirtualJsonView {value} class="harness-fill" />
</div>

<style>
  .harness {
    display: flex;
    flex-direction: column;
    height: 320px;
  }

  .harness :global(.harness-fill) {
    flex: 1;
    min-height: 0;
  }
</style>
