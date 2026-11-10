export type JsonLineKind = "open" | "close" | "value";

export type JsonTokenType = "string" | "number" | "boolean" | "null" | "circular";

export interface JsonLine {
  kind: JsonLineKind;
  pointer: string;
  id: string;
  depth: number;
  parent: number;
  end: number;
  name: string | null;
  text: string;
  type: JsonTokenType | null;
  size: number;
  comma: boolean;
  source: unknown;
}

export interface JsonFlattenOptions {
  circular?: string;
}

export interface JsonMatch {
  line: number;
  field: "name" | "value";
  start: number;
  length: number;
}

export interface JsonMatchSegment {
  text: string;
  start: number;
  match: boolean;
}

export interface JsonPoint {
  line: number;
  column: number;
}

export interface JsonViewLabels {
  region: string;
  search: string;
  searchField: string;
  previousMatch: string;
  nextMatch: string;
  closeSearch: string;
  matchCount: (current: number, total: number) => string;
  noMatches: string;
  expandAll: string;
  collapseAll: string;
  copy: string;
  copied: string;
  expand: string;
  collapse: string;
  items: (count: number) => string;
  circular: string;
  empty: string;
}

export const DEFAULT_JSON_VIEW_LABELS: JsonViewLabels = {
  region: "JSON viewer",
  search: "Search",
  searchField: "Search keys and values",
  previousMatch: "Previous match",
  nextMatch: "Next match",
  closeSearch: "Close search",
  matchCount: (current, total) => `${current} of ${total}`,
  noMatches: "No matches",
  expandAll: "Expand all",
  collapseAll: "Collapse all",
  copy: "Copy JSON",
  copied: "Copied",
  expand: "Expand",
  collapse: "Collapse",
  items: (count) => (count === 1 ? "1 item" : `${count} items`),
  circular: "[Circular]",
  empty: "Nothing to show",
};

export const JSON_VIEW_GUTTER_CH = 2;
export const JSON_VIEW_INDENT_CH = 2;

const SKIPPED = Symbol("skipped");

