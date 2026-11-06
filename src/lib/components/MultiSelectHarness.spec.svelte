<script lang="ts">
  import MultiSelect from "./MultiSelect.svelte";
  import type { SelectOption } from "./select.js";

  interface Props {
    options: readonly SelectOption[];
    value?: string[];
    disabled?: boolean;
    required?: boolean;
    loading?: boolean;
    onchange?: (value: string[]) => void;
  }

  let { options, value = $bindable([]), ...rest }: Props = $props();
</script>

<form data-testid="form" onsubmit={(event) => event.preventDefault()}>
  <label for="people">People</label>
  <MultiSelect id="people" name="people" {options} bind:value {...rest} />
  <button type="button">Elsewhere</button>
</form>
