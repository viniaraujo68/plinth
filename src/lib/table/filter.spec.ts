import { describe, expect, it } from "vitest";
import {
  addNode,
  emptyFilter,
  filterFromParams,
  filterRows,
  filterRules,
  filterToParams,
  findRule,
  isFilterEmpty,
  nodeAt,
  normalizeFilter,
  operatorsOf,
  removeNode,
  removeRule,
  replaceNode,
  setCombinator,
  setRule,
} from "./filter.js";
import type { Column, FilterGroup, FilterNode, FilterRule } from "./types.js";

interface Player {
  id: number;
  name: string;
  matches: number | null;
  goals: number;
  assists: number;
}

const PLAYERS: Player[] = [
  { id: 1, name: "Ângela", matches: 12, goals: 9, assists: 2 },
  { id: 2, name: "Bruno", matches: 4, goals: 1, assists: 11 },
  { id: 3, name: "Caio", matches: null, goals: 0, assists: 0 },
  { id: 4, name: "Débora", matches: 20, goals: 15, assists: 6 },
];

const columns: Column<Player>[] = [
  {
    key: "name",
    label: "Player",
    filter: {
      kind: "choice",
      value: (row) => row.id,
      options: PLAYERS.map((player) => ({ value: String(player.id), label: player.name })),
    },
  },
  { key: "search", label: "Name", value: (row) => row.name, filter: { kind: "text" } },
  { key: "matches", label: "Matches", numeric: true, filter: { kind: "number" } },
  {
    key: "goals",
    label: "Goals",
    numeric: true,
    filter: { kind: "number", operators: ["gte", "lte"] },
  },
  { key: "assists", label: "Assists", numeric: true, filter: { kind: "number" } },
  { key: "team", label: "Team" },
];

const all = (...children: FilterNode[]): FilterGroup => ({ combinator: "and", children });
const any = (...children: FilterNode[]): FilterGroup => ({ combinator: "or", children });
const ids = (rows: readonly Player[]) => rows.map((row) => row.id);

describe("filterRows", () => {
  it("returns the same rows when nothing filters", () => {
    expect(filterRows(PLAYERS, columns, emptyFilter())).toBe(PLAYERS);
  });

  it("keeps rows whose choice value is among the picked ones", () => {
    const filter = all({ key: "name", operator: "in", value: ["1", "4"] });
    expect(ids(filterRows(PLAYERS, columns, filter))).toEqual([1, 4]);
  });

  it("ANDs the rules of an and-group", () => {
    const filter = all(
      { key: "matches", operator: "gt", value: 10 },
      { key: "goals", operator: "gte", value: 10 },
    );
    expect(ids(filterRows(PLAYERS, columns, filter))).toEqual([4]);
  });

  it("ORs the rules of an or-group", () => {
    const filter = any(
      { key: "goals", operator: "gte", value: 10 },
      { key: "assists", operator: "gte", value: 10 },
    );
    expect(ids(filterRows(PLAYERS, columns, filter))).toEqual([2, 4]);
  });

  it("nests an or-group inside an and-group", () => {
    const filter = all(
      { key: "matches", operator: "gte", value: 1 },
      any(
        { key: "goals", operator: "gte", value: 9 },
        { key: "assists", operator: "gte", value: 10 },
      ),
    );
    expect(ids(filterRows(PLAYERS, columns, filter))).toEqual([1, 2, 4]);
  });

  it("treats a range on one field as two rules", () => {
    const filter = all(
      { key: "goals", operator: "gte", value: 1 },
      { key: "goals", operator: "lte", value: 9 },
    );
    expect(ids(filterRows(PLAYERS, columns, filter))).toEqual([1, 2]);
  });

  it("never matches a missing value, whatever the operator", () => {
    for (const operator of ["lte", "lt", "eq"] as const) {
      const filter = all({ key: "matches", operator, value: 0 });
      expect(ids(filterRows(PLAYERS, columns, filter))).toEqual([]);
    }
  });

  it("matches text without regard to accents or case", () => {
    const contains = all({ key: "search", operator: "contains", value: "ANG" });
    expect(ids(filterRows(PLAYERS, columns, contains))).toEqual([1]);

    const exact = all({ key: "search", operator: "eq", value: "debora" });
    expect(ids(filterRows(PLAYERS, columns, exact))).toEqual([4]);
  });

  it("ignores rules on columns that cannot filter or no longer exist", () => {
    const filter = any(
      { key: "team", operator: "contains", value: "red" },
      { key: "gone", operator: "gte", value: 1 },
    );
    expect(filterRows(PLAYERS, columns, filter)).toBe(PLAYERS);
  });

  it("does not let an invalid rule turn an or-group into match-everything", () => {
    const filter = any(
      { key: "gone", operator: "gte", value: 1 },
      { key: "goals", operator: "gte", value: 15 },
    );
    expect(ids(filterRows(PLAYERS, columns, filter))).toEqual([4]);
  });
});

describe("normalizeFilter", () => {
  it("drops operators the column does not offer, blank values and empty picks", () => {
    const filter = all(
      { key: "goals", operator: "eq", value: 3 },
      { key: "search", operator: "contains", value: "  " },
      { key: "matches", operator: "gte", value: Number.NaN },
      { key: "name", operator: "in", value: [] },
    );
    expect(normalizeFilter(columns, filter)).toEqual(emptyFilter());
    expect(isFilterEmpty(columns, filter)).toBe(true);
  });

  it("keeps only picks that are still options, once each", () => {
    const filter = all({ key: "name", operator: "in", value: ["2", "99", "2"] });
    expect(normalizeFilter(columns, filter).children).toEqual([
      { key: "name", operator: "in", value: ["2"] },
    ]);
  });

  it("drops empty groups and collapses a group of one", () => {
    const filter = all(any(), any({ key: "goals", operator: "gte", value: 1 }), {
      key: "matches",
      operator: "gte",
      value: 1,
    });
    expect(normalizeFilter(columns, filter)).toEqual(
      all(
        { key: "goals", operator: "gte", value: 1 },
        { key: "matches", operator: "gte", value: 1 },
      ),
    );
  });

  it("lifts a lone group to the root", () => {
    const inner = any(
      { key: "goals", operator: "gte", value: 1 },
      { key: "assists", operator: "gte", value: 1 },
    );
    expect(normalizeFilter(columns, all(inner))).toEqual(inner);
  });
});

