<script lang="ts" module>
  import type { Snippet } from "svelte";
  import type { ClassValue } from "svelte/elements";
  import type { JsonMatch, JsonViewLabels } from "./json-view.js";

  export interface JsonViewProps {
    value: unknown;
    class?: ClassValue;
    labels?: Partial<JsonViewLabels>;
    collapseDepth?: number;
    onselect?: (path: string, value: unknown) => void;
  }

  export interface JsonViewViewport {
    visible: readonly number[];
    line: Snippet<[number]>;
    rowId: (index: number) => string;
    rowHeight: number;
    widthCh: number;
  }

  export interface JsonViewRevealTarget {
    line: number;
    visibleIndex: number;
    match: JsonMatch;
    columnCh: number;
  }

  export const JSON_VIEW_ROW_HEIGHT = 22;
</script>

<script lang="ts">
  import { onDestroy, tick } from "svelte";
  import { SvelteMap } from "svelte/reactivity";
  import {
    ancestorLines,
    copyAllJson,
    copyJson,
    DEFAULT_JSON_VIEW_LABELS,
    flattenJson,
    isFoldable,
    matchColumnCh,
    matchSegments,
    maxLineWidthCh,
    searchJson,
    subtreeHasMatch,
    visibleLines,
    type JsonLine,
    type JsonPoint,
  } from "./json-view.js";

  type Props = JsonViewProps & {
    viewport: Snippet<[JsonViewViewport]>;
    reveal: (target: JsonViewRevealTarget) => void | Promise<void>;
  };

  let {
    value,
    class: className,
    labels,
    collapseDepth,
    onselect,
    viewport,
    reveal,
  }: Props = $props();

  const text = $derived({ ...DEFAULT_JSON_VIEW_LABELS, ...labels });
  const lines = $derived(flattenJson(value, { circular: text.circular }));

  let baseline = $state<"depth" | "expanded" | "collapsed">("depth");
  const overrides = new SvelteMap<string, boolean>();

  const foldedByDefault = (line: JsonLine): boolean => {
    if (baseline === "expanded") return false;
    if (baseline === "collapsed") return line.depth > 0;
    return collapseDepth !== undefined && line.depth >= collapseDepth;
  };

  const collapsed: ReadonlySet<string> = $derived(
    new Set(
      lines
        .filter(
          (line) => isFoldable(line) && (overrides.get(line.pointer) ?? foldedByDefault(line)),
        )
        .map((line) => line.pointer),
    ),
  );

  const visible = $derived(visibleLines(lines, collapsed));
  const widthCh = $derived(maxLineWidthCh(lines));
  const rowId = (index: number) => lines[index].id;

  const toggle = (line: JsonLine) => overrides.set(line.pointer, !collapsed.has(line.pointer));

  const expandAll = () => {
    overrides.clear();
    baseline = "expanded";
  };

  const collapseAll = () => {
    overrides.clear();
    baseline = "collapsed";
  };

  let root = $state<HTMLDivElement>();
  let searchField = $state<HTMLInputElement>();
  let searching = $state(false);
  let query = $state("");
  let current = $state(0);

  const matches = $derived(searchJson(lines, query));
  const hitLines = $derived(new Set(matches.map((match) => match.line)));
  const active = $derived(
    matches.length === 0 ? undefined : matches[Math.min(current, matches.length - 1)],
  );

  const show = async (position: number) => {
    if (matches.length === 0) return;
    current = (position + matches.length) % matches.length;
    const match = matches[current];
    for (const ancestor of ancestorLines(lines, match.line))
      overrides.set(lines[ancestor].pointer, false);
    await tick();
    await reveal({
      line: match.line,
      visibleIndex: visible.indexOf(match.line),
      match,
      columnCh: matchColumnCh(lines[match.line], match),
    });
  };

  const step = (direction: 1 | -1) =>
    show(Math.min(current, Math.max(matches.length - 1, 0)) + direction);

  const openSearch = async () => {
    searching = true;
    await tick();
    searchField?.focus();
    searchField?.select();
  };

  const closeSearch = () => {
    searching = false;
    query = "";
    current = 0;
    root?.focus();
  };

  const onQueryInput = (event: Event & { currentTarget: HTMLInputElement }) => {
    query = event.currentTarget.value;
    current = 0;
    void show(0);
  };

  const onQueryKeydown = (event: KeyboardEvent) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void step(event.shiftKey ? -1 : 1);
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeSearch();
    }
  };

  const onRootKeydown = (event: KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === "f") {
      event.preventDefault();
      void openSearch();
    }
  };

  let copied = $state(false);
  let copiedTimer: ReturnType<typeof setTimeout> | undefined;

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(copyAllJson(lines));
    } catch {
      return;
    }
    copied = true;
    clearTimeout(copiedTimer);
    copiedTimer = setTimeout(() => (copied = false), 1200);
  };

  onDestroy(() => clearTimeout(copiedTimer));

  const isBlank = (node: Text) => !/\S/.test(node.data);

  const columnIn = (row: HTMLElement, node: Node, offset: number): number => {
    const before = document.createRange();
    before.setStart(row, 0);
    before.setEnd(node, offset);
    const walker = document.createTreeWalker(row, NodeFilter.SHOW_TEXT);
    let column = 0;
    for (let next = walker.nextNode(); next !== null; next = walker.nextNode()) {
      const textNode = next as Text;
      if (textNode === node) return column + (isBlank(textNode) ? 0 : offset);
      if (before.comparePoint(textNode, textNode.length) !== 0) break;
      if (!isBlank(textNode)) column += textNode.length;
    }
    return column;
  };

  const lineOf = (row: HTMLElement) => Number(row.dataset.line);

  const nearestRow = (node: Node, offset: number): JsonPoint | null => {
    const rows = root?.querySelectorAll<HTMLElement>("[data-line]") ?? [];
    let last: HTMLElement | undefined;
    for (const row of rows) {
      const range = document.createRange();
      range.selectNode(row);
      if (range.comparePoint(node, offset) < 0) return { line: lineOf(row), column: 0 };
      last = row;
    }
    return last ? { line: lineOf(last), column: Number.POSITIVE_INFINITY } : null;
  };

  const pointAt = (node: Node, offset: number): JsonPoint | null => {
    if (!root?.contains(node)) return null;
    const element = node instanceof Element ? node : node.parentElement;
    const row = element?.closest<HTMLElement>("[data-line]");
    if (row && root.contains(row))
      return { line: lineOf(row), column: columnIn(row, node, offset) };
    return nearestRow(node, offset);
  };

  const onCopy = (event: ClipboardEvent) => {
    if (event.target instanceof HTMLInputElement) return;
    const selection = getSelection();
    if (!selection || selection.isCollapsed || !selection.anchorNode || !selection.focusNode)
      return;
    const from = pointAt(selection.anchorNode, selection.anchorOffset);
    const to = pointAt(selection.focusNode, selection.focusOffset);
    if (!from || !to || !event.clipboardData) return;
    event.clipboardData.setData("text/plain", copyJson(lines, collapsed, from, to));
    event.preventDefault();
  };

  const onRootClick = (event: MouseEvent) => {
    if (!onselect || !(event.target instanceof Element)) return;
    const part = event.target.closest("[data-part]");
    const row = part?.closest<HTMLElement>("[data-line]");
    if (!row) return;
    const selection = getSelection();
    if (selection && !selection.isCollapsed) return;
    const line = lines[lineOf(row)];
    onselect(line.pointer, line.source);
  };

  const isActive = (index: number, field: JsonMatch["field"], start: number) =>
    active !== undefined &&
    active.line === index &&
    active.field === field &&
    active.start === start;

  const closing = (line: JsonLine) => (line.text === "[" ? "]" : "}");

  const tone = (line: JsonLine) =>
    line.type === null ? "plinth-json-punct" : `plinth-json-${line.type}`;
