import { describe, expect, it } from "vitest";
import {
  ancestorLines,
  copyAllJson,
  copyJson,
  flattenJson,
  lineText,
  lineWidthCh,
  matchColumnCh,
  matchSegments,
  maxLineWidthCh,
  searchJson,
  subtreeHasMatch,
  visibleLines,
  type JsonLine,
} from "./json-view.js";

const ORDER = {
  id: "ord-4821",
  placed: true,
  total: 129.9,
  notes: null,
  customer: { name: "Mara Quill", tags: ["loyal", "wholesale"] },
  items: [
    { sku: "TEA-001", qty: 2, options: {} },
    { sku: "MUG-014", qty: 1, options: { glaze: "Slate" } },
  ],
  empty: [],
};

const texts = (lines: readonly JsonLine[]) => lines.map(lineText);
const pointers = (lines: readonly JsonLine[]) => lines.map((line) => line.pointer);

describe("flattenJson", () => {
  it("emits open, value and close lines in document order", () => {
    const lines = flattenJson({ a: 1, b: [true, null] });

    expect(lines.map((line) => line.kind)).toEqual([
      "open",
      "value",
      "open",
      "value",
      "value",
      "close",
      "close",
    ]);
    expect(texts(lines)).toEqual(["{", '"a": 1,', '"b": [', "true,", "null", "]", "}"]);
    expect(lines.map((line) => line.depth)).toEqual([0, 1, 1, 2, 2, 1, 0]);
  });

  it("types every value token", () => {
    const lines = flattenJson(["x", 1, false, null]);

    expect(lines.slice(1, 5).map((line) => line.type)).toEqual([
      "string",
      "number",
      "boolean",
      "null",
    ]);
  });

  it("derives ids from the JSON pointer, escaping slashes and tildes", () => {
    const lines = flattenJson({ "a/b": { "c~d": [0] } });

    expect(pointers(lines)).toEqual([
      "",
      "/a~1b",
      "/a~1b/c~0d",
      "/a~1b/c~0d/0",
      "/a~1b/c~0d",
      "/a~1b",
      "",
    ]);
    expect(new Set(lines.map((line) => line.id)).size).toBe(lines.length);
  });

  it("keeps ids across a refresh of the same shape", () => {
    const before = flattenJson({ user: { name: "Ann", roles: ["a"] } });
    const after = flattenJson({ user: { name: "Bea", roles: ["b"] } });

    expect(after.map((line) => line.id)).toEqual(before.map((line) => line.id));
  });

  it("records where each subtree ends and which line holds it", () => {
    const lines = flattenJson(ORDER);
    const customer = lines.findIndex((line) => line.pointer === "/customer");

    expect(lines[customer].end).toBe(customer + 7);
    expect(lines[lines[customer].end - 1]).toMatchObject({ kind: "close", pointer: "/customer" });
    expect(lines[customer + 1].parent).toBe(customer);
    expect(lines[0].parent).toBe(-1);
  });

  it("renders an empty container as one line with no close", () => {
    const lines = flattenJson({ a: {}, b: [] });

    expect(texts(lines)).toEqual(["{", '"a": {},', '"b": []', "}"]);
    expect(lines[1]).toMatchObject({ kind: "open", size: 0, end: 2 });
  });

  it("renders an empty root as a single line", () => {
    expect(texts(flattenJson({}))).toEqual(["{}"]);
    expect(texts(flattenJson([]))).toEqual(["[]"]);
  });

  it("keeps the source value on every line", () => {
    const when = new Date("2026-03-04T05:06:07.000Z");
    const lines = flattenJson({ when });

    expect(lines[1].source).toBe(when);
  });
});

