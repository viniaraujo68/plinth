import { describe, expect, it } from "vitest";
import {
  ariaSort,
  cellValue,
  compareSortValues,
  competitionRanks,
  nextSort,
  sortFromParams,
  sortRows,
  sortToParams,
  sortValue,
} from "./sort.js";
import type { Column, SortState, SortValue } from "./types.js";

interface Row {
  id: number;
  name: string;
  size: number | null;
  released: Date | null;
}

const rows: Row[] = [
  { id: 1, name: "beta", size: 20, released: new Date("2001-01-01") },
  { id: 2, name: "Alpha", size: null, released: null },
  { id: 3, name: "gamma", size: 3, released: new Date("1999-06-30") },
];

const name: Column<Row> = { key: "name", label: "Name" };
const size: Column<Row> = { key: "size", label: "Size", numeric: true };
const released: Column<Row> = { key: "released", label: "Released" };

const ids = (list: readonly Row[]) => list.map((row) => row.id);

describe("cellValue", () => {
  it("reads the field named by the key", () => {
    expect(cellValue(name, rows[0])).toBe("beta");
  });

  it("prefers an explicit accessor", () => {
    const ratio: Column<Row> = {
      key: "ratio",
      label: "Ratio",
      value: (row) => (row.size ?? 0) * 2,
    };

    expect(cellValue(ratio, rows[0])).toBe(40);
  });
});

describe("sortValue", () => {
  it("falls back to the cell value", () => {
    expect(sortValue(size, rows[0])).toBe(20);
  });

  it("prefers sortBy, which is how a formatted cell keeps a real order", () => {
    const column: Column<Row> = { key: "released", label: "Released", sortBy: (row) => row.id };

    expect(sortValue(column, rows[0])).toBe(1);
  });

  it("keeps a missing value missing rather than stringifying it", () => {
    expect(sortValue(size, rows[1])).toBeNull();
  });

  it("stringifies a value it cannot order", () => {
    const column: Column<Row> = { key: "tags", label: "Tags", value: () => ["a", "b"] };

    expect(sortValue(column, rows[0])).toBe("a,b");
  });
});

describe("compareSortValues", () => {
  it("subtracts numbers instead of comparing them as text", () => {
    expect(compareSortValues(9, 10)).toBeLessThan(0);
  });

  it("compares dates by instant", () => {
    expect(compareSortValues(new Date("2020-01-02"), new Date("2020-01-01"))).toBeGreaterThan(0);
  });

  it("orders embedded numbers naturally", () => {
    expect(compareSortValues("Row 9", "Row 10")).toBeLessThan(0);
  });

  it("ignores case, so equal names keep their incoming order", () => {
    expect(compareSortValues("alpha", "ALPHA")).toBe(0);
  });

  it("falls back to text for mixed types instead of producing NaN", () => {
    expect(compareSortValues(2, "10")).not.toBeNaN();
  });
});

describe("sortRows", () => {
  it("sorts strings ascending, case-insensitively", () => {
    expect(ids(sortRows(rows, name, "asc"))).toEqual([2, 1, 3]);
  });

  it("reverses on descending", () => {
    expect(ids(sortRows(rows, name, "desc"))).toEqual([3, 1, 2]);
  });

  it("sorts numbers by magnitude", () => {
    expect(ids(sortRows(rows, size, "asc"))).toEqual([3, 1, 2]);
  });

  it("keeps missing values last in both directions", () => {
    expect(ids(sortRows(rows, size, "asc")).at(-1)).toBe(2);
    expect(ids(sortRows(rows, size, "desc")).at(-1)).toBe(2);
    expect(ids(sortRows(rows, released, "asc")).at(-1)).toBe(2);
    expect(ids(sortRows(rows, released, "desc")).at(-1)).toBe(2);
  });

  it("treats an invalid date and NaN as missing", () => {
    const broken: Row[] = [
      { id: 1, name: "a", size: Number.NaN, released: new Date("nope") },
      { id: 2, name: "b", size: 1, released: new Date("2020-01-01") },
    ];

    expect(ids(sortRows(broken, size, "asc"))).toEqual([2, 1]);
    expect(ids(sortRows(broken, released, "asc"))).toEqual([2, 1]);
  });

  it("is stable, so equal rows keep their incoming order", () => {
    const tied: Row[] = [
      { id: 1, name: "same", size: 1, released: null },
      { id: 2, name: "SAME", size: 1, released: null },
      { id: 3, name: "same", size: 1, released: null },
    ];

    expect(ids(sortRows(tied, name, "asc"))).toEqual([1, 2, 3]);
    expect(ids(sortRows(tied, name, "desc"))).toEqual([1, 2, 3]);
  });

  it("leaves the input untouched", () => {
    const before = ids(rows);
    sortRows(rows, name, "desc");

    expect(ids(rows)).toEqual(before);
  });
});

