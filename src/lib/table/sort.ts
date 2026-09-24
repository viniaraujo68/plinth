import type { Column, SortDirection, SortState, SortValue } from "./types.js";

/**
 * The table's pure half: reading a cell, ordering the rows, and deciding what a header click
 * means. None of it touches the DOM, so it is checked in node rather than in a browser.
 */

/**
 * A value with no meaningful text of its own stringifies to `[object Object]`, which is what the
 * lint rule below is warning about and what this accepts: such rows read the same, so they compare
 * equal and a stable sort leaves them exactly where they were. Ordering them any other way would
 * mean guessing at a meaning the column never declared — that is what `sortBy` is for.
 */
// eslint-disable-next-line @typescript-eslint/no-base-to-string
const asText = (value: NonNullable<unknown>): string => String(value);

/** What the cell shows by default, and what it sorts by unless the column says otherwise. */
export const cellValue = <T>(column: Column<T>, row: T): unknown =>
  column.value ? column.value(row) : (row as Record<string, unknown>)[column.key];

/** How a cell reads with no snippet to render it, and what a missing value looks like. */
export const cellText = <T>(column: Column<T>, row: T): string => {
  const value = cellValue(column, row);
  if (value === null || value === undefined) return "—";
  return asText(value);
};

export const sortValue = <T>(column: Column<T>, row: T): SortValue => {
  if (column.sortBy) return column.sortBy(row);

  const raw = cellValue(column, row);
  if (raw === null || raw === undefined) return raw;
  if (typeof raw === "string" || typeof raw === "number" || raw instanceof Date) return raw;

  // Anything else orders the way it renders, which is the only ordering the table can defend
  // without being told what the value means.
  return asText(raw);
};

/** A missing value, an unparsed date and a `NaN` are all "no value", and all sort last. */
const isMissing = (value: SortValue): boolean => {
  if (value === null || value === undefined) return true;
  if (value instanceof Date) return Number.isNaN(value.getTime());
  return typeof value === "number" && Number.isNaN(value);
};

/**
 * Ascending comparison of two present values. Mixed types fall back to a string comparison rather
 * than to `NaN`, which is what a `-` on incomparable operands would produce and what would then
 * make the whole sort order undefined.
 */
export const compareSortValues = (a: SortValue, b: SortValue, locale?: string): number => {
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();

  // `numeric` so "Row 9" precedes "Row 10"; `base` so case and accents do not decide an order the
  // reader cannot see — equal strings compare 0 and keep their incoming order.
  return String(a).localeCompare(String(b), locale, { numeric: true, sensitivity: "base" });
};

/**
 * A new array in the requested order. `Array.prototype.sort` is stable by specification, so rows
 * the comparator calls equal keep the order they arrived in — which is what makes a second sort
 * on a different column read as a tiebreak rather than as a shuffle.
 */
export const sortRows = <T>(
  rows: readonly T[],
  column: Column<T>,
  direction: SortDirection,
  locale?: string,
): T[] => {
  const factor = direction === "asc" ? 1 : -1;

  return [...rows].sort((a, b) => {
    const left = sortValue(column, a);
    const right = sortValue(column, b);

    // Missing values are pushed to the end in both directions, so this test sits outside the
    // direction flip rather than inside the comparison it multiplies.
    const leftMissing = isMissing(left);
    const rightMissing = isMissing(right);
    if (leftMissing && rightMissing) return 0;
    if (leftMissing) return 1;
    if (rightMissing) return -1;

    return factor * compareSortValues(left, right, locale);
  });
};

/** What a click on `column`'s header means: flip the column it already sorts, or adopt a new one. */
export const nextSort = <T>(current: SortState | undefined, column: Column<T>): SortState => {
  const flipped: SortDirection = current?.direction === "asc" ? "desc" : "asc";
  if (current?.key === column.key) return { key: column.key, direction: flipped };

  // A fresh numeric column opens on its largest value: "top by revenue" is the question a number
  // column is almost always there to answer.
  const fallback: SortDirection = column.numeric ? "desc" : "asc";
  return { key: column.key, direction: column.defaultSortDirection ?? fallback };
};

/** The `aria-sort` of a sortable header. Unsortable headers carry no such attribute at all. */
export const ariaSort = <T>(
  current: SortState | undefined,
  column: Column<T>,
): "ascending" | "descending" | "none" => {
  if (current?.key !== column.key) return "none";
  return current.direction === "asc" ? "ascending" : "descending";
};

/**
 * Standard competition ranks ("1224") for rows already in display order: rows whose values compare
 * equal share the rank of the first of them, and the next distinct value skips the places the tie
 * used up. A missing value gets no rank at all — it sorts last, and "tied for last because nobody
 * knows" is not a position worth printing.
 *
 * The table hands a `cell` snippet the row's position, which is the right number until two rows
 * tie; a leaderboard that has to say "joint second" needs this instead.
 */
export const competitionRanks = <T>(
  ordered: readonly T[],
  valueOf: (row: T) => SortValue,
  locale?: string,
): (number | null)[] => {
  const ranks: (number | null)[] = [];
  let previous: SortValue;
  ordered.forEach((row, index) => {
    const value = valueOf(row);
    if (isMissing(value)) {
      ranks.push(null);
      return;
    }
    const tied =
      index > 0 && !isMissing(previous) && compareSortValues(previous, value, locale) === 0;
    ranks.push(tied ? ranks[index - 1] : index + 1);
    previous = value;
  });
  return ranks;
};

/** The search parameter names a sort is written under, when the URL has room for more than one. */
export interface SortParamNames {
  key: string;
  direction: string;
}

const SORT_PARAMS: SortParamNames = { key: "sort", direction: "dir" };

/**
 * Reads a sort out of a URL's search parameters, so a shared link opens on the order its sender was
 * looking at. Anything missing or unrecognised falls back to `fallback` piece by piece: a link with
 * only `?sort=year` gets the fallback's direction.
 */
export const sortFromParams = (
  params: URLSearchParams,
  fallback: SortState,
  names: SortParamNames = SORT_PARAMS,
): SortState => {
  const direction = params.get(names.direction);
  return {
    key: params.get(names.key) ?? fallback.key,
    direction: direction === "asc" || direction === "desc" ? direction : fallback.direction,
  };
};

/**
 * The search parameters that write `sort` back, as updates for `withSearchParams`: a piece equal to
 * the fallback is `null` — removed — so the URL of a table in its default order stays clean.
 */
export const sortToParams = (
  sort: SortState,
  fallback: SortState,
  names: SortParamNames = SORT_PARAMS,
): Record<string, string | null> => ({
  [names.key]: sort.key === fallback.key ? null : sort.key,
  [names.direction]: sort.direction === fallback.direction ? null : sort.direction,
});
