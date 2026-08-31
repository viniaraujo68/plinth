<script lang="ts" generics="T">
  import type { Snippet } from "svelte";
  import type { ClassValue } from "svelte/elements";
  import { ariaSort, cellText, nextSort, sortRows } from "./sort.js";
  import type { Column, SortState } from "./types.js";

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
  }: Props = $props();

  const sorted = $derived.by(() => {
    const column = columns.find((candidate) => candidate.key === sort?.key);
    if (!sort || !column) return rows;
    return sortRows(rows, column, sort.direction, locale);
  });

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

This is deliberately not a data grid — no filtering, no column visibility, no virtualization, no
saved views. A table that needs those needs a different component.

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

<div class="plinth-table-wrap">
  <table
    class={["plinth-table table", className]}
    class:has-card={card !== undefined}
    aria-label={label}
  >
    <thead>
      <tr>
        {#each columns as column (column.key)}
          <th
            scope="col"
            data-align={alignOf(column)}
            class={["plinth-head", isSortable(column) && "plinth-sortable", column.class]}
            aria-sort={isSortable(column) ? ariaSort(sort, column) : undefined}
          >
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
          </th>
        {/each}
      </tr>
    </thead>

    <tbody>
      {#if sorted.length === 0}
        <tr>
          <td class="plinth-empty" colspan={columns.length}>
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
              <td class="plinth-card" colspan={columns.length}>{@render card(row, index)}</td>
            {/if}
            {#each columns as column (column.key)}
              <td
                data-label={column.label}
                data-align={alignOf(column)}
                class={["plinth-cell", column.numeric && "tabular-nums", column.class]}
              >
                {#if column.cell}{@render column.cell(row, index)}{:else}{cellText(
                    column,
                    row,
                  )}{/if}
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
