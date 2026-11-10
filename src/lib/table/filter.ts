import { normalizeForSearch } from "../components/select.js";
import { cellValue } from "./sort.js";
import type {
  Column,
  ColumnFilter,
  FilterCombinator,
  FilterGroup,
  FilterNode,
  FilterOperator,
  FilterRule,
  NumberOperator,
  TextOperator,
} from "./types.js";

export type FilterableColumn<T> = Column<T> & { filter: ColumnFilter<T> };

export type NodePath = readonly number[];

export const TEXT_OPERATORS: readonly TextOperator[] = ["contains", "eq"];

export const NUMBER_OPERATORS: readonly NumberOperator[] = ["gte", "lte", "eq", "gt", "lt"];

const CHOICE_OPERATORS: readonly FilterOperator[] = ["in"];

const MAX_DEPTH = 4;

export const isGroup = (node: FilterNode): node is FilterGroup => "children" in node;

export const emptyFilter = (combinator: FilterCombinator = "and"): FilterGroup => ({
  combinator,
  children: [],
});

export const operatorsOf = <T>(filter: ColumnFilter<T>): readonly FilterOperator[] => {
  if (filter.kind === "text") return filter.operators ?? TEXT_OPERATORS;
  if (filter.kind === "number") return filter.operators ?? NUMBER_OPERATORS;
  return CHOICE_OPERATORS;
};

export const filterableColumns = <T>(columns: readonly Column<T>[]): FilterableColumn<T>[] =>
  columns.filter((column): column is FilterableColumn<T> => column.filter !== undefined);

export const filterValue = <T>(column: Column<T>, row: T): unknown =>
  column.filter?.value ? column.filter.value(row) : cellValue(column, row);

const asText = (value: unknown): string | undefined => {
  if (typeof value === "string") return value === "" ? undefined : value;
  if (typeof value === "number") return Number.isNaN(value) ? undefined : String(value);
  if (typeof value === "boolean" || typeof value === "bigint") return String(value);
  return undefined;
};