const escapePointerSegment = (segment: string): string =>
  segment.replace(/~/g, "~0").replace(/\//g, "~1");

const unbox = (value: unknown): unknown => {
  if (value instanceof Number) return Number(value);
  if (value instanceof String) return String(value);
  if (value instanceof Boolean || value instanceof BigInt) return value.valueOf();
  return value;
};

const resolveForJson = (raw: unknown, key: string): unknown => {
  let value = raw;
  if ((typeof value === "object" && value !== null) || typeof value === "bigint") {
    const toJSON = (value as { toJSON?: unknown }).toJSON;
    if (typeof toJSON === "function") value = (toJSON as (key: string) => unknown).call(value, key);
  }
  value = unbox(value);
  if (value === undefined || typeof value === "function" || typeof value === "symbol")
    return SKIPPED;
  return value;
};

const isContainer = (value: unknown): value is object =>
  typeof value === "object" && value !== null;

const closingBracket = (open: string): string => (open === "[" ? "]" : "}");

const primitiveToken = (value: unknown): { text: string; type: JsonTokenType } => {
  if (value === null) return { text: "null", type: "null" };
  if (typeof value === "string") return { text: JSON.stringify(value), type: "string" };
  if (typeof value === "boolean") return { text: String(value), type: "boolean" };
  if (typeof value === "bigint") return { text: value.toString(), type: "number" };
  if (typeof value === "number")
    return Number.isFinite(value)
      ? { text: JSON.stringify(value), type: "number" }
      : { text: "null", type: "null" };
  return { text: "null", type: "null" };
};

export const flattenJson = (value: unknown, options: JsonFlattenOptions = {}): JsonLine[] => {
  const circular = options.circular ?? DEFAULT_JSON_VIEW_LABELS.circular;
  const lines: JsonLine[] = [];
  const ancestors = new Set<object>();

  const childrenOf = (container: object): { segment: string; raw: unknown; value: unknown }[] => {
    if (Array.isArray(container)) {
      const items = container as unknown[];
      return Array.from({ length: items.length }, (_, index) => {
        const segment = String(index);
        const resolved = resolveForJson(items[index], segment);
        return { segment, raw: items[index], value: resolved === SKIPPED ? null : resolved };
      });
    }
    const record = container as Record<string, unknown>;
    return Object.keys(record)
      .map((segment) => ({
        segment,
        raw: record[segment],
        value: resolveForJson(record[segment], segment),
      }))
      .filter((child) => child.value !== SKIPPED);
  };

  const visit = (
    raw: unknown,
    node: unknown,
    pointer: string,
    name: string | null,
    depth: number,
    parent: number,
    comma: boolean,
  ): void => {
    const index = lines.length;
    if (!isContainer(node)) {
      const { text, type } = primitiveToken(node);
      lines.push({
        kind: "value",
        pointer,
        id: pointer,
        depth,
        parent,
        end: index + 1,
        name,
        text,
        type,
        size: 0,
        comma,
        source: raw,
      });
      return;
    }
    if (ancestors.has(node)) {
      lines.push({
        kind: "value",
        pointer,
        id: pointer,
        depth,
        parent,
        end: index + 1,
        name,
        text: circular,
        type: "circular",
        size: 0,
        comma,
        source: raw,
      });
      return;
    }

    const isArray = Array.isArray(node);
    const bracket = isArray ? "[" : "{";
    const children = childrenOf(node);
    const open: JsonLine = {
      kind: "open",
      pointer,
      id: pointer,
      depth,
      parent,
      end: index + 1,
      name,
      text: bracket,
      type: null,
      size: children.length,
      comma,
      source: raw,
    };
    lines.push(open);
    if (children.length === 0) return;

    ancestors.add(node);
    children.forEach((child, position) => {
      visit(
        child.raw,
        child.value,
        `${pointer}/${escapePointerSegment(child.segment)}`,
        isArray ? null : JSON.stringify(child.segment),
        depth + 1,
        index,
        position < children.length - 1,
      );
    });
    ancestors.delete(node);

    lines.push({
      kind: "close",
      pointer,
      id: `~${pointer}`,
      depth,
      parent: index,
      end: lines.length + 1,
      name: null,
      text: closingBracket(bracket),
      type: null,
      size: 0,
      comma,
      source: raw,
    });
    open.end = lines.length;
  };

  const root = resolveForJson(value, "");
  if (root !== SKIPPED) visit(value, root, "", null, 0, -1, false);
  return lines;
};

export const isFoldable = (line: JsonLine): boolean => line.kind === "open" && line.size > 0;

export const isFolded = (line: JsonLine, collapsed: ReadonlySet<string>): boolean =>
  isFoldable(line) && collapsed.has(line.pointer);

export const visibleLines = (
  lines: readonly JsonLine[],
  collapsed: ReadonlySet<string>,
): number[] => {
  const visible: number[] = [];
  let index = 0;
  while (index < lines.length) {
    visible.push(index);
    const line = lines[index];
    index = isFolded(line, collapsed) ? line.end : index + 1;
  }
  return visible;
};

export const ancestorLines = (lines: readonly JsonLine[], index: number): number[] => {
  const chain: number[] = [];
  for (let parent = lines[index].parent; parent !== -1; parent = lines[parent].parent)
    chain.push(parent);
  return chain;
};

const foldCase = (text: string): string => {
  const lower = text.toLowerCase();
  if (lower.length === text.length) return lower;
  let folded = "";
  for (const character of text) {
    const candidate = character.toLowerCase();
    folded += candidate.length === character.length ? candidate : character;
  }
  return folded;
};

const occurrences = (text: string, needle: string): number[] => {
  const haystack = foldCase(text);
  const starts: number[] = [];
  for (
    let start = haystack.indexOf(needle);
    start !== -1;
    start = haystack.indexOf(needle, start + needle.length)
  )
    starts.push(start);
  return starts;
};

export const searchJson = (lines: readonly JsonLine[], query: string): JsonMatch[] => {
  if (query === "") return [];
  const needle = foldCase(query);
  const matches: JsonMatch[] = [];
  lines.forEach((line, index) => {
    if (line.name !== null)
      for (const start of occurrences(line.name, needle))
        matches.push({ line: index, field: "name", start, length: query.length });
    if (line.kind === "value")
      for (const start of occurrences(line.text, needle))
        matches.push({ line: index, field: "value", start, length: query.length });
  });
  return matches;
};

export const matchSegments = (text: string, query: string): JsonMatchSegment[] => {
  if (query === "") return [{ text, start: 0, match: false }];
  const segments: JsonMatchSegment[] = [];
  let cursor = 0;
  for (const start of occurrences(text, foldCase(query))) {
    if (start > cursor)
      segments.push({ text: text.slice(cursor, start), start: cursor, match: false });
    segments.push({ text: text.slice(start, start + query.length), start, match: true });
    cursor = start + query.length;
  }
  if (cursor < text.length || segments.length === 0)
    segments.push({ text: text.slice(cursor), start: cursor, match: false });
  return segments;
};

export const subtreeHasMatch = (
  matches: readonly JsonMatch[],
  open: number,
  end: number,
): boolean => {
  let low = 0;
  let high = matches.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (matches[middle].line <= open) low = middle + 1;
    else high = middle;
  }
  return low < matches.length && matches[low].line < end;
};