</script>

{#snippet icon(paths: string[])}
  <svg
    class="size-3.5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    {#each paths as d (d)}
      <path {d} />
    {/each}
  </svg>
{/snippet}

{#snippet tokens(index: number, field: JsonMatch["field"], content: string, toneClass: string)}
  {#if hitLines.has(index)}
    {#each matchSegments(content, query) as segment (segment.start)}
      {#if segment.match}
        <mark
          class={["plinth-json-hit", toneClass]}
          data-part={field}
          data-active={isActive(index, field, segment.start) || undefined}>{segment.text}</mark
        >
      {:else}
        <span class={toneClass} data-part={field}>{segment.text}</span>
      {/if}
    {/each}
  {:else}
    <span class={toneClass} data-part={field}>{content}</span>
  {/if}
{/snippet}

{#snippet line(index: number)}
  {@const row = lines[index]}
  {@const foldable = isFoldable(row)}
  {@const folded = foldable && collapsed.has(row.pointer)}
  <div
    class={[
      "plinth-json-row",
      hitLines.has(index) && "plinth-json-row-hit",
      folded &&
        query !== "" &&
        subtreeHasMatch(matches, index, row.end) &&
        "plinth-json-row-hidden-hit",
      onselect && "plinth-json-selectable",
    ]}
    style:height="{JSON_VIEW_ROW_HEIGHT}px"
    style:padding-inline-start="{row.depth * 2}ch"
    data-line={index}
  >
    {#if foldable}
      <button
        type="button"
        class="plinth-json-toggle"
        aria-expanded={!folded}
        aria-label={folded ? text.expand : text.collapse}
        onclick={() => toggle(row)}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg
        >
      </button>
    {:else}
      <span class="plinth-json-gutter"></span>
    {/if}
    {#if row.name !== null}
      {@render tokens(index, "name", row.name, "plinth-json-name")}
      <span class="plinth-json-punct">:&nbsp;</span>
    {/if}
    {#if row.kind === "value"}
      {@render tokens(index, "value", row.text, tone(row))}
    {:else if row.kind === "open"}
      <span class="plinth-json-punct" data-part="value">{row.text}</span>
      {#if row.size === 0}
        <span class="plinth-json-punct" data-part="value">{closing(row)}</span>
      {:else if folded}
        <button type="button" class="plinth-json-fold" tabindex="-1" onclick={() => toggle(row)}
          >…{closing(row)}</button
        >
      {/if}
    {:else}
      <span class="plinth-json-punct">{row.text}</span>
    {/if}
    {#if row.comma && (row.kind !== "open" || folded || row.size === 0)}
      <span class="plinth-json-punct">,</span>
    {/if}
    {#if folded}
      <span class="plinth-json-count" title={text.items(row.size)}>&nbsp;{row.size}</span>
    {/if}
  </div>
{/snippet}

<div
  bind:this={root}
  class={["plinth-json-view rounded-box border border-base-content/10 bg-base-100", className]}
  role="region"
  aria-label={text.region}
  tabindex="-1"
  onkeydown={onRootKeydown}
  oncopy={onCopy}
  onclick={onRootClick}
>
  <div class="plinth-json-toolbar">
    {#if searching}
      <div class="plinth-json-search">
        <input
          bind:this={searchField}
          type="search"
          class="input w-48 min-w-0 input-xs"
          placeholder={text.searchField}
          aria-label={text.searchField}
          value={query}
          oninput={onQueryInput}
          onkeydown={onQueryKeydown}
        />
        {#if query !== ""}
          <span class="plinth-json-count-label" role="status">
            {matches.length === 0
              ? text.noMatches
              : text.matchCount(Math.min(current, matches.length - 1) + 1, matches.length)}
          </span>
        {/if}
        <button
          type="button"
          class="btn btn-square btn-ghost btn-xs"
          aria-label={text.previousMatch}
          title={text.previousMatch}
          disabled={matches.length === 0}
          onclick={() => step(-1)}
        >
          {@render icon(["m6 15 6-6 6 6"])}
        </button>
        <button
          type="button"
          class="btn btn-square btn-ghost btn-xs"
          aria-label={text.nextMatch}
          title={text.nextMatch}
          disabled={matches.length === 0}
          onclick={() => step(1)}
        >
          {@render icon(["m6 9 6 6 6-6"])}
        </button>
        <button
          type="button"
          class="btn btn-square btn-ghost btn-xs"
          aria-label={text.closeSearch}
          title={text.closeSearch}
          onclick={closeSearch}
        >
          {@render icon(["M18 6 6 18", "m6 6 12 12"])}
        </button>
      </div>
    {:else}
      <button
        type="button"
        class="btn btn-square btn-ghost btn-xs"
        aria-label={text.search}
        title={text.search}
        onclick={openSearch}
      >
        {@render icon(["m20 20-4.2-4.2", "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14"])}
      </button>
    {/if}
    <div class="plinth-json-actions">
      <button
        type="button"
        class="btn btn-square btn-ghost btn-xs"
        aria-label={text.expandAll}
        title={text.expandAll}
        disabled={lines.length === 0}
        onclick={expandAll}
      >
        {@render icon(["m7 15 5 5 5-5", "m7 9 5-5 5 5"])}
      </button>
      <button
        type="button"
        class="btn btn-square btn-ghost btn-xs"
        aria-label={text.collapseAll}
        title={text.collapseAll}
        disabled={lines.length === 0}
        onclick={collapseAll}
      >
        {@render icon(["m7 20 5-5 5 5", "m7 4 5 5 5-5"])}
      </button>
      <button
        type="button"
        class="btn btn-square btn-ghost btn-xs"
        aria-label={copied ? text.copied : text.copy}
        title={copied ? text.copied : text.copy}
        disabled={lines.length === 0}
        onclick={copyAll}
      >
        {#if copied}
          {@render icon(["m4 12.5 5 5L20 6.5"])}
        {:else}
          {@render icon([
            "M11 9h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2z",
            "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1",
          ])}
        {/if}
      </button>
    </div>
  </div>
  {#if lines.length === 0}
    <p class="plinth-json-empty">{text.empty}</p>
  {:else}
    {@render viewport({ visible, line, rowId, rowHeight: JSON_VIEW_ROW_HEIGHT, widthCh })}
  {/if}
</div>

<style>
  .plinth-json-view {
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
    font-family: var(--font-mono, ui-monospace, monospace);
    font-size: 0.75rem;
  }

  .plinth-json-view:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  .plinth-json-toolbar {
    display: flex;
    flex: none;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.375rem;
    border-bottom: 1px solid color-mix(in oklch, var(--color-base-content) 10%, transparent);
    font-family: var(--font-sans, inherit);
  }

  .plinth-json-search {
    display: flex;
    flex: 1;
    align-items: center;
    gap: 0.25rem;
    min-width: 0;
  }

  .plinth-json-search input::-webkit-search-cancel-button {
    appearance: none;
    display: none;
  }

  .plinth-json-count-label {
    flex: none;
    padding-inline: 0.25rem;
    color: color-mix(in oklch, var(--color-base-content) 60%, transparent);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .plinth-json-actions {
    display: flex;
    align-items: center;
    gap: 0.125rem;
    margin-inline-start: auto;
  }

  .plinth-json-empty {
    padding: 0.75rem;
    color: color-mix(in oklch, var(--color-base-content) 55%, transparent);
    font-family: var(--font-sans, inherit);
  }

  .plinth-json-row {
    display: flex;
    align-items: center;
    white-space: pre;
  }

  .plinth-json-row > :global(*) {
    flex: none;
  }

  .plinth-json-row-hit {
    background: color-mix(in oklch, var(--color-warning) 8%, transparent);
  }

  .plinth-json-row-hidden-hit .plinth-json-fold {
    background: color-mix(in oklch, var(--color-warning) 35%, transparent);
  }

  .plinth-json-gutter,
  .plinth-json-toggle {
    width: 2ch;
    height: 100%;
  }

  .plinth-json-toggle {
    display: grid;
    place-items: center;
    padding: 0;
    color: color-mix(in oklch, var(--color-base-content) 45%, transparent);
    cursor: pointer;
    border-radius: var(--radius-field, 0.25rem);
  }

  .plinth-json-toggle:hover {
    color: var(--color-base-content);
  }

  .plinth-json-toggle[aria-expanded="true"] :global(svg) {
    transform: rotate(90deg);
  }

  .plinth-json-toggle :global(svg) {
    width: 1.1em;
    height: 1.1em;
    transition: transform 120ms ease;
  }

  .plinth-json-fold {
    padding: 0;
    border-radius: 0.25rem;
    color: color-mix(in oklch, var(--color-base-content) 55%, transparent);
    background: color-mix(in oklch, var(--color-base-content) 7%, transparent);
    font: inherit;
    cursor: pointer;
  }

  .plinth-json-fold:hover {
    color: var(--color-base-content);
  }

  .plinth-json-count {
    color: color-mix(in oklch, var(--color-base-content) 40%, transparent);
  }

  .plinth-json-punct {
    color: color-mix(in oklch, var(--color-base-content) 50%, transparent);
  }

  .plinth-json-name {
    color: var(--color-secondary);
  }

  .plinth-json-string {
    color: var(--color-success);
  }

  .plinth-json-number {
    color: var(--color-info);
  }

  .plinth-json-boolean {
    color: var(--color-warning);
  }

  .plinth-json-null {
    color: color-mix(in oklch, var(--color-base-content) 55%, transparent);
    font-style: italic;
  }

  .plinth-json-circular {
    color: var(--color-error);
    font-style: italic;
  }

  .plinth-json-selectable [data-part] {
    cursor: pointer;
  }

  .plinth-json-selectable [data-part]:hover {
    text-decoration: underline;
    text-decoration-color: color-mix(in oklch, currentColor 50%, transparent);
  }

  .plinth-json-hit {
    border-radius: 0.125rem;
    background: color-mix(in oklch, var(--color-warning) 30%, transparent);
  }

  .plinth-json-hit[data-active] {
    background: var(--color-warning);
    color: var(--color-warning-content);
  }
</style>
