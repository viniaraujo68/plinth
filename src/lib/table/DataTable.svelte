<script lang="ts" generics="T">
  import type { Snippet } from "svelte";
  import type { ClassValue } from "svelte/elements";
  import ColumnMenu from "./ColumnMenu.svelte";
  import {
    columnWidth,
    isColumnResizable,
    minWidthOf,
    readColumnState,
    setColumnWidth,
    visibleColumns,
    writeColumnState,
  } from "./columns.js";
  import { ariaSort, cellText, nextSort, sortRows } from "./sort.js";
  import type { Column, ColumnState, SortState } from "./types.js";

  interface Props {
    rows: readonly T[];
    columns: Column<T>[];
    /** Identity of a row, so re-sorting moves the existing markup instead of rebuilding it. */
    rowKey: (row: T) => string | number;
    /**
     * The order the table is in. Bindable and defaulted, so it is uncontrolled when passed as a
     * plain value — an initial sort — and controlled the moment a caller writes `bind:sort`.
     */
    sort?: SortState;
    /** Collation locale for string columns. Defaults to the runtime's. */
    locale?: string;
    onRowClick?: (row: T) => void;
    /** Shown in place of the rows when there are none. */
    empty?: Snippet;
    /**
     * Replaces the label/value pairs in card form, for rows that read better as a shape than as a
     * list. Never rendered in table form, so a cell snippet and this one do not compete.
     *
     * The second argument is the row's 0-based position in the order currently rendered, so a
     * rank or a medal can follow the sort without the caller re-deriving it. A snippet declared
     * with one parameter stays assignable and simply ignores it.
     */
    card?: Snippet<[T, number]>;
    /** Accessible name of the table. A prop because the library ships no translations. */
    label?: string;
    /**
     * Accessible name for a sortable header's control, given the column — `Sort by Elevation`
     * rather than `Elevation`. Absent by default, which leaves the button named by its own label.
     * A function, and not a string, because the wording is per column and the library ships no
     * translations.
     */
    sortLabel?: (column: Column<T>) => string;
    /**
     * Goes on the `<table>` itself, next to daisyUI's `table`. Density and zebra striping are
     * `table-sm` and `table-zebra` — classes the framework already has, so they are not re-exposed
     * here as props that could only spell them differently.
     */
    class?: ClassValue;
    /**
     * Rendered in a bar above the table, at its start — the place for the controls that change
     * what the table shows, so they sit with it instead of floating somewhere above it. The
     * columns menu, when there is one, takes the other end of the same bar.
     */
    toolbar?: Snippet;
    /**
     * How the reader arranged the columns: order, visibility and dragged widths. Bindable and
     * defaulted like `sort`: leave it out and the table keeps the arrangement to itself, bind it
     * to read it back or to share it between tables. `undefined` means "as the columns declare".
     */
    columnState?: ColumnState;
    /**
     * Remembers `columnState` in `localStorage` under this key, so the reader's arrangement
     * survives a reload. The stored state is read after the first render, not during it: a table
     * rendered on the server has no storage to read, and changing the markup before hydration
     * finished would tear it — so a stored layout lands one frame late instead. A stored state
     * takes precedence over the `columnState` a parent passes in, since it is the reader's own
     * later choice.
     */
    storageKey?: string | null;
    /**
     * Lets the reader drag a header's right edge to resize its column, double-click the edge to
     * hand the column back to its content, or focus the edge and use the arrow keys. Columns opt
     * out one by one with `resizable: false`; widths only apply to the table form, never to cards.
     */
    resizable?: boolean;
    /**
     * Turns on the columns menu, as the text of its trigger. The menu shows and hides columns and
     * puts them in another order; a prop rather than a default because the library ships no
     * translations, and the menu has nothing to be called without it.
     */
    columnsLabel?: string;
    /** The menu's action that forgets the reader's arrangement, widths included. */
    resetColumnsLabel?: string;
    /** Names the menu's step buttons for a screen reader — "Move Year up" rather than "↑". */
    moveColumnLabel?: (column: Column<T>, direction: "up" | "down") => string;
    /** Names a column's resize handle for a screen reader. */
    resizeLabel?: (column: Column<T>) => string;
  }

  let {
    rows,
    columns,
    rowKey,
    sort = $bindable(),
    locale,
    onRowClick,
    empty,
    card,
    label,
    sortLabel,
    class: className,
    toolbar,
    columnState = $bindable(),
    storageKey = null,
    resizable = false,
    columnsLabel,
    resetColumnsLabel = "Reset columns",
    moveColumnLabel = (column, direction) => `Move ${column.label} ${direction}`,
    resizeLabel = (column) => `Resize ${column.label}`,
  }: Props = $props();

  const sorted = $derived.by(() => {
    const column = columns.find((candidate) => candidate.key === sort?.key);
    if (!sort || !column) return rows;
    return sortRows(rows, column, sort.direction, locale);
  });

  const shown = $derived(visibleColumns(columns, columnState));
  const sized = $derived(shown.some((column) => columnWidth(column, columnState) !== undefined));
  const hasBar = $derived(toolbar !== undefined || columnsLabel !== undefined);

  let restored = $state(false);

  $effect(() => {
    if (!storageKey) return;
    const stored = readColumnState(storageKey);
    if (stored) columnState = stored;
    restored = true;
  });

  $effect(() => {
    if (!storageKey || !restored) return;
    writeColumnState(storageKey, columnState);
  });

  /** The box a width applies to: the header's content, not its padding. */
  const contentWidth = (header: HTMLElement) => {
    const style = getComputedStyle(header);
    return header.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
  };

  const resizeTo = (column: Column<T>, width: number | null) => {
    columnState = setColumnWidth(
      columnState,
      column.key,
      width === null ? null : Math.max(width, minWidthOf(column)),
    );
  };

  /* Pointer capture keeps the moves coming to the handle while the pointer wanders over other
     headers, off the table, or outside the window; without it a fast drag drops the column the
     moment the pointer overtakes the edge. */
  const startResize = (event: PointerEvent, column: Column<T>) => {
    if (event.button !== 0) return;
    const handle = event.currentTarget as HTMLElement;
    const header = handle.closest("th");
    if (!header) return;
    event.preventDefault();

    const origin = event.clientX;
    const start = contentWidth(header);
    try {
      handle.setPointerCapture(event.pointerId);
    } catch {
      // A pointer the browser no longer tracks cannot be captured; the drag still works for as
      // long as the pointer stays over the handle.
    }

    const onMove = (move: PointerEvent) => resizeTo(column, start + move.clientX - origin);
    const onEnd = () => {
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", onEnd);
      handle.removeEventListener("pointercancel", onEnd);
    };
    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onEnd);
    handle.addEventListener("pointercancel", onEnd);
  };

  const RESIZE_STEP = 16;
  const RESIZE_STEP_LARGE = 64;

  const onResizeKey = (event: KeyboardEvent, column: Column<T>) => {
    const header = (event.currentTarget as HTMLElement).closest("th");
    if (!header) return;
    const step = event.shiftKey ? RESIZE_STEP_LARGE : RESIZE_STEP;
    const current = columnWidth(column, columnState) ?? contentWidth(header);

    if (event.key === "ArrowLeft") resizeTo(column, current - step);
    else if (event.key === "ArrowRight") resizeTo(column, current + step);
    else if (event.key === "Home") resizeTo(column, null);
    else return;
    event.preventDefault();
  };

  const isSortable = (column: Column<T>) => column.sortable !== false;
  const alignOf = (column: Column<T>) => column.align ?? (column.numeric ? "right" : "left");

  const activate = (row: T) => onRowClick?.(row);

  const onRowKey = (event: KeyboardEvent, row: T) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    activate(row);
  };
