<script lang="ts">
  import Combobox from "./Combobox.svelte";
  import type { SelectOption } from "./select.js";

  let {
    options,
    value = $bindable(null),
    clearable = false,
    disabled = false,
    filter,
    name,
    withOptionSnippet = false,
  }: {
    options: readonly SelectOption[];
    value?: string | null;
    clearable?: boolean;
    disabled?: boolean;
    filter?: (option: SelectOption, query: string) => boolean;
    name?: string;
    withOptionSnippet?: boolean;
  } = $props();

  let changes = $state(0);
</script>

<!--
@component
Test-only host for `Combobox`. It exists for the two-way binding and the snippet, neither of which
a spec that mounts the component directly can express, and for the surroundings the component
needs to be judged against: a label to be named by, a form to submit into, a control after it for
Tab to land on, and somewhere outside the control for a click to land on. Named `*.spec.svelte` so
packaging drops it.
-->

{#snippet row(option: SelectOption)}
  <span data-testid="custom-row">{option.label.toUpperCase()}</span>
{/snippet}

<!-- Pinned out of the panel's way: the list hangs under the bar and covers everything below it,
     and a click on something the panel is painted over is not a click outside. -->
<p data-testid="outside" style="position: fixed; top: 0; right: 0">Somewhere else entirely</p>

<span id="harness-label">Local</span>

<form data-testid="form">
  <Combobox
    bind:value
    {options}
    {clearable}
    {disabled}
    {filter}
    {name}
    option={withOptionSnippet ? row : undefined}
    aria-labelledby="harness-label"
    placeholder="Pick a local"
    emptyLabel="No local by that name"
    onchange={() => changes++}
  />
</form>

<output data-testid="bound">{value ?? "none"}</output>
<output data-testid="changes">{changes}</output>
<button type="button" data-testid="after">After</button>
