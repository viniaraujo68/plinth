<script lang="ts">
  import DragHandle from "../components/DragHandle.svelte";
  import { sortable } from "./sortable.js";

  interface Props {
    disabled?: boolean;
    vertical?: boolean;
  }

  let { disabled = false, vertical = false }: Props = $props();

  let items = $state(["alpha", "beta", "gamma"]);

  const onmove = (from: number, to: number) => {
    const next = [...items];
    next.splice(to, 0, ...next.splice(from, 1));
    items = next;
  };
</script>

<ul
  style="display: flex; gap: 8px; padding: 0; list-style: none"
  style:flex-direction={vertical ? "column" : "row"}
  {@attach sortable({ onmove, disabled })}
>
  {#each items as item (item)}
    <li data-sortable-item style="display: flex; width: 120px; height: 40px; border: 1px solid">
      <DragHandle label="Move {item}" />
      <span>{item}</span>
    </li>
  {/each}
</ul>
<output data-testid="order">{items.join(",")}</output>
