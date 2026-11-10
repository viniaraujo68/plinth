<script lang="ts">
  import VirtualList from "../virtual/VirtualList.svelte";
  import JsonViewFrame, {
    type JsonViewProps,
    type JsonViewRevealTarget,
  } from "./JsonViewFrame.svelte";

  const props: JsonViewProps = $props();

  let list = $state<ReturnType<typeof VirtualList>>();
  let host = $state<HTMLDivElement>();
  let probe = $state<HTMLSpanElement>();

  const reveal = ({ visibleIndex, columnCh }: JsonViewRevealTarget) => {
    list?.scrollToIndex(visibleIndex, "center");
    const scroller = host?.querySelector<HTMLElement>(".plinth-virtual");
    const ch = probe?.getBoundingClientRect().width ?? 0;
    if (!scroller || ch === 0) return;
    const target = columnCh * ch;
    const start = scroller.scrollLeft;
    const end = start + scroller.clientWidth;
    if (target < start + ch * 4 || target > end - ch * 4)
      scroller.scrollLeft = Math.max(0, target - scroller.clientWidth / 2);
  };
</script>

<JsonViewFrame {...props} {reveal}>
  {#snippet viewport({ visible, line, rowId, rowHeight, widthCh })}
    <div bind:this={host} class="plinth-json-virtual">
      <span bind:this={probe} class="plinth-json-probe" aria-hidden="true"></span>
      <VirtualList
        bind:this={list}
        class="plinth-json-virtual-list"
        count={visible.length}
        itemSize={rowHeight}
        getItemKey={(index) => rowId(visible[index])}
        crossSize="max(100%, {widthCh + 1}ch)"
      >
        {#snippet item(index)}
          {@render line(visible[index])}
        {/snippet}
      </VirtualList>
    </div>
  {/snippet}
</JsonViewFrame>

<style>
  .plinth-json-virtual {
    position: relative;
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
  }

  .plinth-json-probe {
    position: absolute;
    width: 1ch;
    height: 0;
    visibility: hidden;
  }

  :global(.plinth-json-virtual-list) {
    flex: 1;
    min-height: 0;
  }
</style>