describe("values JSON cannot hold", () => {
  it("shows a Date as the ISO string toJSON gives", () => {
    const lines = flattenJson({ at: new Date("2026-03-04T05:06:07.000Z") });

    expect(lineText(lines[1])).toBe('"at": "2026-03-04T05:06:07.000Z"');
    expect(lines[1].type).toBe("string");
  });

  it("shows an invalid Date as null, as toJSON does", () => {
    expect(lineText(flattenJson([new Date(Number.NaN)])[1])).toBe("null");
  });

  it("calls toJSON with the key and walks what it returns", () => {
    const keys: string[] = [];
    const money = (cents: number) => ({
      toJSON: (key: string) => {
        keys.push(key);
        return { amount: cents / 100, currency: "EUR" };
      },
    });
    const value = { price: money(1250), list: [money(99)] };

    const copied = copyAllJson(flattenJson(value));

    expect(keys).toEqual(["price", "0"]);
    expect(copied).toBe(JSON.stringify(value, null, 2));
  });

  it("drops undefined, functions and symbols from objects, as JSON.stringify does", () => {
    const value = { a: undefined, b: () => 1, c: Symbol("c"), d: 1 };

    expect(texts(flattenJson(value))).toEqual(["{", '"d": 1', "}"]);
  });

  it("turns undefined, functions and symbols in arrays into null", () => {
    const value = [undefined, () => 1, Symbol("s"), 2];

    expect(texts(flattenJson(value))).toEqual(["[", "null,", "null,", "null,", "2", "]"]);
  });

  it("renders nothing for a root JSON.stringify would drop", () => {
    expect(flattenJson(undefined)).toEqual([]);
    expect(flattenJson(() => 1)).toEqual([]);
    expect(copyAllJson(flattenJson(undefined))).toBe("");
  });

  it("shows Map and Set by their own enumerable properties, which is {}", () => {
    const value = { map: new Map([["a", 1]]), set: new Set([1, 2]) };

    expect(texts(flattenJson(value))).toEqual(["{", '"map": {},', '"set": {}', "}"]);
    expect(copyAllJson(flattenJson(value))).toBe(JSON.stringify(value, null, 2));
  });

  it("shows non-finite numbers as null and -0 as 0", () => {
    const value = [Number.NaN, Number.POSITIVE_INFINITY, -0];

    expect(texts(flattenJson(value))).toEqual(["[", "null,", "null,", "0", "]"]);
    expect(flattenJson(value)[1].type).toBe("null");
  });

  it("unwraps boxed primitives", () => {
    const value = [Object("text"), Object(3), Object(true)] as unknown[];

    expect(copyAllJson(flattenJson(value))).toBe(JSON.stringify(value, null, 2));
  });

  it("shows a bigint as its digits, where JSON.stringify would throw", () => {
    const lines = flattenJson({ big: 12345678901234567890n });

    expect(lineText(lines[1])).toBe('"big": 12345678901234567890');
    expect(lines[1].type).toBe("number");
  });

  it("marks a cycle instead of recursing", () => {
    const node: Record<string, unknown> = { name: "root" };
    node.self = node;
    node.list = [node];

    const lines = flattenJson(node);

    expect(texts(lines)).toEqual([
      "{",
      '"name": "root",',
      '"self": [Circular],',
      '"list": [',
      "[Circular]",
      "]",
      "}",
    ]);
    expect(lines[2].type).toBe("circular");
  });

  it("names the cycle marker as it is told", () => {
    const node: Record<string, unknown> = {};
    node.loop = node;

    expect(lineText(flattenJson(node, { circular: "<loop>" })[1])).toBe('"loop": <loop>');
  });

  it("shows a value shared by siblings twice, since that is no cycle", () => {
    const shared = { x: 1 };
    const value = { a: shared, b: shared };

    expect(copyAllJson(flattenJson(value))).toBe(JSON.stringify(value, null, 2));
  });
});

