<script lang="ts">
  import Copyable from "./Copyable.svelte";

  interface Props {
    copyableText?: string;
    confirmationMs?: number;
    copyLabel?: string;
    copiedLabel?: string;
  }

  let { copyableText, confirmationMs, copyLabel, copiedLabel }: Props = $props();
</script>

<!--
@component
Test-only host for `Copyable`, whose value is a snippet. Named `*.spec.svelte` so packaging drops
it.
-->

<Copyable {copyableText} {confirmationMs} {copyLabel} {copiedLabel}>
  <span>acme-prod</span>
</Copyable>
