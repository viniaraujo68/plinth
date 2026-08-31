<script lang="ts">
  import Modal from "./Modal.svelte";

  const { dismissible = true, withBody = true }: { dismissible?: boolean; withBody?: boolean } =
    $props();

  let modal = $state<Modal>();
  let closes = $state(0);
</script>

<!--
@component
Test-only wiring for `Modal`. The opener is a real button so focus has somewhere to return to, and
the body carries a focusable control so the initial-focus rule has a candidate to prefer over the
close button. Named `*.spec.svelte` so packaging drops it.
-->

<button data-testid="opener" onclick={() => modal?.show()}>Open</button>
<p data-testid="closes">{closes}</p>

{#snippet body()}
  <p data-testid="content">Modal content</p>
  <button data-testid="body-button">A control in the body</button>
{/snippet}

{#snippet footer()}
  <button data-testid="footer-close" onclick={() => modal?.close()}>Done</button>
{/snippet}

<Modal
  bind:this={modal}
  title="Harness modal"
  {dismissible}
  onclose={() => closes++}
  children={withBody ? body : undefined}
  {footer}
/>
