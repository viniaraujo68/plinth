<script lang="ts">
  import { tooltip } from "./tooltip.js";

  interface Props {
    text?: string;
    disabled?: boolean;
    /** Puts the host somewhere with room around it, for the specs that measure the panel. */
    style?: string;
  }

  let { text = "Archives the release", disabled = false, style }: Props = $props();
</script>

<!--
@component
Test-only host for the string attachment. `{@attach}` only exists inside a component, so the spec
renders this rather than calling the attachment by hand — which is also the only way to exercise
the re-run that a changing `disabled` triggers. Named `*.spec.svelte` so packaging drops it.
-->

<button {style} {@attach tooltip(text, { disabled })}>Archive</button>
