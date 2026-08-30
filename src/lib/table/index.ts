// A sortable table that turns into cards on a narrow screen, and the pure functions behind it.
// Not a data grid: no filtering, no column visibility, no virtualization, no saved views.
// `@viniaraujo68/plinth/table`.
export { default as DataTable } from "./DataTable.svelte";
export type { Column, SortDirection, SortState, SortValue } from "./types.js";
export {
  ariaSort,
  cellText,
  cellValue,
  compareSortValues,
  nextSort,
  sortRows,
  sortValue,
} from "./sort.js";