describe("operatorsOf", () => {
  it("offers the column's own list, else the kind's default", () => {
    expect(operatorsOf({ kind: "number", operators: ["gte"] })).toEqual(["gte"]);
    expect(operatorsOf({ kind: "text" })).toEqual(["contains", "eq"]);
    expect(operatorsOf({ kind: "choice", options: [] })).toEqual(["in"]);
  });
});

describe("top-level rule editing", () => {
  const start = all(
    { key: "goals", operator: "gte", value: 1 },
    { key: "goals", operator: "lte", value: 9 },
  );

  it("replaces the rule in the same slot, in place, without touching the input", () => {
    const next = setRule(start, { key: "goals", operator: "gte", value: 5 });
    expect(next.children).toEqual([
      { key: "goals", operator: "gte", value: 5 },
      { key: "goals", operator: "lte", value: 9 },
    ]);
    expect((start.children[0] as FilterRule).value).toBe(1);
  });

  it("appends a rule for a new slot and finds it back", () => {
    const next = setRule(start, { key: "matches", operator: "gt", value: 10 });
    expect(next.children).toHaveLength(3);
    expect(findRule(next, "matches", "gt")?.value).toBe(10);
  });

  it("removes one slot, or every slot of a key", () => {
    expect(removeRule(start, "goals", "lte").children).toEqual([start.children[0]]);
    expect(removeRule(start, "goals").children).toEqual([]);
  });
});

describe("tree editing by path", () => {
  const rule = (value: number): FilterRule => ({ key: "goals", operator: "gte", value });
  const tree = all(rule(1), any(rule(2), rule(3)));

  it("reads a node by path", () => {
    expect(nodeAt(tree, [1, 0])).toEqual(rule(2));
    expect(nodeAt(tree, [0, 0])).toBeUndefined();
    expect(nodeAt(tree, [7])).toBeUndefined();
  });

  it("adds, replaces and removes inside a nested group", () => {
    const added = addNode(tree, [1], rule(4));
    expect(filterRules(added).map((r) => r.value)).toEqual([1, 2, 3, 4]);

    const replaced = replaceNode(added, [1, 1], rule(9));
    expect(filterRules(replaced).map((r) => r.value)).toEqual([1, 2, 9, 4]);

    const removed = removeNode(replaced, [1, 0]);
    expect(filterRules(removed).map((r) => r.value)).toEqual([1, 9, 4]);

    expect(filterRules(tree).map((r) => r.value)).toEqual([1, 2, 3]);
  });

  it("switches a group's combinator", () => {
    expect(setCombinator(tree, [], "or").combinator).toBe("or");
    expect((setCombinator(tree, [1], "and").children[1] as FilterGroup).combinator).toBe("and");
  });
});

describe("URL round trip", () => {
  it("writes nothing for an empty filter, so the URL stays clean", () => {
    expect(filterToParams(emptyFilter())).toEqual({ filter: null });
    expect(filterToParams(all(any()))).toEqual({ filter: null });
  });

  it("keeps a flat and-filter as a plain list", () => {
    const filter = all(
      { key: "goals", operator: "gte", value: 5 },
      { key: "name", operator: "in", value: ["1", "4"] },
    );
    expect(filterToParams(filter).filter).toBe("goals:gte:5;name:in:1,4");
  });

  it("reads back what it wrote, groups and separators included", () => {
    const filter = all(
      { key: "name", operator: "in", value: ["1", "4"] },
      { key: "search", operator: "contains", value: "a:b;c,d (é)" },
      any(
        { key: "matches", operator: "gt", value: 10.5 },
        all(
          { key: "goals", operator: "gte", value: 3 },
          { key: "assists", operator: "lt", value: 2 },
        ),
      ),
    );
    const params = new URLSearchParams({ q: filterToParams(filter, "q").q! });
    expect(filterFromParams(params, columns, "q")).toEqual(filter);
  });

  it("round-trips an or-root", () => {
    const filter = any(
      { key: "goals", operator: "gte", value: 10 },
      { key: "assists", operator: "gte", value: 10 },
    );
    const written = filterToParams(filter).filter!;
    expect(written).toBe("or(goals:gte:10;assists:gte:10)");
    expect(filterFromParams(new URLSearchParams({ filter: written }), columns)).toEqual(filter);
  });

  it("drops what a hand-edited URL gets wrong and keeps the rest", () => {
    const params = new URLSearchParams({
      filter:
        "goals:gte:abc;goals:eq:3;name:in:2,99;gone:gte:1;matches:gt:;broken;%E0:in:1;goals:lte:7",
    });
    expect(filterFromParams(params, columns)).toEqual(
      all(
        { key: "name", operator: "in", value: ["2"] },
        { key: "goals", operator: "lte", value: 7 },
      ),
    );
  });

  it("gives up on a malformed structure instead of guessing", () => {
    for (const filter of [
      "or(goals:gte:1",
      "goals:gte:1)",
      "xor(goals:gte:1)",
      "or(or(or(or(or(goals:gte:1)))))",
    ])
      expect(filterFromParams(new URLSearchParams({ filter }), columns)).toEqual(emptyFilter());
  });
});