</script>

<!--
@component
A sortable table that becomes a list of cards on a narrow screen. Columns are described once, as
data; the rows are ordered in the browser.

Which form renders is decided by a **container query on the table's own wrapper**, not by
JavaScript. There is no resize listener and no `matchMedia`, so nothing flashes the wrong layout on
the first paint — and because the wrapper is its own container, dropping the table into a narrow
box renders its card form on a desktop, which is how the showcase shows both at once.

It is one DOM either way. In card form the header row collapses into a strip of sort pills, each
cell prints its column's label beside its value, and no row is duplicated to be hidden.

Sorting is client-side and stable, so a second sort reads as a tiebreak on the first. Missing
values sort last in both directions. `sort` is bindable: pass a value for an initial order, bind
for a shared or persisted one.

A `cell` or `card` snippet is rendered with the row and, second, the row's 0-based position in the
order on screen — the rank column that has to follow the sort is the reason it is there, and
re-running `sortRows` outside the table is what it replaces. Snippets that take only the row keep
working unchanged.

`sortLabel` names the sort control for a screen reader, from the column — "Sort by Elevation"
rather than "Elevation" — on the header buttons and on the card-form pills alike, since they are
the same element. Left out, the button is named by its own label.

The reader can arrange the columns, when the table asks for it. `columnsLabel` adds a menu that
shows, hides and reorders them; `resizable` adds a drag handle to every header's edge; `storageKey`
remembers both across reloads. All three are off by default, and a column says whether it takes
part — `hideable`, `hiddenByDefault`, `resizable`, `minWidth`. The arrangement is one bindable
`columnState`, stored as overrides of what the columns declare, so adding a column in a later
release neither loses a stored layout nor ends up somewhere nobody put it. Sorting by a column the
reader hid keeps working: the order is about the rows, not about what is on screen.