const asNumber = (value: unknown): number | undefined => {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

type ColumnLookup<T> = ReadonlyMap<string, Column<T>>;

const lookup = <T>(columns: readonly Column<T>[]): ColumnLookup<T> =>
  new Map(columns.map((column) => [column.key, column]));

const normalizeRule = <T>(
  column: Column<T> | undefined,
  rule: FilterRule,
): FilterRule | undefined => {
  const filter = column?.filter;
  if (!filter || !operatorsOf(filter).includes(rule.operator)) return undefined;

  if (filter.kind === "text")
    return typeof rule.value === "string" && rule.value.trim() !== "" ? rule : undefined;

  if (filter.kind === "number")
    return typeof rule.value === "number" && Number.isFinite(rule.value) ? rule : undefined;

  if (!Array.isArray(rule.value)) return undefined;
  const known = new Set(filter.options.map((option) => option.value));
  const value = [...new Set(rule.value)].filter((picked) => known.has(picked));
  return value.length === 0 ? undefined : { key: rule.key, operator: "in", value };
};

export const isRuleActive = <T>(columns: readonly Column<T>[], rule: FilterRule): boolean =>
  normalizeRule(lookup(columns).get(rule.key), rule) !== undefined;

const normalizeNode = <T>(
  byKey: ColumnLookup<T>,
  node: FilterNode,
  depth: number,
): FilterNode | undefined => {
  if (!isGroup(node)) return normalizeRule(byKey.get(node.key), node);
  if (depth > MAX_DEPTH) return undefined;
  const children = node.children.flatMap((child) => {
    const normalized = normalizeNode(byKey, child, depth + 1);
    return normalized ? [normalized] : [];
  });
  if (children.length === 0) return undefined;
  if (children.length === 1) return children[0];
  return { combinator: node.combinator === "or" ? "or" : "and", children };
};

export const normalizeFilter = <T>(
  columns: readonly Column<T>[],
  filter: FilterGroup,
): FilterGroup => {
  const normalized = normalizeNode(lookup(columns), filter, 0);
  if (!normalized) return emptyFilter(filter.combinator);
  return isGroup(normalized)
    ? normalized
    : { combinator: filter.combinator, children: [normalized] };
};

export const filterRules = (node: FilterNode): FilterRule[] =>
  isGroup(node) ? node.children.flatMap(filterRules) : [node];

export const isFilterEmpty = <T>(columns: readonly Column<T>[], filter: FilterGroup): boolean =>
  normalizeFilter(columns, filter).children.length === 0;

const compareNumber = (operator: NumberOperator, left: number, right: number): boolean => {
  if (operator === "gte") return left >= right;
  if (operator === "gt") return left > right;
  if (operator === "lte") return left <= right;
  if (operator === "lt") return left < right;
  return left === right;
};

const rulePredicate = <T>(column: Column<T>, rule: FilterRule): ((row: T) => boolean) => {
  const read = (row: T) => filterValue(column, row);

  if (rule.operator === "in") {
    const picked = new Set(rule.value);
    return (row) => {
      const text = asText(read(row));
      return text !== undefined && picked.has(text);
    };
  }

  if (column.filter?.kind === "number" && typeof rule.value === "number") {
    const operator = rule.operator as NumberOperator;
    const target = rule.value;
    return (row) => {
      const value = asNumber(read(row));
      return value !== undefined && compareNumber(operator, value, target);
    };
  }

  const query = normalizeForSearch(String(rule.value));
  const exact = rule.operator === "eq";
  return (row) => {
    const text = asText(read(row));
    if (text === undefined) return false;
    const normalized = normalizeForSearch(text);
    return exact ? normalized === query : normalized.includes(query);
  };
};

const compile = <T>(byKey: ColumnLookup<T>, node: FilterNode): ((row: T) => boolean) => {
  if (!isGroup(node)) return rulePredicate(byKey.get(node.key)!, node);
  const tests = node.children.map((child) => compile(byKey, child));
  return node.combinator === "or"
    ? (row) => tests.some((test) => test(row))
    : (row) => tests.every((test) => test(row));
};

export const filterRows = <T>(
  rows: readonly T[],
  columns: readonly Column<T>[],
  filter: FilterGroup,
): readonly T[] => {
  const normalized = normalizeFilter(columns, filter);
  if (normalized.children.length === 0) return rows;
  const test = compile(lookup(columns), normalized);
  return rows.filter(test);
};

const sameSlot = (node: FilterNode, key: string, operator?: FilterOperator) =>
  !isGroup(node) && node.key === key && (operator === undefined || node.operator === operator);

export const findRule = (
  filter: FilterGroup,
  key: string,
  operator: FilterOperator,
): FilterRule | undefined =>
  filter.children.find((node): node is FilterRule => sameSlot(node, key, operator));

export const setRule = (filter: FilterGroup, rule: FilterRule): FilterGroup => {
  const index = filter.children.findIndex((node) => sameSlot(node, rule.key, rule.operator));
  const children =
    index === -1
      ? [...filter.children, rule]
      : filter.children.map((node, at) => (at === index ? rule : node));
  return { ...filter, children };
};

export const removeRule = (
  filter: FilterGroup,
  key: string,
  operator?: FilterOperator,
): FilterGroup => ({
  ...filter,
  children: filter.children.filter((node) => !sameSlot(node, key, operator)),
});

export const nodeAt = (filter: FilterGroup, path: NodePath): FilterNode | undefined => {
  let node: FilterNode = filter;
  for (const index of path) {
    if (!isGroup(node) || index < 0 || index >= node.children.length) return undefined;
    node = node.children[index];
  }
  return node;
};

const updateGroup = (
  group: FilterGroup,
  path: NodePath,
  update: (group: FilterGroup) => FilterGroup,
): FilterGroup => {
  if (path.length === 0) return update(group);
  const [head, ...rest] = path;
  return {
    ...group,
    children: group.children.map((child, index) =>
      index === head && isGroup(child) ? updateGroup(child, rest, update) : child,
    ),
  };
};

export const addNode = (filter: FilterGroup, groupPath: NodePath, node: FilterNode): FilterGroup =>
  updateGroup(filter, groupPath, (group) => ({ ...group, children: [...group.children, node] }));

export const replaceNode = (filter: FilterGroup, path: NodePath, node: FilterNode): FilterGroup => {
  if (path.length === 0) return isGroup(node) ? node : filter;
  const parent = path.slice(0, -1);
  const index = path[path.length - 1];
  return updateGroup(filter, parent, (group) => ({
    ...group,
    children: group.children.map((child, at) => (at === index ? node : child)),
  }));
};

export const removeNode = (filter: FilterGroup, path: NodePath): FilterGroup => {
  if (path.length === 0) return emptyFilter(filter.combinator);
  const parent = path.slice(0, -1);
  const index = path[path.length - 1];
  return updateGroup(filter, parent, (group) => ({
    ...group,
    children: group.children.filter((_, at) => at !== index),
  }));
};

export const setCombinator = (
  filter: FilterGroup,
  groupPath: NodePath,
  combinator: FilterCombinator,
): FilterGroup => updateGroup(filter, groupPath, (group) => ({ ...group, combinator }));

const FILTER_PARAM = "filter";

const escapePart = (text: string): string =>
  encodeURIComponent(text).replace(/[()]/g, (char) => (char === "(" ? "%28" : "%29"));

const encodeRule = (rule: FilterRule): string => {
  const value = Array.isArray(rule.value)
    ? rule.value.map(escapePart).join(",")
    : escapePart(String(rule.value));
  return `${escapePart(rule.key)}:${rule.operator}:${value}`;
};

const encodeNode = (node: FilterNode): string | undefined => {
  if (!isGroup(node)) return encodeRule(node);
  const children = node.children.flatMap((child) => encodeNode(child) ?? []);
  if (children.length === 0) return undefined;
  return `${node.combinator}(${children.join(";")})`;
};

export const filterToParams = (
  filter: FilterGroup,
  name: string = FILTER_PARAM,
): Record<string, string | null> => {
  const children = filter.children.flatMap((child) => encodeNode(child) ?? []);
  if (children.length === 0) return { [name]: null };
  const body = children.join(";");
  return { [name]: filter.combinator === "or" ? `or(${body})` : body };
};

const decodeRule = <T>(part: string, byKey: ColumnLookup<T>): FilterRule | undefined => {
  const pieces = part.split(":");
  if (pieces.length !== 3) return undefined;
  const [rawKey, operator, rawValue] = pieces;
  try {
    const key = decodeURIComponent(rawKey);
    const kind = byKey.get(key)?.filter?.kind;
    if (kind === "choice")
      return {
        key,
        operator: operator as "in",
        value: rawValue === "" ? [] : rawValue.split(",").map(decodeURIComponent),
      };
    const text = decodeURIComponent(rawValue);
    if (kind === "number")
      return {
        key,
        operator: operator as NumberOperator,
        value: text.trim() === "" ? Number.NaN : Number(text),
      };
    return { key, operator: operator as TextOperator, value: text };
  } catch {
    return undefined;
  }
};

const parseExpression = <T>(source: string, byKey: ColumnLookup<T>): FilterNode[] | undefined => {
  let position = 0;

  const parseList = (depth: number): FilterNode[] | undefined => {
    const nodes: FilterNode[] = [];
    for (;;) {
      const node = parseItem(depth);
      if (node === undefined) return undefined;
      if (node !== null) nodes.push(node);
      if (source[position] !== ";") return nodes;
      position += 1;
    }
  };

  const parseItem = (depth: number): FilterNode | null | undefined => {
    const group = /^(and|or)\(/.exec(source.slice(position));
    if (group) {
      if (depth >= MAX_DEPTH) return undefined;
      position += group[0].length;
      const children = parseList(depth + 1);
      if (children === undefined || source[position] !== ")") return undefined;
      position += 1;
      return { combinator: group[1] as FilterCombinator, children };
    }
    const start = position;
    while (position < source.length && source[position] !== ";" && source[position] !== ")")
      position += 1;
    return decodeRule(source.slice(start, position), byKey) ?? null;
  };

  const nodes = parseList(0);
  return nodes !== undefined && position === source.length ? nodes : undefined;
};

export const filterFromParams = <T>(
  params: URLSearchParams,
  columns: readonly Column<T>[],
  name: string = FILTER_PARAM,
): FilterGroup => {
  const raw = params.get(name);
  if (!raw) return emptyFilter();
  const nodes = parseExpression(raw, lookup(columns));
  if (!nodes) return emptyFilter();
  return normalizeFilter(columns, { combinator: "and", children: nodes });
};
