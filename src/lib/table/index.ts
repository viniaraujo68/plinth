// A sortable table that turns into cards on a narrow screen, whose columns the reader can show,
// hide, reorder and resize, and the pure functions behind it. Not a data grid: no filtering, no
// virtualization, no saved views. `@viniaraujo68/plinth/table`.
export { default as DataTable } from "./DataTable.svelte";
export type { Column, ColumnState, SortDirection, SortState, SortValue } from "./types.js";
export {
  ariaSort,
  cellText,
  cellValue,
  compareSortValues,
  competitionRanks,
  nextSort,
  sortFromParams,
  sortRows,
  sortToParams,
  sortValue,
  type SortParamNames,
} from "./sort.js";
// The layout functions the table runs on, for a caller that arranges columns outside the menu —
// a preset layout, a "show everything" shortcut, or a state kept somewhere other than storage.
export {
  canHideColumn,
  columnWidth,
  emptyColumnState,
  isColumnStateEmpty,
  isColumnVisible,
  moveColumn,
  orderColumns,
  parseColumnState,
  readColumnState,
  setColumnVisible,
  setColumnWidth,
  visibleColumns,
  writeColumnState,
} from "./columns.js";
