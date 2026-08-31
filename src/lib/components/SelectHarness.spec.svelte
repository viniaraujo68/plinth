<script lang="ts">
  import Select from "./Select.svelte";
  import type { SelectOption } from "./select.js";

  let {
    options,
    value = $bindable(null),
    searchable,
    clearable = false,
    disabled = false,
    filter,
    name,
    withOptionSnippet = false,
  }: {
    options: readonly SelectOption[];
    value?: string | null;
    searchable?: boolean;
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
Test-only host for `Select`. It exists for the two-way binding and the snippet, neither of which a
spec that mounts the component directly can express, and for the surroundings the component needs
to be judged against: a label to be named by, a form to submit into, and a control after it for
Tab to land on. Named `*.spec.svelte` so packaging drops it.
-->

{#snippet row(option: SelectOption)}
  <span data-testid="custom-row">{option.label.toUpperCase()}</span>
{/snippet}

<span id="harness-label">Local</span>

<form data-testid="form">
  <Select
    bind:value
    {options}
    {searchable}
    {clearable}
    {disabled}
    {filter}
    {name}
    option={withOptionSnippet ? row : undefined}
    aria-labelledby="harness-label"
    placeholder="Pick a local"
    onchange={() => changes++}
  />
</form>

<output data-testid="bound">{value ?? "none"}</output>
<output data-testid="changes">{changes}</output>
<button type="button" data-testid="after">After</button>