const nameWidth = (line: JsonLine): number => (line.name === null ? 0 : line.name.length + 2);

const leadWidth = (line: JsonLine): number =>
  JSON_VIEW_GUTTER_CH + line.depth * JSON_VIEW_INDENT_CH + nameWidth(line);

export const lineWidthCh = (line: JsonLine): number => {
  const comma = line.comma ? 1 : 0;
  if (line.kind === "value" || line.kind === "close")
    return leadWidth(line) + line.text.length + comma;
  if (line.size === 0) return leadWidth(line) + 2 + comma;
  return leadWidth(line) + 3 + comma + 1 + String(line.size).length;
};

export const maxLineWidthCh = (lines: readonly JsonLine[]): number => {
  let widest = 0;
  for (const line of lines) widest = Math.max(widest, lineWidthCh(line));
  return widest;
};

export const matchColumnCh = (line: JsonLine, match: JsonMatch): number =>
  JSON_VIEW_GUTTER_CH +
  line.depth * JSON_VIEW_INDENT_CH +
  (match.field === "name" ? match.start : nameWidth(line) + match.start);

export const lineText = (line: JsonLine): string => {
  const lead = line.name === null ? "" : `${line.name}: `;
  const comma = line.comma ? "," : "";
  if (line.kind === "value") return lead + line.text + comma;
  if (line.kind === "close") return line.text + comma;
  if (line.size === 0) return lead + line.text + closingBracket(line.text) + comma;
  return lead + line.text;
};

const NOTHING_COLLAPSED: ReadonlySet<string> = new Set();

const comparePoints = (a: JsonPoint, b: JsonPoint): number =>
  a.line === b.line ? a.column - b.column : a.line - b.line;

export const copyJson = (
  lines: readonly JsonLine[],
  collapsed: ReadonlySet<string>,
  from: JsonPoint,
  to: JsonPoint,
): string => {
  if (lines.length === 0) return "";
  const clamp = (point: JsonPoint): JsonPoint => ({
    line: Math.min(Math.max(point.line, 0), lines.length - 1),
    column: Math.max(point.column, 0),
  });
  let [start, end] = comparePoints(from, to) <= 0 ? [from, to] : [to, from];
  start = clamp(start);
  end = clamp(end);

  const startLine = lines[start.line];
  if (isFolded(startLine, collapsed))
    start = { line: start.line, column: Math.min(start.column, lineText(startLine).length) };

  const endLine = lines[end.line];
  if (isFolded(endLine, collapsed) && end.column > lineText(endLine).length)
    end = { line: endLine.end - 1, column: Number.POSITIVE_INFINITY };

  if (start.line === end.line) return lineText(lines[start.line]).slice(start.column, end.column);

  const parts = [lineText(startLine).slice(start.column)];
  for (let index = start.line + 1; index < end.line; index += 1)
    parts.push(" ".repeat(lines[index].depth * 2) + lineText(lines[index]));
  const last = lines[end.line];
  parts.push(
    end.column === 0 ? "" : " ".repeat(last.depth * 2) + lineText(last).slice(0, end.column),
  );
  return parts.join("\n");
};

export const copyAllJson = (lines: readonly JsonLine[]): string =>
  copyJson(
    lines,
    NOTHING_COLLAPSED,
    { line: 0, column: 0 },
    { line: lines.length - 1, column: Number.POSITIVE_INFINITY },
  );