describe("nextSort", () => {
  it("opens a text column ascending", () => {
    expect(nextSort(undefined, name)).toEqual({ key: "name", direction: "asc" });
  });

  it("opens a numeric column on its largest value", () => {
    expect(nextSort(undefined, size)).toEqual({ key: "size", direction: "desc" });
  });

  it("honours an explicit opening direction", () => {
    const column: Column<Row> = { ...size, defaultSortDirection: "asc" };

    expect(nextSort(undefined, column)).toEqual({ key: "size", direction: "asc" });
  });

  it("flips the column it already sorts, without a third unsorted step", () => {
    const first = nextSort(undefined, name);
    const second = nextSort(first, name);

    expect(second).toEqual({ key: "name", direction: "desc" });
    expect(nextSort(second, name)).toEqual({ key: "name", direction: "asc" });
  });

  it("adopts a new column at its own opening direction", () => {
    expect(nextSort({ key: "name", direction: "desc" }, size)).toEqual({
      key: "size",
      direction: "desc",
    });
  });
});

describe("ariaSort", () => {
  it("reports none for a column that is not the sorted one", () => {
    expect(ariaSort(undefined, name)).toBe("none");
    expect(ariaSort({ key: "size", direction: "asc" }, name)).toBe("none");
  });

  it("spells out the direction of the sorted column", () => {
    expect(ariaSort({ key: "name", direction: "asc" }, name)).toBe("ascending");
    expect(ariaSort({ key: "name", direction: "desc" }, name)).toBe("descending");
  });
});

describe("competitionRanks", () => {
  const value = (row: { v: SortValue }) => row.v;

  it("gives tied rows the rank of the first of them and skips the places they used", () => {
    const rows = [{ v: 9 }, { v: 7 }, { v: 7 }, { v: 3 }];
    expect(competitionRanks(rows, value)).toEqual([1, 2, 2, 4]);
  });

  it("gives a missing value no rank, and does not let it break a tie after it", () => {
    const rows = [{ v: 5 }, { v: null }, { v: Number.NaN }, { v: undefined }];
    expect(competitionRanks(rows, value)).toEqual([1, null, null, null]);
  });

  it("ties strings the way the table compares them", () => {
    const rows = [{ v: "Ana" }, { v: "ana" }, { v: "Bia" }];
    expect(competitionRanks(rows, value, "pt-BR")).toEqual([1, 1, 3]);
  });

  it("ties equal dates, which are different objects", () => {
    const rows = [{ v: new Date("2026-01-01") }, { v: new Date("2026-01-01") }];
    expect(competitionRanks(rows, value)).toEqual([1, 1]);
  });
});

describe("sortFromParams", () => {
  const fallback: SortState = { key: "rate", direction: "desc" };

  it("reads both pieces from the URL", () => {
    expect(sortFromParams(new URLSearchParams("sort=goals&dir=asc"), fallback)).toEqual({
      key: "goals",
      direction: "asc",
    });
  });

  it("falls back piece by piece, and on a direction it does not recognise", () => {
    expect(sortFromParams(new URLSearchParams("sort=goals"), fallback)).toEqual({
      key: "goals",
      direction: "desc",
    });
    expect(sortFromParams(new URLSearchParams("dir=sideways"), fallback)).toEqual(fallback);
  });

  it("reads under other parameter names", () => {
    const params = new URLSearchParams("order=name&way=asc");
    expect(sortFromParams(params, fallback, { key: "order", direction: "way" })).toEqual({
      key: "name",
      direction: "asc",
    });
  });
});

describe("sortToParams", () => {
  const fallback: SortState = { key: "rate", direction: "desc" };

  it("removes the pieces equal to the fallback", () => {
    expect(sortToParams(fallback, fallback)).toEqual({ sort: null, dir: null });
    expect(sortToParams({ key: "goals", direction: "desc" }, fallback)).toEqual({
      sort: "goals",
      dir: null,
    });
    expect(sortToParams({ key: "rate", direction: "asc" }, fallback)).toEqual({
      sort: null,
      dir: "asc",
    });
  });

  it("round-trips through sortFromParams", () => {
    const sort: SortState = { key: "goals", direction: "asc" };
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(sortToParams(sort, fallback)))
      if (value !== null) params.set(key, value);

    expect(sortFromParams(params, fallback)).toEqual(sort);
  });
});
