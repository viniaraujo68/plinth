import type { Column, ColumnState } from "./types.js";

/**
 * The arrangeable half of a table: which columns show, in what order and at what width. Like
 * `sort.ts` it never touches the DOM, and every change returns a new state rather than editing the
 * one it was given — the state is usually a bound prop, and a mutation in place would change it
 * without the owner hearing about it.
 */

/** The narrowest a resize can make a column when the column does not say otherwise. */
export const DEFAULT_MIN_WIDTH = 48;

/**
 * Bumped whenever the stored shape changes meaning. A stored state from another version is dropped
 * rather than migrated: it is a layout preference, and losing it costs one drag, where reading it
 * wrong could hide a column the reader has no idea is there.
 */
const STORAGE_VERSION = 1;

export const emptyColumnState = (): ColumnState => ({ order: [], visibility: {}, widths: {} });

export const isColumnHideable = <T>(column: Column<T>): boolean => column.hideable !== false;

export const isColumnResizable = <T>(column: Column<T>): boolean => column.resizable !== false;

export const minWidthOf = <T>(column: Column<T>): number => column.minWidth ?? DEFAULT_MIN_WIDTH;

/**
 * The columns in the reader's order. Keys the state names that no longer exist are skipped, a key
 * named twice counts once, and a column the state never heard of — added after the state was saved
 * — goes right after the nearest column declared before it, which is where the table's author put
 * it relative to its neighbours.
 */
export const orderColumns = <T>(
  columns: readonly Column<T>[],
  state: ColumnState | undefined,
): Column<T>[] => {
  const byKey = new Map(columns.map((column) => [column.key, column]));
  const keys = (state?.order ?? []).filter(
    (key, index, all) => byKey.has(key) && all.indexOf(key) === index,
  );

  columns.forEach((column, declared) => {
    if (keys.includes(column.key)) return;
    let at = 0;
    for (let previous = declared - 1; previous >= 0; previous--) {
      const position = keys.indexOf(columns[previous].key);
      if (position !== -1) {
        at = position + 1;
        break;
      }
    }
    keys.splice(at, 0, column.key);
  });

  return keys.map((key) => byKey.get(key)!);
};

/** A column that cannot be hidden is always shown, whatever a stored state says about it. */
export const isColumnVisible = <T>(column: Column<T>, state: ColumnState | undefined): boolean => {
  if (!isColumnHideable(column)) return true;
  return state?.visibility[column.key] ?? !column.hiddenByDefault;
};

export const visibleColumns = <T>(
  columns: readonly Column<T>[],
  state: ColumnState | undefined,
): Column<T>[] => orderColumns(columns, state).filter((column) => isColumnVisible(column, state));

/**
 * Whether the reader may take this column away. The last visible column is refused: a table with no
 * columns has nothing left to click to bring the others back but the menu, and a header row with
 * no headers looks broken rather than empty.
 */
export const canHideColumn = <T>(
  columns: readonly Column<T>[],
  state: ColumnState | undefined,
  key: string,
): boolean => {
  const column = columns.find((candidate) => candidate.key === key);
  if (!column || !isColumnHideable(column) || !isColumnVisible(column, state)) return false;
  return visibleColumns(columns, state).length > 1;
};

/** The width the reader dragged, never below the column's minimum; `undefined` sizes to content. */
export const columnWidth = <T>(
  column: Column<T>,
  state: ColumnState | undefined,
): number | undefined => {
  const width = state?.widths[column.key];
  if (width === undefined || !isColumnResizable(column)) return undefined;
  return Math.max(width, minWidthOf(column));
};

const withDefaults = (state: ColumnState | undefined): ColumnState => state ?? emptyColumnState();

export const setColumnVisible = (
  state: ColumnState | undefined,
  key: string,
  visible: boolean,
): ColumnState => {
  const current = withDefaults(state);
  return { ...current, visibility: { ...current.visibility, [key]: visible } };
};

/**
 * Moves a column to a position in the full order — hidden columns included, since the menu that
 * calls this lists them too. The resulting order names every column, so the move survives a
 * column being added later without the moved one drifting back.
 */
export const moveColumn = <T>(
  columns: readonly Column<T>[],
  state: ColumnState | undefined,
  key: string,
  to: number,
): ColumnState => {
  const keys = orderColumns(columns, state).map((column) => column.key);
  const from = keys.indexOf(key);
  if (from === -1) return withDefaults(state);
  keys.splice(from, 1);
  keys.splice(Math.max(0, Math.min(to, keys.length)), 0, key);
  return { ...withDefaults(state), order: keys };
};

/** `null` forgets the width, which hands the column back to its content. */
export const setColumnWidth = (
  state: ColumnState | undefined,
  key: string,
  width: number | null,
): ColumnState => {
  const current = withDefaults(state);
  const others = Object.fromEntries(
    Object.entries(current.widths).filter(([column]) => column !== key),
  );
  return {
    ...current,
    widths: width === null ? others : { ...others, [key]: Math.round(width) },
  };
};

/** Whether the state asks for anything other than what the columns declare. */
export const isColumnStateEmpty = (state: ColumnState | undefined): boolean =>
  !state ||
  (state.order.length === 0 &&
    Object.keys(state.visibility).length === 0 &&
    Object.keys(state.widths).length === 0);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Reads a state back from untrusted JSON — storage an older release wrote, or one a person edited
 * by hand. Entries of the wrong type are dropped one by one instead of failing the whole state, so
 * a single bad width does not cost the reader their column order.
 */
export const parseColumnState = (value: unknown): ColumnState | undefined => {
  if (!isRecord(value) || value.v !== STORAGE_VERSION) return undefined;

  const order = Array.isArray(value.order)
    ? value.order.filter((key): key is string => typeof key === "string")
    : [];
  const visibility: Record<string, boolean> = {};
  if (isRecord(value.visibility))
    for (const [key, shown] of Object.entries(value.visibility))
      if (typeof shown === "boolean") visibility[key] = shown;

  const widths: Record<string, number> = {};
  if (isRecord(value.widths))
    for (const [key, width] of Object.entries(value.widths))
      if (typeof width === "number" && Number.isFinite(width) && width > 0) widths[key] = width;

  return { order, visibility, widths };
};

/**
 * Storage access throws outright in a sandboxed frame or with site data blocked, and a table that
 * forgets its layout is not worth an exception — both helpers swallow it, as the shell's sidebar
 * does.
 */
export const readColumnState = (storageKey: string): ColumnState | undefined => {
  if (typeof localStorage === "undefined") return undefined;
  try {
    const raw = localStorage.getItem(storageKey);
    return raw === null ? undefined : parseColumnState(JSON.parse(raw));
  } catch {
    return undefined;
  }
};

export const writeColumnState = (storageKey: string, state: ColumnState | undefined): void => {
  if (typeof localStorage === "undefined") return;
  try {
    if (isColumnStateEmpty(state)) localStorage.removeItem(storageKey);
    else localStorage.setItem(storageKey, JSON.stringify({ v: STORAGE_VERSION, ...state }));
  } catch {
    // Same sandbox as above.
  }
};
