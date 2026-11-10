import type { Column, FilterCombinator, FilterOperator } from "./types.js";

export interface FilterLabels {
  add: string;
  addGroup: string;
  clear: string;
  apply: string;
  back: string;
  fields: string;
  searchFields: string;
  search: string;
  noFields: string;
  noOptions: string;
  value: string;
  group: string;
  combinator: (combinator: FilterCombinator) => string;
  toggleCombinator: (next: FilterCombinator) => string;
  operator: (operator: FilterOperator, column: Column<never>) => string;
  operatorGroup: (column: Column<never>) => string;
  remove: (description: string) => string;
  removeGroup: string;
  edit: (description: string) => string;
}

const SYMBOLS: Record<FilterOperator, string> = {
  contains: "contains",
  eq: "=",
  gte: "≥",
  gt: ">",
  lte: "≤",
  lt: "<",
  in: "is",
};

export const DEFAULT_FILTER_LABELS: FilterLabels = {
  add: "Filter",
  addGroup: "Group",
  clear: "Clear",
  apply: "Apply",
  back: "Back to fields",
  fields: "Fields",
  searchFields: "Find a field…",
  search: "Search…",
  noFields: "No field matches",
  noOptions: "No option matches",
  value: "Value",
  group: "Filter group",
  combinator: (combinator) => combinator,
  toggleCombinator: (next) => `Match ${next === "and" ? "all" : "any"} of these`,
  operator: (operator, column) =>
    operator === "eq" && column.filter?.kind === "text" ? "is" : SYMBOLS[operator],
  operatorGroup: (column) => `${column.label} comparison`,
  remove: (description) => `Remove filter ${description}`,
  removeGroup: "Remove group",
  edit: (description) => `Edit filter ${description}`,
};
