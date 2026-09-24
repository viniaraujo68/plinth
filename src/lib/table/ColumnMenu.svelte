<script lang="ts" generics="T">
  import Dropdown from "../components/Dropdown.svelte";
  import {
    canHideColumn,
    isColumnHideable,
    isColumnStateEmpty,
    isColumnVisible,
    moveColumn,
    orderColumns,
    setColumnVisible,
  } from "./columns.js";
  import type { Column, ColumnState } from "./types.js";

  interface Props {
    columns: readonly Column<T>[];
    layout: ColumnState | undefined;
    onchange: (layout: ColumnState | undefined) => void;
    /** The trigger's text, and the menu's accessible name. */
    label: string;
    resetLabel: string;
    moveLabel: (column: Column<T>, direction: "up" | "down") => string;
  }

  let { columns, layout, onchange, label, resetLabel, moveLabel }: Props = $props();

  const ordered = $derived(orderColumns(columns, layout));

  let dragging = $state<string | null>(null);
  let target = $state<{ key: string; after: boolean } | null>(null);

  const move = (key: string, to: number) => onchange(moveColumn(columns, layout, key, to));

  const toggle = (column: Column<T>, visible: boolean) =>
    onchange(setColumnVisible(layout, column.key, visible));

  const onDragStart = (event: DragEvent, key: string) => {
    dragging = key;
    // Firefox starts no drag at all without data on the transfer, whatever the data is.
    event.dataTransfer?.setData("text/plain", key);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (event: DragEvent, key: string) => {
    if (dragging === null) return;
    event.preventDefault();
    const row = event.currentTarget as HTMLElement;
    const box = row.getBoundingClientRect();
    target = { key, after: event.clientY > box.top + box.height / 2 };
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    if (dragging !== null && target !== null && target.key !== dragging) {
      const keys = ordered.map((column) => column.key);
      const from = keys.indexOf(dragging);
      let to = keys.indexOf(target.key) + (target.after ? 1 : 0);
      // The dragged row leaves the list before it is put back, so every slot past it moves up one.
      if (from < to) to -= 1;
      move(dragging, to);
    }
    onDragEnd();
  };

  const onDragEnd = () => {
    dragging = null;
    target = null;
  };
</script>

<!--
@component
Internal to `DataTable`: the menu that shows, hides and reorders its columns. It is a `Dropdown`,
so Escape, a click outside and the trigger itself all close it without a listener of this file's
own.

Reordering is offered twice. Dragging a row is the quick way with a mouse, and it is native HTML
drag and drop rather than pointer bookkeeping, so the browser draws the ghost and scrolls the list.
The two arrow buttons on every row do the same one step at a time, and they are the only way to
reorder from a keyboard or a screen reader — drag and drop has no keyboard story of its own.

A column that is not hideable is listed without a checkbox, so the reader still sees it and can
still move it; the last visible column's checkbox is disabled rather than hidden, for the same
reason.
-->

<Dropdown
  class="plinth-columns-trigger btn btn-ghost btn-sm"
  panelClass="plinth-columns-panel rounded-box border border-base-content/10 bg-base-100 p-2 shadow-lg"
  aria-label={label}
>
  {label}
  <span class="plinth-columns-caret" aria-hidden="true">▾</span>
  {#snippet content()}
    <ul class="plinth-columns-list" aria-label={label}>
      {#each ordered as column, index (column.key)}
        {@const visible = isColumnVisible(column, layout)}
        <li
          class="plinth-columns-row"
          class:plinth-dragging={dragging === column.key}
          class:plinth-drop-before={target?.key === column.key && !target.after}
          class:plinth-drop-after={target?.key === column.key && target.after}
          draggable="true"
          ondragstart={(event) => onDragStart(event, column.key)}
          ondragover={(event) => onDragOver(event, column.key)}
          ondrop={onDrop}
          ondragend={onDragEnd}
        >
          <span class="plinth-columns-grip" aria-hidden="true">⠿</span>
          {#if isColumnHideable(column)}
            <label class="plinth-columns-label">
              <input
                type="checkbox"
                class="checkbox checkbox-xs"
                checked={visible}
                disabled={visible && !canHideColumn(columns, layout, column.key)}
                onchange={(event) => toggle(column, event.currentTarget.checked)}
              />
              {column.label}
            </label>
          {:else}
            <span class="plinth-columns-label plinth-columns-locked">{column.label}</span>
          {/if}
          <button
            type="button"
            class="plinth-columns-move"
            aria-label={moveLabel(column, "up")}
            disabled={index === 0}
            onclick={() => move(column.key, index - 1)}
          >
            ↑
          </button>
          <button
            type="button"
            class="plinth-columns-move"
            aria-label={moveLabel(column, "down")}
            disabled={index === ordered.length - 1}
            onclick={() => move(column.key, index + 1)}
          >
            ↓
          </button>
        </li>
      {/each}
    </ul>
    <button
      type="button"
      class="plinth-columns-reset btn btn-ghost btn-xs"
      disabled={isColumnStateEmpty(layout)}
      onclick={() => onchange(undefined)}
    >
      {resetLabel}
    </button>
  {/snippet}
</Dropdown>

<style>
  .plinth-columns-caret {
    font-size: 0.7em;
    opacity: 0.6;
  }

  :global(.plinth-columns-panel) {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    min-width: 14rem;
    max-height: 22rem;
    margin: 0.25rem 0 0;
    overflow-y: auto;
  }

  .plinth-columns-list {
    display: flex;
    flex-direction: column;
  }

  .plinth-columns-row {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto auto;
    align-items: center;
    gap: 0.375rem;
    padding: 0.25rem 0.375rem;
    border-radius: var(--radius-field, 0.5rem);
    /* Borders on both edges from the start, so showing the drop line does not shift the rows. */
    border-top: 2px solid transparent;
    border-bottom: 2px solid transparent;
  }

  .plinth-columns-row:hover {
    background: color-mix(in oklch, var(--color-base-content) 5%, transparent);
  }

  .plinth-dragging {
    opacity: 0.4;
  }

  .plinth-drop-before {
    border-top-color: var(--color-primary);
  }

  .plinth-drop-after {
    border-bottom-color: var(--color-primary);
  }

  .plinth-columns-grip {
    cursor: grab;
    color: color-mix(in oklch, var(--color-base-content) 40%, transparent);
    user-select: none;
  }

  .plinth-columns-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
    font-size: 0.875rem;
    cursor: pointer;
    overflow-wrap: anywhere;
  }

  .plinth-columns-locked {
    padding-left: calc(1rem + 0.5rem);
    cursor: default;
    color: color-mix(in oklch, var(--color-base-content) 65%, transparent);
  }

  .plinth-columns-move {
    display: grid;
    place-items: center;
    width: 1.5rem;
    height: 1.5rem;
    border-radius: var(--radius-field, 0.5rem);
    color: color-mix(in oklch, var(--color-base-content) 60%, transparent);
    cursor: pointer;
  }

  .plinth-columns-move:hover:not(:disabled) {
    background: color-mix(in oklch, var(--color-base-content) 10%, transparent);
    color: var(--color-base-content);
  }

  .plinth-columns-move:disabled {
    opacity: 0.3;
    cursor: default;
  }

  .plinth-columns-reset {
    align-self: flex-end;
  }
</style>
