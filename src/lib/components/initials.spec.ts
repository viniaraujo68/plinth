import { expect, it } from "vitest";
import { initials } from "./initials.js";

it("takes the first letter of the first and the last word", () => {
  expect(initials("Ada Lovelace")).toBe("AL");
  expect(initials("Ada King Lovelace")).toBe("AL");
});

it("takes a single letter from a single word, upper-cased", () => {
  expect(initials("ada")).toBe("A");
});

it("ignores stray whitespace around and between the words", () => {
  expect(initials("  ada   lovelace ")).toBe("AL");
});

it("shows a question mark for a blank name rather than an empty disc", () => {
  expect(initials("")).toBe("?");
  expect(initials("   ")).toBe("?");
});
