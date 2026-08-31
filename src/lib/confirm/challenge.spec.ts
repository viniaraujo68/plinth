import { expect, it } from "vitest";
import { challengeSatisfied, matchesChallenge } from "./challenge.js";

it("matches a value typed exactly", () => {
  expect(matchesChallenge("Thursday Regulars", "Thursday Regulars")).toBe(true);
});

it("forgives whitespace at either end of what was typed", () => {
  // A name copied off the row above it picks up a trailing space far more often than anyone types
  // one deliberately.
  expect(matchesChallenge("  Thursday Regulars ", "Thursday Regulars")).toBe(true);
  expect(matchesChallenge("Thursday Regulars", "  Thursday Regulars\n")).toBe(true);
});

it("refuses a difference in case", () => {
  expect(matchesChallenge("thursday regulars", "Thursday Regulars")).toBe(false);
});

it("refuses a difference in accents", () => {
  expect(matchesChallenge("Regulares", "Regularès")).toBe(false);
});

it("refuses a difference in the middle, whitespace included", () => {
  expect(matchesChallenge("ThursdayRegulars", "Thursday Regulars")).toBe(false);
  expect(matchesChallenge("Thursday  Regulars", "Thursday Regulars")).toBe(false);
});

it("refuses a prefix of the challenge", () => {
  expect(matchesChallenge("Thursday", "Thursday Regulars")).toBe(false);
});

it("satisfies a request that carries no challenge, whatever was typed", () => {
  expect(challengeSatisfied(undefined, "")).toBe(true);
  expect(challengeSatisfied(undefined, "anything")).toBe(true);
});

it("gates a request that carries one", () => {
  expect(challengeSatisfied("delete", "")).toBe(false);
  expect(challengeSatisfied("delete", "delete")).toBe(true);
});
