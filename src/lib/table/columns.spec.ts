import { afterEach, describe, expect, it, vi } from "vitest";
import {
  canHideColumn,
  columnWidth,
  DEFAULT_MIN_WIDTH,
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
import type { Column, ColumnState } from "./types.js";

type Row = Record<string, unknown>;

const COLUMNS: Column<Row>[] = [
  { key: "name", label: "Name", hideable: false },
  { key: "year", label: "Year" },
  { key: "typing", label: "Typing", hiddenByDefault: true },
  { key: "notes", label: "Notes", minWidth: 120 },
];

const keys = (columns: Column<Row>[]) => columns.map((column) => column.key);

const state = (partial: Partial<ColumnState>): ColumnState => ({
  ...emptyColumnState(),
  ...partial,
});

describe("orderColumns", () => {
  it("keeps the declared order when there is no state", () => {
    expect(keys(orderColumns(COLUMNS, undefined))).toEqual(["name", "year", "typing", "notes"]);
  });

  it("follows the stored order", () => {
    const stored = state({ order: ["notes", "year", "name", "typing"] });
    expect(keys(orderColumns(COLUMNS, stored))).toEqual(["notes", "year", "name", "typing"]);
  });

  it("skips keys that no longer name a column and counts a repeated key once", () => {
    const stored = state({ order: ["gone", "year", "year", "name", "typing", "notes"] });
    expect(keys(orderColumns(COLUMNS, stored))).toEqual(["year", "name", "typing", "notes"]);
  });

  // The state was saved before `typing` existed: it lands after `year`, its declared neighbour,
  // rather than at the end where nobody asked for it.
  it("places a column the state never heard of after its declared neighbour", () => {
    const stored = state({ order: ["notes", "year", "name"] });
    expect(keys(orderColumns(COLUMNS, stored))).toEqual(["notes", "year", "typing", "name"]);
  });

  it("puts a new first column at the start", () => {
    const stored = state({ order: ["notes", "year", "typing"] });
    expect(keys(orderColumns(COLUMNS, stored))).toEqual(["name", "notes", "year", "typing"]);
  });
});

describe("visibility", () => {
  it("hides a column that starts hidden until the reader shows it", () => {
    expect(keys(visibleColumns(COLUMNS, undefined))).toEqual(["name", "year", "notes"]);
    const shown = setColumnVisible(undefined, "typing", true);
    expect(keys(visibleColumns(COLUMNS, shown))).toEqual(["name", "year", "typing", "notes"]);
  });

  it("never hides a column that is not hideable, whatever the state says", () => {
    expect(isColumnVisible(COLUMNS[0], state({ visibility: { name: false } }))).toBe(true);
  });

  it("refuses to hide the last visible column", () => {
    const columns: Column<Row>[] = [
      { key: "a", label: "A" },
      { key: "b", label: "B" },
    ];
    expect(canHideColumn(columns, undefined, "a")).toBe(true);
    const oneLeft = setColumnVisible(undefined, "b", false);
    expect(canHideColumn(columns, oneLeft, "a")).toBe(false);
  });

  it("refuses to hide a locked or an already hidden column", () => {
    expect(canHideColumn(COLUMNS, undefined, "name")).toBe(false);
    expect(canHideColumn(COLUMNS, undefined, "typing")).toBe(false);
    expect(canHideColumn(COLUMNS, undefined, "missing")).toBe(false);
  });
});

describe("moveColumn", () => {
  it("moves a column to a position in the full order", () => {
    const moved = moveColumn(COLUMNS, undefined, "notes", 0);
    expect(moved.order).toEqual(["notes", "name", "year", "typing"]);
  });

  it("clamps a position past either end", () => {
    expect(moveColumn(COLUMNS, undefined, "name", 99).order).toEqual([
      "year",
      "typing",
      "notes",
      "name",
    ]);
    expect(moveColumn(COLUMNS, undefined, "notes", -3).order[0]).toBe("notes");
  });

  it("leaves the state alone for a key that is not a column", () => {
    expect(moveColumn(COLUMNS, undefined, "missing", 0)).toEqual(emptyColumnState());
  });

  it("does not edit the state it was given", () => {
    const before = state({ order: ["name", "year"] });
    moveColumn(COLUMNS, before, "year", 0);
    expect(before.order).toEqual(["name", "year"]);
  });
});

describe("widths", () => {
  it("rounds a dragged width and forgets it on null", () => {
    const sized = setColumnWidth(undefined, "year", 140.6);
    expect(sized.widths).toEqual({ year: 141 });
    expect(setColumnWidth(sized, "year", null).widths).toEqual({});
  });

  it("never reports a width below the column's minimum", () => {
    const narrow = state({ widths: { notes: 30, year: 10 } });
    expect(columnWidth(COLUMNS[3], narrow)).toBe(120);
    expect(columnWidth(COLUMNS[1], narrow)).toBe(DEFAULT_MIN_WIDTH);
  });

  it("ignores a stored width for a column that is not resizable", () => {
    const fixed: Column<Row> = { key: "year", label: "Year", resizable: false };
    expect(columnWidth(fixed, state({ widths: { year: 200 } }))).toBeUndefined();
  });
});

describe("isColumnStateEmpty", () => {
  it("reads an absent or blank state as empty", () => {
    expect(isColumnStateEmpty(undefined)).toBe(true);
    expect(isColumnStateEmpty(emptyColumnState())).toBe(true);
    expect(isColumnStateEmpty(state({ widths: { year: 100 } }))).toBe(false);
  });
});

describe("parseColumnState", () => {
  it("reads a state it wrote", () => {
    expect(
      parseColumnState({ v: 1, order: ["a"], visibility: { a: false }, widths: { a: 90 } }),
    ).toEqual({ order: ["a"], visibility: { a: false }, widths: { a: 90 } });
  });

  it("drops a state from another version, and anything that is not an object", () => {
    expect(parseColumnState({ v: 2, order: [] })).toBeUndefined();
    expect(parseColumnState(null)).toBeUndefined();
    expect(parseColumnState(["a"])).toBeUndefined();
  });

  it("drops bad entries one by one instead of the whole state", () => {
    expect(
      parseColumnState({
        v: 1,
        order: ["a", 3, "b"],
        visibility: { a: "yes", b: false },
        widths: { a: -4, b: Number.NaN, c: 80, d: "wide" },
      }),
    ).toEqual({ order: ["a", "b"], visibility: { b: false }, widths: { c: 80 } });
  });
});

describe("storage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const memoryStorage = () => {
    const items = new Map<string, string>();
    return {
      getItem: (key: string) => items.get(key) ?? null,
      setItem: (key: string, value: string) => void items.set(key, value),
      removeItem: (key: string) => void items.delete(key),
      items,
    };
  };

  it("writes a state and reads it back", () => {
    const storage = memoryStorage();
    vi.stubGlobal("localStorage", storage);
    const saved = state({ order: ["year", "name"], widths: { year: 120 } });

    writeColumnState("table", saved);

    expect(readColumnState("table")).toEqual(saved);
  });

  it("removes the entry for an empty state instead of storing one", () => {
    const storage = memoryStorage();
    vi.stubGlobal("localStorage", storage);
    writeColumnState("table", state({ widths: { year: 120 } }));

    writeColumnState("table", emptyColumnState());

    expect(storage.items.has("table")).toBe(false);
  });

  it("answers undefined for unparseable storage and for storage that throws", () => {
    const storage = memoryStorage();
    storage.items.set("table", "{not json");
    vi.stubGlobal("localStorage", storage);
    expect(readColumnState("table")).toBeUndefined();

    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    });
    expect(readColumnState("table")).toBeUndefined();
    expect(() => writeColumnState("table", state({ order: ["a"] }))).not.toThrow();
  });

  it("does nothing where there is no storage at all", () => {
    vi.stubGlobal("localStorage", undefined);
    expect(readColumnState("table")).toBeUndefined();
    expect(() => writeColumnState("table", state({ order: ["a"] }))).not.toThrow();
  });
});