describe("visibleLines", () => {
  it("lists every line when nothing is collapsed", () => {
    const lines = flattenJson(ORDER);

    expect(visibleLines(lines, new Set())).toEqual(lines.map((_, index) => index));
  });

  it("skips a collapsed subtree down to its open line", () => {
    const lines = flattenJson(ORDER);
    const items = lines.findIndex((line) => line.pointer === "/items");
    const visible = visibleLines(lines, new Set(["/items"]));

    expect(visible).toContain(items);
    expect(visible).not.toContain(items + 1);
    expect(visible[visible.indexOf(items) + 1]).toBe(lines[items].end);
  });

  it("shows only the root line when the root is collapsed", () => {
    expect(visibleLines(flattenJson(ORDER), new Set([""]))).toEqual([0]);
  });

  it("ignores a collapsed pointer that names an empty container or a value", () => {
    const lines = flattenJson(ORDER);

    expect(visibleLines(lines, new Set(["/empty", "/id"])).length).toBe(lines.length);
  });
});

describe("ancestorLines", () => {
  it("walks the parents up to the root", () => {
    const lines = flattenJson(ORDER);
    const glaze = lines.findIndex((line) => line.pointer === "/items/1/options/glaze");

    expect(ancestorLines(lines, glaze).map((index) => lines[index].pointer)).toEqual([
      "/items/1/options",
      "/items/1",
      "/items",
      "",
    ]);
  });
});

describe("searchJson", () => {
  it("finds every occurrence in keys and values, case-insensitively", () => {
    const lines = flattenJson({ Slate: "slate and SLATE", other: 1 });

    expect(searchJson(lines, "slate")).toEqual([
      { line: 1, field: "name", start: 1, length: 5 },
      { line: 1, field: "value", start: 1, length: 5 },
      { line: 1, field: "value", start: 11, length: 5 },
    ]);
  });

  it("searches inside content a fold would hide", () => {
    const lines = flattenJson(ORDER);
    const [match] = searchJson(lines, "glaze");

    expect(lines[match.line].pointer).toBe("/items/1/options/glaze");
  });

  it("finds nothing for an empty query", () => {
    expect(searchJson(flattenJson(ORDER), "")).toEqual([]);
  });

  it("searches numbers, booleans and null as their tokens", () => {
    const lines = flattenJson({ a: 129.9, b: true, c: null });

    expect(searchJson(lines, "29.").map((match) => match.line)).toEqual([1]);
    expect(searchJson(lines, "true").map((match) => match.line)).toEqual([2]);
    expect(searchJson(lines, "null").map((match) => match.line)).toEqual([3]);
  });

  it("keeps offsets aligned when lowercasing would change a length", () => {
    const lines = flattenJson(["İx"]);
    const [match] = searchJson(lines, "x");

    expect(lines[match.line].text.slice(match.start, match.start + match.length)).toBe("x");
  });

  it("tells whether a subtree holds a match", () => {
    const lines = flattenJson(ORDER);
    const matches = searchJson(lines, "slate");
    const items = lines.findIndex((line) => line.pointer === "/items");
    const customer = lines.findIndex((line) => line.pointer === "/customer");

    expect(subtreeHasMatch(matches, items, lines[items].end)).toBe(true);
    expect(subtreeHasMatch(matches, customer, lines[customer].end)).toBe(false);
  });
});

describe("matchSegments", () => {
  it("splits the text around every occurrence", () => {
    expect(matchSegments('"Tea for tea"', "tea")).toEqual([
      { text: '"', start: 0, match: false },
      { text: "Tea", start: 1, match: true },
      { text: " for ", start: 4, match: false },
      { text: "tea", start: 9, match: true },
      { text: '"', start: 12, match: false },
    ]);
  });

  it("returns the whole text when there is nothing to highlight", () => {
    expect(matchSegments("abc", "")).toEqual([{ text: "abc", start: 0, match: false }]);
    expect(matchSegments("abc", "z")).toEqual([{ text: "abc", start: 0, match: false }]);
  });
});

