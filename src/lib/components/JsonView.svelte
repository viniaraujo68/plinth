<script lang="ts">
  import JsonViewFrame, {
    type JsonViewProps,
    type JsonViewRevealTarget,
  } from "./JsonViewFrame.svelte";

  const props: JsonViewProps = $props();

  let scroller = $state<HTMLDivElement>();

  const reveal = ({ line }: JsonViewRevealTarget) => {
    const row = scroller?.querySelector<HTMLElement>(`[data-line="${line}"]`);
    const target = row?.querySelector<HTMLElement>("[data-active]") ?? row;
    target?.scrollIntoView({ block: "nearest", inline: "nearest" });
  };
</script>

<JsonViewFrame {...props} {reveal}>
  {#snippet viewport({ visible, line, rowId, widthCh })}
    <div bind:this={scroller} class="plinth-json-scroller">
      <div class="plinth-json-lines" style:min-width="max(100%, {widthCh}ch)">
        {#each visible as index (rowId(index))}
          {@render line(index)}
        {/each}
      </div>
    </div>
  {/snippet}
</JsonViewFrame>

<style>
  .plinth-json-scroller {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding-block: 0.25rem;
  }

  .plinth-json-lines {
    width: max-content;
    min-width: 100%;
    padding-inline-end: 1ch;
  }
</style>
