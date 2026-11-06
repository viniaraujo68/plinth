import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  filterOptions,
  isTypedKey,
  matchesSelectQuery,
  nearestSelectableIndex,
  nextSelectableIndex,
  normalizeForSearch,
  Typeahead,
  typeaheadMatch,
} from "./select.js";

describe("normalizeForSearch", () => {
  it("folds case", () => {
    expect(normalizeForSearch("Itaipava")).toBe("itaipava");
  });

  it("folds every accent Portuguese puts on a vowel", () => {
    expect(normalizeForSearch("Otávio Grêmio Antônio Açaí Ambiguïté")).toBe(
      "otavio gremio antonio acai ambiguite",
    );
  });

  it("folds a decomposed string the same way as its precomposed twin", () => {
    // The same word typed on a keyboard (precomposed) and pasted out of a system that stores NFD
    // -- macOS filenames, some databases. They have to search alike.
    expect(normalizeForSearch("São")).toBe("sao");
    expect(normalizeForSearch("São")).toBe("sao");
  });

  it("leaves a string with nothing to fold untouched", () => {
    expect(normalizeForSearch("centro")).toBe("centro");
  });
});

describe("matchesSelectQuery", () => {
  const option = { value: "otavio-rocha", label: "Otávio Rocha" };

  it("matches an unaccented query against an accented label", () => {
    expect(matchesSelectQuery(option, "otavio")).toBe(true);
  });

  it("matches an accented query against the same label", () => {
    expect(matchesSelectQuery(option, "Otávio")).toBe(true);
  });

  it("matches in the middle of the label, not only at the start", () => {
    // The whole reason the component exists: native type-ahead is prefix-only.
    expect(matchesSelectQuery(option, "rocha")).toBe(true);
  });

  it("rejects a query the label does not contain", () => {
    expect(matchesSelectQuery(option, "itaipava")).toBe(false);
  });

  it("searches the label and not the value", () => {
    expect(matchesSelectQuery({ value: "BR-13", label: "Centro" }, "br-13")).toBe(false);
  });

  it("needs every word of the query, in any order", () => {
    expect(matchesSelectQuery(option, "rocha otavio")).toBe(true);
    expect(matchesSelectQuery(option, "  otavio   rocha ")).toBe(true);
    expect(matchesSelectQuery(option, "otavio itaipava")).toBe(false);
  });

  it("matches everything for a blank query", () => {
    expect(matchesSelectQuery(option, "")).toBe(true);
    expect(matchesSelectQuery(option, "   ")).toBe(true);
  });
});

describe("filterOptions", () => {
  const options = [
    { value: "1", label: "Agrológica" },
    { value: "2", label: "AGROFORTE" },
    { value: "3", label: "São Paulo" },
    { value: "4", label: "ACME — 12.345.678/0001-99" },
  ];
  type Row = (typeof options)[number];
  const byLabel = (row: Row) => row.label;
  const values = (query: string, text: (row: Row) => string = byLabel) =>
    filterOptions(options, query, text).map((row) => row.value);

  it("returns the same list for a blank query", () => {
    expect(filterOptions(options, "", byLabel)).toBe(options);
    expect(filterOptions(options, "   ", byLabel)).toBe(options);
  });

  it("matches case- and accent-insensitively, anywhere in the text", () => {
    expect(values("agro")).toEqual(["1", "2"]);
    expect(values("agrologica")).toEqual(["1"]);
    expect(values("sao paulo")).toEqual(["3"]);
    expect(values("acme")).toEqual(["4"]);
  });

  it("needs every word, in any order, each within one word of the text", () => {
    expect(values("12.345 acme")).toEqual(["4"]);
    expect(values("acme paulo")).toEqual([]);
    expect(values("sa op")).toEqual([]);
  });

  it("keeps punctuation significant", () => {
    expect(values("12.345.678/0001-99")).toEqual(["4"]);
    expect(values("12345678")).toEqual([]);
  });

  it("searches whatever text the caller hands it", () => {
    const withDigits = (row: Row) => `${row.label} ${row.label.replace(/\D/g, "")}`;
    expect(values("12345678", withDigits)).toEqual(["4"]);
  });
});

describe("nextSelectableIndex", () => {
  const options = [
    { value: "a", label: "A" },
    { value: "b", label: "B", disabled: true },
    { value: "c", label: "C" },
  ];

  it("returns the starting index when it is already selectable", () => {
    expect(nextSelectableIndex(options, 0, 1)).toBe(0);
  });

  it("steps over a disabled row in the direction it was given", () => {
    expect(nextSelectableIndex(options, 1, 1)).toBe(2);
    expect(nextSelectableIndex(options, 1, -1)).toBe(0);
  });

  it("stops at the end instead of wrapping", () => {
    // Holding an arrow key rests against the edge; a wrap would spin the list forever.
    expect(nextSelectableIndex(options, 3, 1)).toBe(-1);
    expect(nextSelectableIndex(options, -1, -1)).toBe(-1);
  });

  it("finds nothing in a list with nothing selectable in it", () => {
    expect(nextSelectableIndex([{ value: "a", label: "A", disabled: true }], 0, 1)).toBe(-1);
    expect(nextSelectableIndex([], 0, 1)).toBe(-1);
  });
});

