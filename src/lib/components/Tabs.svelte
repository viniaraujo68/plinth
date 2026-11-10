<script lang="ts" generics="Id extends string">
  import { tick } from "svelte";
  import type { ClassValue } from "svelte/elements";
  import type { TabItem } from "./tabs.js";

  interface Props {
    /** The tabs, in the order they are shown. `id` is the value, so it has to be unique. */
    tabs: readonly TabItem<Id>[];
    /** The selected tab's `id`. Bindable, and also reported through {@link Props.onchange}. */
    value: Id;
    /** Accessible name of the tab list. A prop because the library ships no translations. */
    label: string;
    /**
     * The `id` of the panel the tabs drive. One panel whose content changes with the selection,
     * which is how a page with a tab per section is usually built; leave it out when there is no
     * single panel to point at.
     */
    controls?: string;
    /**
     * Prefix of each tab's element id: the tab for `ranking` is `${idPrefix}-ranking`, which is
     * what the panel's `aria-labelledby` points at. Unique per instance by default; pass one when
     * the panel has to name its tab.
     */
    idPrefix?: string;
    /** Centres the tabs while they fit. Once they overflow they scroll from the first one. */
    center?: boolean;
    /** Classes for the wrapper — spacing, mostly. */
    class?: ClassValue;
    /** Called with the new `id` only when it actually changes; re-picking the current tab is silent. */
    onchange?: (id: Id) => void;
  }

  const uid = $props.id();

  let {
    tabs,
    value = $bindable(),
    label,
    controls,
    idPrefix = uid,
    center = false,
    class: className,
    onchange,
  }: Props = $props();

  const tabId = (id: Id) => `${idPrefix}-${id}`;

  const select = (id: Id) => {
    if (id === value) return;
    value = id;
    onchange?.(id);
  };

  const STEPS: Record<string, (from: number, count: number) => number> = {
    ArrowRight: (from, count) => (from + 1) % count,
    ArrowLeft: (from, count) => (from - 1 + count) % count,
    Home: () => 0,
    End: (_, count) => count - 1,
  };

  const onkeydown = async (event: KeyboardEvent) => {
    const step = STEPS[event.key];
    if (!step || tabs.length === 0) return;
    event.preventDefault();
    const from = Math.max(
      tabs.findIndex((tab) => tab.id === value),
      0,
    );
    const id = tabs[step(from, tabs.length)].id;
    select(id);
    // Selection follows focus, and a caller that keeps the selection in the URL navigates on
    // `onchange` — which leaves the focus wherever it was. Walk it to the tab that is now selected.
    await tick();
    document.getElementById(tabId(id))?.focus();
  };

  let strip = $state<HTMLElement>();
  let overflowing = $state(false);

  const measure = () => {
    if (!strip) return;
    overflowing = strip.scrollWidth - strip.clientWidth - strip.scrollLeft > 4;
  };

  $effect(() => {
    // Re-measured whenever the labels change — a language switch can push the last tab out.
    void tabs.map((tab) => tab.label);
    measure();
  });
</script>

<!--
@component
A row of tabs that switches what one panel shows: a real `tablist` with a roving tabindex, so Tab
lands on the selected tab and the arrow keys, Home and End move the selection along the row. The
selection follows focus, the pattern for panels that are cheap to show.

On a narrow screen the row scrolls sideways instead of wrapping, and while tabs are hidden past the
right edge it fades out there — at phone width, the fade is the only hint that a fifth tab exists.

The selection is the caller's: bind `value`, or pass it in and act on `onchange` — a page that
keeps its tab in the URL navigates there, and the tab moves when the URL does.

```svelte
<Tabs
  bind:value={tab}
  label="Sections"
  controls="panel"
  idPrefix="tab"
  tabs={[
    { id: "overview", label: "Overview" },
    { id: "settings", label: "Settings" },
  ]}
/>
<div id="panel" role="tabpanel" aria-labelledby="tab-{tab}">…</div>
```
-->
<div class={["plinth-tabs", className]} class:fade={overflowing}>
  <div
    class="plinth-tabs-strip tabs tabs-border"
    class:center
    role="tablist"
    aria-label={label}
    bind:this={strip}
    onscroll={measure}
  >
    {#each tabs as tab (tab.id)}
      <button
        type="button"
        class="tab"
        role="tab"
        id={tabId(tab.id)}
        aria-selected={tab.id === value}
        aria-controls={controls}
        tabindex={tab.id === value ? 0 : -1}
        onclick={() => select(tab.id)}
        {onkeydown}
      >
        {tab.label}
      </button>
    {/each}
  </div>
</div>

<svelte:window onresize={measure} />

<style>
  .plinth-tabs {
    position: relative;
  }

  /* `display` stated here rather than left to daisyUI's `.tabs`: the one-row layout is what the
     overflow and the fade are built on, so it cannot depend on a class the app might restyle. */
  .plinth-tabs-strip {
    display: flex;
    flex-wrap: nowrap;
    overflow-x: auto;
    border-bottom: 1px solid color-mix(in oklch, var(--color-base-content) 12%, transparent);
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }

  .plinth-tabs-strip::-webkit-scrollbar {
    display: none;
  }

  /* `safe` keeps the first tab reachable once the row overflows; plain `center` would push it off
     the left edge, where no scroll can reach. The first declaration is the fallback. */
  .plinth-tabs-strip.center {
    justify-content: center;
    justify-content: safe center;
  }

  /* A mask rather than a gradient laid over the strip, so it fades into whatever surface the tabs
     sit on. Only while something is actually hidden past the edge. */
  .plinth-tabs.fade .plinth-tabs-strip {
    -webkit-mask-image: linear-gradient(to right, #000 calc(100% - 2.75rem), transparent);
    mask-image: linear-gradient(to right, #000 calc(100% - 2.75rem), transparent);
  }

  .tab {
    flex: 0 0 auto;
    min-height: 2.75rem;
    white-space: nowrap;
  }

  /* Inside a horizontal scroller an outset ring is clipped; drawn inside, it shows whole. */
  .tab:focus-visible {
    outline-offset: -2px;
  }

  .tab[aria-selected="true"] {
    color: var(--color-base-content);
    font-weight: 600;
  }

  .tab:not([aria-selected="true"]) {
    color: color-mix(in oklch, var(--color-base-content) 65%, transparent);
  }

  .tab:not([aria-selected="true"]):hover {
    color: var(--color-base-content);
  }
</style>
