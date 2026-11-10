<script lang="ts">
  import JsonView from "./JsonView.svelte";
  import type { JsonViewLabels } from "./json-view.js";

  interface Props {
    value: unknown;
    collapseDepth?: number;
    labels?: Partial<JsonViewLabels>;
    onselect?: (path: string, value: unknown) => void;
  }

  let { value, collapseDepth, labels, onselect }: Props = $props();
</script>

<button type="button">Outside</button>
<div style="display: flex; flex-direction: column; height: 16rem; width: 24rem">
  <JsonView {value} {collapseDepth} {labels} {onselect} />
</div>
