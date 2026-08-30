import { expect, it } from "vitest";
import { parseThemePreference, THEME_COOKIE, themeCookie } from "./theme.svelte.js";

it("accepts the three preferences verbatim", () => {
  expect(parseThemePreference("light")).toBe("light");
  expect(parseThemePreference("dark")).toBe("dark");
  expect(parseThemePreference("system")).toBe("system");
});

it("falls back to system for anything else", () => {
  expect(parseThemePreference(undefined)).toBe("system");
  expect(parseThemePreference("")).toBe("system");
  expect(parseThemePreference("Dark")).toBe("system");
  expect(parseThemePreference("plinth-dark")).toBe("system");
});

it("serialises a year-long, path-wide, same-site cookie", () => {
  expect(themeCookie("dark")).toBe(`${THEME_COOKIE}=dark; path=/; max-age=31536000; samesite=lax`);
});
