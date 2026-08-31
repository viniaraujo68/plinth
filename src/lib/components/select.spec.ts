import { describe, expect, it } from "vitest";
import { matchesSelectQuery, nextSelectableIndex, normalizeForSearch } from "./select.js";

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
