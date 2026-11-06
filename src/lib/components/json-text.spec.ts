import { describe, expect, it } from "vitest";
import { formatJsonText, parseJsonText } from "./json-text.js";

describe("parseJsonText", () => {
  it("parses a document", () => {
    expect(parseJsonText('{"a": [1, 2]}')).toEqual({ valid: true, data: { a: [1, 2] } });
  });

  it("reads blank text as undefined when the field is optional", () => {
    expect(parseJsonText("   \n ")).toEqual({ valid: true, data: undefined });
  });

  it("rejects blank text when the field is required", () => {
    expect(parseJsonText("", { required: true })).toEqual({ valid: false, error: "Required" });
    expect(parseJsonText(" ", { required: true, requiredMessage: "Paste the payload" })).toEqual({
      valid: false,
      error: "Paste the payload",
    });
  });

  it("carries the parser's own message, which names where it broke", () => {
    const result = parseJsonText('{"a": 1,}');

    expect(result.valid).toBe(false);
    expect(result.valid === false && result.error).toMatch(/position|column|line/i);
  });

  it("accepts the scalars JSON allows at the top level", () => {
    expect([parseJsonText("null"), parseJsonText("12"), parseJsonText('"x"')]).toEqual([
      { valid: true, data: null },
      { valid: true, data: 12 },
      { valid: true, data: "x" },
    ]);
  });
});

describe("formatJsonText", () => {
  it("pretty-prints a valid document", () => {
    expect(formatJsonText('{"a":[1,2]}')).toBe('{\n  "a": [\n    1,\n    2\n  ]\n}');
  });

  it("honours the indent", () => {
    expect(formatJsonText('{"a":1}', 4)).toBe('{\n    "a": 1\n}');
  });

  it("leaves text that does not parse exactly as it was typed", () => {
    expect(formatJsonText('{"a": 1,}')).toBe('{"a": 1,}');
  });

  it("leaves blank text alone rather than turning it into undefined", () => {
    expect(formatJsonText("  ")).toBe("  ");
  });
});
