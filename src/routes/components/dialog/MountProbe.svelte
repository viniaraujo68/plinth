<script lang="ts">
  import { onMount } from "svelte";

  interface Props {
    onmount: () => void;
    ondestroy: () => void;
  }

  const { onmount, ondestroy }: Props = $props();

  onMount(() => {
    onmount();
    return ondestroy;
  });
</script>

<!--
@component
Showcase-only: renders nothing and reports its own lifecycle, so the page can show that a dialog's
children exist only while the dialog is on screen. It stands in for the expensive thing a real app
puts inside a dialog -- a form, a chart, a fetch on mount.
-->
