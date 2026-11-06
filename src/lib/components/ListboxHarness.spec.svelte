<script lang="ts">
  import { untrack } from "svelte";
  import Listbox from "./Listbox.svelte";
  import type { SelectOption } from "./select.js";

  interface Props {
    options: readonly SelectOption[];
    value?: string | string[] | null;
    searchable?: boolean;
    checkmarks?: boolean;
    loading?: boolean;
    autofocus?: boolean;
    searchText?: (option: SelectOption) => string;
  }

  let { options, value = null, ...rest }: Props = $props();

  let picked = $state(untrack(() => value));

  const onpick = (option: SelectOption) => {
    if (!Array.isArray(picked)) picked = option.value;
    else if (picked.includes(option.value)) picked = picked.filter((one) => one !== option.value);
    else picked = [...picked, option.value];
  };
</script>

<Listbox {options} value={picked} {onpick} aria-label="Months" {...rest} />
<span data-testid="picked">{JSON.stringify(picked)}</span>
