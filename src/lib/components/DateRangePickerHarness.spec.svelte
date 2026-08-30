<script lang="ts">
  import DateRangePicker from "./DateRangePicker.svelte";
  import type { DateRange, DateRangePreset } from "./date-range.js";

  let {
    presets,
    preset,
    reAnchorMs,
    value = $bindable(),
  }: {
    presets?: readonly DateRangePreset[];
    preset?: string;
    reAnchorMs?: number;
    value?: DateRange;
  } = $props();
</script>

<!--
@component
Test-only host for `DateRangePicker`. It exists to prove the two-way binding: `bind:value` cannot
be expressed by a spec that mounts the component directly, and the printed pair is what a spec
reads back. Named `*.spec.svelte` so packaging drops it.
-->

<DateRangePicker bind:value {presets} {preset} {reAnchorMs} />

<output data-testid="bound">{value ? `${value.from}/${value.to}` : "none"}</output>