describe("widths", () => {
  it("counts the gutter, the indent, the key and the comma", () => {
    const lines = flattenJson({ ab: "xyz", c: 1 });

    expect(lineWidthCh(lines[1])).toBe(2 + 2 + 4 + 2 + 5 + 1);
    expect(lineWidthCh(lines[2])).toBe(2 + 2 + 3 + 2 + 1);
  });

  it("measures a non-empty container by its folded summary", () => {
    const lines = flattenJson({ list: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] });

    expect(lineWidthCh(lines[1])).toBe(2 + 2 + 6 + 2 + 3 + 1 + 2);
  });

  it("takes the widest line for the track", () => {
    const lines = flattenJson({ short: 1, much_longer_key: "and a long value" });

    expect(maxLineWidthCh(lines)).toBe(Math.max(...lines.map(lineWidthCh)));
  });

  it("places a match at its column", () => {
    const lines = flattenJson({ key: "value" });
    const [onName] = searchJson(lines, "key");
    const [onValue] = searchJson(lines, "val");

    expect(matchColumnCh(lines[1], onName)).toBe(2 + 2 + 1);
    expect(matchColumnCh(lines[1], onValue)).toBe(2 + 2 + 7 + 1);
  });
});

describe("copy", () => {
  const FIXTURES: [string, unknown][] = [
    ["a nested document", ORDER],
    ["a scalar root", "just text"],
    ["a number root", 42],
    ["null", null],
    ["an empty object", {}],
    ["an empty array", []],
    ["arrays of arrays", [[1, [2, []]], [{}], [[[]]]]],
    ["escapes", { 'qu"ote': "line\nbreak\ttab   \\", emoji: "😀", "": "" }],
    ["a date and undefined", { at: new Date(0), gone: undefined, list: [undefined] }],
    ["a sparse array", Object.assign(new Array<number>(3), { 0: 1, 2: 3 })],
  ];

  it.each(FIXTURES)("copies %s exactly as JSON.stringify prints it", (_, value) => {
    expect(copyAllJson(flattenJson(value))).toBe(JSON.stringify(value, null, 2));
  });

  it("copies expanded content regardless of what is folded on screen", () => {
    const lines = flattenJson(ORDER);
    const everything = new Set(lines.map((line) => line.pointer));

    expect(
      copyJson(lines, everything, { line: 0, column: 0 }, { line: lines.length - 1, column: 1 }),
    ).toBe(JSON.stringify(ORDER, null, 2));
  });

  it("slices the endpoint lines by column and keeps the inner indentation", () => {
    const lines = flattenJson({ a: { b: 1, c: 2 } });

    expect(copyJson(lines, new Set(), { line: 2, column: 5 }, { line: 3, column: 4 })).toBe(
      '1,\n    "c":',
    );
  });

  it("accepts the endpoints in either order", () => {
    const lines = flattenJson({ a: 1, b: 2 });

    expect(copyJson(lines, new Set(), { line: 2, column: 3 }, { line: 1, column: 0 })).toBe(
      '"a": 1,\n  "b"',
    );
  });

  it("copies only the key when a selection stays in a folded line's literal prefix", () => {
    const lines = flattenJson({ items: [1, 2] });

    expect(
      copyJson(lines, new Set(["/items"]), { line: 1, column: 0 }, { line: 1, column: 7 }),
    ).toBe('"items"');
  });

  it("copies the whole value when a selection ends in a folded summary", () => {
    const lines = flattenJson({ items: [1, 2], after: true });
    const folded = new Set(["/items"]);

    expect(copyJson(lines, folded, { line: 1, column: 0 }, { line: 1, column: 12 })).toBe(
      '"items": [\n    1,\n    2\n  ],',
    );
  });

  it("starts after the bracket when a selection begins in a folded summary", () => {
    const lines = flattenJson({ items: [1, 2], after: true });
    const folded = new Set(["/items"]);
    const after = lines.findIndex((line) => line.pointer === "/after");

    expect(copyJson(lines, folded, { line: 1, column: 11 }, { line: after, column: 7 })).toBe(
      '\n    1,\n    2\n  ],\n  "after"',
    );
  });

  it("copies nothing from nothing", () => {
    expect(copyJson([], new Set(), { line: 0, column: 0 }, { line: 0, column: 1 })).toBe("");
  });
});