It stays short of a data grid — no filtering, no virtualization, no saved views. A table that
needs those needs a different component.

```svelte
<DataTable
  {rows}
  columns={[
    { key: "name", label: "Name" },
    { key: "size", label: "Size", numeric: true },
  ]}
  rowKey={(row) => row.id}
  sort={{ key: "size", direction: "desc" }}
/>
```
-->

{#snippet headerBody(column: Column<T>)}
  {#if isSortable(column)}
    <button
      type="button"
      class="plinth-sort"
      aria-label={sortLabel?.(column)}
      onclick={() => (sort = nextSort(sort, column))}
    >
      {column.label}
      <!-- The glyph is decoration; `aria-sort` on the header is what carries the state. -->
      <span class="plinth-arrow" aria-hidden="true">
        {#if sort?.key === column.key}{sort.direction === "asc" ? "↑" : "↓"}{/if}
      </span>
    </button>
  {:else}
    {column.label}
  {/if}
{/snippet}

{#snippet cellBody(column: Column<T>, row: T, index: number)}
  {#if column.cell}{@render column.cell(row, index)}{:else}{cellText(column, row)}{/if}
{/snippet}

{#if hasBar}
  <div class="plinth-table-bar">
    {#if toolbar}
      <div class="plinth-table-toolbar">{@render toolbar()}</div>
    {/if}
    {#if columnsLabel !== undefined}
      <div class="plinth-table-columns">
        <ColumnMenu
          {columns}
          layout={columnState}
          onchange={(next) => (columnState = next)}
          label={columnsLabel}
          resetLabel={resetColumnsLabel}
          moveLabel={moveColumnLabel}
        />
      </div>
    {/if}
  </div>
{/if}

<div class="plinth-table-wrap">
  <table
    class={["plinth-table table", className]}
    class:has-card={card !== undefined}
    class:plinth-sized={sized}
    aria-label={label}
  >
    <thead>
      <tr>
        {#each shown as column (column.key)}
          {@const width = columnWidth(column, columnState)}
          <th
            scope="col"
            data-align={alignOf(column)}
            class={["plinth-head", isSortable(column) && "plinth-sortable", column.class]}
            aria-sort={isSortable(column) ? ariaSort(sort, column) : undefined}
          >
            <!-- A dragged width is applied to a box inside the cell rather than to the cell: a table
                 cell treats its width as a minimum and grows to fit what it holds, where a block
                 with a width and hidden overflow really is that wide, and the column follows. -->
            {#if width !== undefined}
              <div class="plinth-fit" style:--plinth-column-width="{width}px">
                {@render headerBody(column)}
              </div>
            {:else}
              {@render headerBody(column)}
            {/if}
            {#if resizable && isColumnResizable(column)}
              <!-- A focusable separator is the ARIA pattern for a splitter the keyboard can move;
                   its value is the width it sets, so a screen reader hears the change. -->
              <span
                class="plinth-resize"
                role="separator"
                aria-orientation="vertical"
                aria-label={resizeLabel(column)}
                aria-valuenow={width}
                aria-valuemin={minWidthOf(column)}
                tabindex="0"
                onpointerdown={(event) => startResize(event, column)}
                ondblclick={() => resizeTo(column, null)}
                onkeydown={(event) => onResizeKey(event, column)}
              ></span>
            {/if}
          </th>
        {/each}
      </tr>
    </thead>

    <tbody>
      {#if sorted.length === 0}
        <tr>
          <td class="plinth-empty" colspan={shown.length}>
            {#if empty}{@render empty()}{:else}No data{/if}
          </td>
        </tr>
      {:else}
        {#each sorted as row, index (rowKey(row))}
          <!-- A row is not an interactive element, and dressing it as one would cost the grid
               semantics that make the table navigable in the first place. When a click handler is
               given the row takes focus and answers Enter and Space, which is the reachable part
               of a button; the app is expected to keep a real control in a cell for anything the
               row click is the only way to do. -->
          <!-- eslint-disable-next-line svelte/a11y-no-noninteractive-element-interactions -->
          <tr
            class:plinth-clickable={onRowClick !== undefined}
            tabindex={onRowClick ? 0 : undefined}
            onclick={onRowClick ? () => activate(row) : undefined}
            onkeydown={onRowClick ? (event) => onRowKey(event, row) : undefined}
          >
            {#if card}
              <td class="plinth-card" colspan={shown.length}>{@render card(row, index)}</td>
            {/if}
            {#each shown as column (column.key)}
              {@const width = columnWidth(column, columnState)}
              <td
                data-label={column.label}
                data-align={alignOf(column)}
                class={["plinth-cell", column.numeric && "tabular-nums", column.class]}
              >
                {#if width !== undefined}
                  <div class="plinth-fit" style:--plinth-column-width="{width}px">
                    {@render cellBody(column, row, index)}
                  </div>
                {:else}
                  {@render cellBody(column, row, index)}
                {/if}
              </td>
            {/each}
          </tr>
        {/each}
      {/if}
    </tbody>
  </table>
</div>

<style>
  .plinth-table-wrap {
    /* The whole breakpoint. Querying the container rather than the viewport is also what lets the
       table be dropped into a narrow box and render its card form on a desktop, which is how the
       showcase demonstrates both at once and how a test reaches either. */
    container: plinth-table / inline-size;
    /* A table that does not fit scrolls inside its own box rather than widening the document. */
    overflow-x: auto;
  }

  .plinth-table-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .plinth-table-toolbar {
    min-width: 0;
  }

  /* The menu keeps the far end of the bar even when there is no toolbar to push it there. */
  .plinth-table-columns {
    margin-left: auto;
  }

  /* A table with a dragged column is as wide as its columns add up to, rather than as wide as its
     box: stretched to the box, the browser would share the spare width out between the columns —
     the dragged one included — and a drag would never land where the pointer let go. */
  .plinth-sized {
    width: max-content;
  }

  .plinth-head {
    position: relative;
  }

  .plinth-fit {
    width: var(--plinth-column-width);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .plinth-resize {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: 0.625rem;
    cursor: col-resize;
    /* Without it a touch drag on the handle scrolls the table instead of resizing the column. */
    touch-action: none;
  }

  .plinth-resize::after {
    position: absolute;
    top: 25%;
    right: 0.25rem;
    bottom: 25%;
    width: 2px;
    border-radius: 1px;
    background: color-mix(in oklch, var(--color-base-content) 25%, transparent);
    content: "";
    opacity: 0;
    transition: opacity 0.12s ease;
  }

  /* The handle only shows where it is useful — under the pointer, or under the keyboard. */
  .plinth-head:hover .plinth-resize::after,
  .plinth-resize:focus-visible::after {
    opacity: 1;
  }

  .plinth-resize:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: -2px;
  }

  [data-align="right"] {
    text-align: right;
  }

  [data-align="center"] {
    text-align: center;
  }

  .plinth-sort {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    color: inherit;
    font: inherit;
    text-align: inherit;
    cursor: pointer;
  }

  .plinth-head[data-align="right"] .plinth-sort {
    /* The button is inline, so aligning the header's text moves the whole button, not its label:
       the arrow has to be pushed to the far edge from inside it. */
    flex-direction: row-reverse;
  }

  .plinth-sort:hover {
    color: var(--color-base-content);
  }

  /* Reserved whether or not this column is the sorted one, so adopting a sort does not shift every
     other header sideways. */
  .plinth-arrow {
    display: inline-block;
    width: 0.75em;
  }

  .plinth-clickable {
    cursor: pointer;
  }

  .plinth-empty {
    padding: 2rem 1rem;
    color: color-mix(in oklch, var(--color-base-content) 60%, transparent);
    text-align: center;
  }

  .plinth-card {
    display: none;
  }

  @container plinth-table (max-width: 40rem) {
    /* Widths are a table-form arrangement. A card has no columns to size, so the dragged widths
       step aside here and come back when the box widens again. */
    .plinth-table.plinth-sized {
      width: 100%;
    }

    .plinth-fit {
      width: auto;
      overflow: visible;
      white-space: normal;
    }

    .plinth-resize {
      display: none;
    }

    /* The cells are restyled by class further down, not here: an element selector carries the
       component's scoping class too, which would outrank `.plinth-cell` and pin every cell to
       `block`. */
    .plinth-table,
    .plinth-table thead,
    .plinth-table tbody,
    .plinth-table tr {
      display: block;
    }

    /* Both daisyUI and the plinth theme rule `.table` header and body cells with a
       `border-bottom` — a rule between the rows of a grid. There is no grid here, so it lands as
       a hairline under each sort pill and a line through the middle of every card. The card's
       outline is the row's own border, so the cell borders go. */
    .plinth-head,
    .plinth-cell,
    .plinth-card {
      border-bottom: 0;
    }

    /* The headers are the only way to re-sort once the columns are gone, so they stay — as a strip
       of pills above the cards rather than as a header row. */
    .plinth-table thead tr {
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
      padding-bottom: 0.75rem;
    }

    .plinth-head {
      display: none;
    }

    .plinth-head.plinth-sortable {
      display: block;
      padding: 0;
      background: none;
    }

    .plinth-sort {
      /* 44px: on a phone these pills are the only sort control there is. */
      min-height: 2.75rem;
      padding: 0 0.875rem;
      border: 1px solid color-mix(in oklch, var(--color-base-content) 15%, transparent);
      /* The theme's own field radius, not a pill: a sort control is a control, and it should
         match the buttons and inputs it sits among rather than inventing a second shape. */
      border-radius: var(--radius-field, 0.5rem);
    }

    .plinth-head[aria-sort]:not([aria-sort="none"]) .plinth-sort {
      border-color: var(--color-primary);
      color: var(--color-primary);
    }

    .plinth-table tbody tr {
      margin-bottom: 0.5rem;
      padding: 0.25rem 0.875rem;
      border: 1px solid color-mix(in oklch, var(--color-base-content) 12%, transparent);
      border-radius: var(--radius-box, 1rem);
      background-color: var(--color-base-100);
    }

    .plinth-cell {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 1rem;
      text-align: end;
    }

    /* The column label travels with the value, because the header it used to sit under is gone.
       `display: block` costs the table its grid semantics here, which is the trade this pairing
       pays for: every cell still names itself, in the reading order. */
    .plinth-cell::before {
      content: attr(data-label);
      color: color-mix(in oklch, var(--color-base-content) 60%, transparent);
      text-align: start;
      white-space: nowrap;
    }

    .has-card .plinth-cell {
      display: none;
    }

    .plinth-card {
      display: block;
      padding: 0.5rem 0;
    }

    .plinth-empty {
      display: block;
      border: 0;
    }
  }
</style>
