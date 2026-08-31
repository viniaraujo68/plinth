<script lang="ts">
  import Modal from "./Modal.svelte";
  import Select from "./Select.svelte";
  import type { SelectOption } from "./select.js";

  let {
    options,
    value = $bindable(null),
  }: { options: readonly SelectOption[]; value?: string | null } = $props();

  let modal = $state<Modal>();
</script>

<!--
@component
Test-only host for a `Select` inside a `Modal`. The combination is the one that a hand-rolled
dropdown gets wrong: a modal `<dialog>` makes the rest of the document inert and sits in the top
layer, so a panel that is not itself in the top layer is either painted under the backdrop or not
reachable at all. Named `*.spec.svelte` so packaging drops it.
-->

<button type="button" data-testid="opener" onclick={() => modal?.show()}>Open</button>

<Modal bind:this={modal} title="Filters">
  <span id="modal-select-label">Local</span>
  <Select bind:value {options} aria-labelledby="modal-select-label" placeholder="Pick a local" />
</Modal>

<output data-testid="bound">{value ?? "none"}</output>