const months = [
  { value: "jan", label: "January" },
  { value: "feb", label: "February", disabled: true },
  { value: "mar", label: "March" },
  { value: "apr", label: "April" },
  { value: "may", label: "May" },
];

describe("nearestSelectableIndex", () => {
  it("keeps a selectable index", () => {
    expect(nearestSelectableIndex(months, 2)).toBe(2);
  });

  it("moves forward from a disabled index", () => {
    expect(nearestSelectableIndex(months, 1)).toBe(2);
  });

  it("clamps an index past either end, then looks back", () => {
    expect(nearestSelectableIndex(months, 9)).toBe(4);
    expect(nearestSelectableIndex(months, -3)).toBe(0);
    expect(nearestSelectableIndex(months.slice(0, 2), 1)).toBe(0);
  });

  it("finds nothing in a list with nothing selectable in it", () => {
    expect(nearestSelectableIndex([], 0)).toBe(-1);
    expect(nearestSelectableIndex([months[1]], 0)).toBe(-1);
  });
});

describe("typeaheadMatch", () => {
  it("finds the next label starting with the typed text, ignoring case and accents", () => {
    expect(typeaheadMatch(months, 0, "ma")).toBe(2);
    expect(typeaheadMatch(months, 0, "MAR")).toBe(2);
    expect(typeaheadMatch([{ value: "s", label: "São Paulo" }], -1, "sao")).toBe(0);
  });

  it("moves past the active row on one letter, and wraps around", () => {
    expect(typeaheadMatch(months, 2, "m")).toBe(4);
    expect(typeaheadMatch(months, 4, "m")).toBe(2);
  });

  it("cycles while the same letter is repeated", () => {
    expect(typeaheadMatch(months, 2, "mm")).toBe(4);
  });

  it("stays on the active row while a longer prefix still matches it", () => {
    expect(typeaheadMatch(months, 2, "ma")).toBe(2);
    expect(typeaheadMatch(months, 2, "may")).toBe(4);
  });

  it("starts from the top when nothing is active", () => {
    expect(typeaheadMatch(months, -1, "j")).toBe(0);
  });

  it("skips disabled rows", () => {
    expect(typeaheadMatch(months, 0, "f")).toBe(-1);
  });

  it("finds nothing in an empty list or for a prefix no label has", () => {
    expect(typeaheadMatch([], -1, "ab")).toBe(-1);
    expect(typeaheadMatch(months, 0, "z")).toBe(-1);
  });
});

describe("Typeahead", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("gathers characters typed within half a second into one prefix", () => {
    const typeahead = new Typeahead();
    expect(typeahead.add("b")).toBe("b");
    vi.advanceTimersByTime(499);
    expect(typeahead.add("a")).toBe("ba");
  });

  it("starts a new prefix after half a second of quiet", () => {
    const typeahead = new Typeahead();
    typeahead.add("b");
    vi.advanceTimersByTime(500);
    expect(typeahead.add("i")).toBe("i");
  });

  it("reports typing only while a character came in the last half second", () => {
    vi.setSystemTime(0);
    const typeahead = new Typeahead();
    expect(typeahead.typing).toBe(false);
    typeahead.add("b");
    expect(typeahead.typing).toBe(true);
    vi.advanceTimersByTime(500);
    expect(typeahead.typing).toBe(false);
  });
});

describe("isTypedKey", () => {
  const plain = { ctrlKey: false, metaKey: false, altKey: false };

  it("accepts a single character, Space included", () => {
    expect(isTypedKey({ ...plain, key: "a" })).toBe(true);
    expect(isTypedKey({ ...plain, key: "Ç" })).toBe(true);
    expect(isTypedKey({ ...plain, key: " " })).toBe(true);
  });

  it("rejects named keys and characters typed with Ctrl, Meta or Alt", () => {
    expect(isTypedKey({ ...plain, key: "Enter" })).toBe(false);
    expect(isTypedKey({ ...plain, key: "a", ctrlKey: true })).toBe(false);
    expect(isTypedKey({ ...plain, key: "a", metaKey: true })).toBe(false);
    expect(isTypedKey({ ...plain, key: "a", altKey: true })).toBe(false);
  });
});
