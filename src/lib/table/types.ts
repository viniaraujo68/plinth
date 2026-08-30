import type { Snippet } from "svelte";
import type { ClassValue } from "svelte/elements";

/**
 * A value the table knows how to order. `null` and `undefined` both mean "missing" and sort to
 * the end in either direction — a blank cell is never the answer to "who is first".
 */
export type SortValue = string | number | Date | null | undefined;

export type SortDirection = "asc" | "desc";

/**
 * Which column the table is ordered by, and how. Absent means "the order the rows arrived in",
 * which is a state the table can start in but never returns to: a header toggles between the two
 * directions rather than cycling through a third, unsorted step.
 */
export interface SortState {
  key: string;
  direction: SortDirection;
}

/**
 * One column of a {@link Column}-driven table.
 *
 * `key` is a plain string rather than `keyof T` on purpose: a ratio, a total, or a pair of fields
 * rendered as one cell has no field to name, and forcing those to alias a real one would be worse
 * than losing the check. When `key` does name a field, everything else has a working default —
 * `{ key: "name", label: "Name" }` reads it, renders it and sorts by it.
 */
export interface Column<T> {
  /** Identifies the column: keys the header, and is the default field accessor. */
  key: string;
  label: string;
  /** Reads the cell's value. Defaults to `row[key]`. */
  value?: (row: T) => unknown;
  /** Whether the header sorts. On by default — a column that cannot be ordered opts out. */
  sortable?: boolean;
  /**
   * What to order by, when that is not what the cell shows: a formatted date sorts by the
   * `Date`, a status badge by its rank. Defaults to {@link Column.value}.
   */
  sortBy?: (row: T) => SortValue;
  /** Direction the first click picks. Defaults to descending for `numeric`, ascending otherwise. */
  defaultSortDirection?: SortDirection;
  /** Defaults to `right` for `numeric`, `left` otherwise. */
  align?: "left" | "center" | "right";
  /** Renders the column in tabular figures, so digits line up column-wise as the rows change. */
  numeric?: boolean;
  /** Extra classes for this column's cells and header. */
  class?: ClassValue;
  /**
   * Renders the cell. Without it the cell is `String(value)`, and `null`/`undefined` is an
   * em dash.
   *
   * The second argument is the row's 0-based position in the order currently rendered, which is
   * what a rank or a medal column follows; it changes with the sort. A snippet declared with only
   * the row parameter stays assignable and simply ignores it.
   *
   * Svelte hoists a template snippet that captures no state to module scope, so a `columns` array
   * declared with `const` can usually name one — but a snippet that reads `$state` is declared
   * where it appears in the template, after the instance script has run. Build the array with
   * `$derived` and the distinction stops mattering.
   */
  cell?: Snippet<[T, number]>;
}
