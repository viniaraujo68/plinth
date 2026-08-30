<script lang="ts">
  import Copyable from "./Copyable.svelte";

  interface Props {
    copyableText?: string;
    confirmationMs?: number;
  }

  let { copyableText, confirmationMs }: Props = $props();
</script>

<!--
@component
Test-only host for `Copyable`, whose value is a snippet. Named `*.spec.svelte` so packaging drops
it.
-->

<Copyable {copyableText} {confirmationMs}>
  <span>acme-prod</span>
</Copyable>
