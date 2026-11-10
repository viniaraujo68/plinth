import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-svelte";
import { createI18n } from "./i18n.svelte.js";
import Harness from "./I18nHarness.spec.svelte";

const STORAGE_KEY = "plinth-test:locale";

const pt = {
  greeting: "Olá, {name}",
  days: { one: "{count} dia", other: "{count} dias" },
  onlyPt: "Só em português",
};
const en = {
  greeting: "Hello, {name}",
  days: { one: "{count} day", other: "{count} days" },
};

const make = (options: { unmatched?: "pt" | "en"; storageKey?: string | null } = {}) =>
  createI18n({
    dictionaries: { pt, en },
    tags: { pt: "pt-BR", en: "en-US" },
    fallback: "pt",
    storageKey: STORAGE_KEY,
    ...options,
  });

const browserLanguages = (languages: string[]) =>
  vi.spyOn(navigator, "languages", "get").mockReturnValue(languages);

beforeEach(() => {
  localStorage.removeItem(STORAGE_KEY);
});

afterEach(() => {
  vi.restoreAllMocks();
  document.documentElement.lang = "en";
});

it("starts on the browser's language when nothing was picked before", () => {
  browserLanguages(["en-GB", "en"]);

  expect(make().locale).toBe("en");
});

it("starts on the pick remembered from an earlier visit, over the browser's language", () => {
  browserLanguages(["en-US"]);
  localStorage.setItem(STORAGE_KEY, "pt");

  expect(make().locale).toBe("pt");
});

it("ignores a remembered pick that is no longer on offer", () => {
  browserLanguages(["en-US"]);
  localStorage.setItem(STORAGE_KEY, "fr");

  expect(make().locale).toBe("en");
});

it("falls back for a browser whose languages match nothing, or to `unmatched` when given", () => {
  browserLanguages(["fr-FR", "de"]);

  expect(make().locale).toBe("pt");
  expect(make({ unmatched: "en" }).locale).toBe("en");
});

it("fills placeholders and picks the plural form by count", () => {
  browserLanguages(["pt-BR"]);
  const i18n = make();

  expect(i18n.t("greeting", { name: "Ada" })).toBe("Olá, Ada");
  expect(i18n.t("days", { count: 1 })).toBe("1 dia");
  expect(i18n.t("days", { count: 0 })).toBe("0 dias");
});

it("reads a key the current dictionary lacks from the fallback one, and shows an unknown key as itself", () => {
  browserLanguages(["en-US"]);
  const i18n = make();

  expect(i18n.t("onlyPt")).toBe("Só em português");
  expect(i18n.t("nowhere.at.all")).toBe("nowhere.at.all");
  expect(i18n.has("onlyPt")).toBe(true);
  expect(i18n.has("nowhere.at.all")).toBe(false);
});

it("switches, remembers the pick and labels the document with the new tag", () => {
  browserLanguages(["pt-BR"]);
  const i18n = make();
  expect(document.documentElement.lang).toBe("pt-BR");

  i18n.setLocale("en");

  expect(i18n.locale).toBe("en");
  expect(i18n.tag).toBe("en-US");
  expect(document.documentElement.lang).toBe("en-US");
  expect(localStorage.getItem(STORAGE_KEY)).toBe("en");
});

it("refuses a locale that is not on offer", () => {
  browserLanguages(["pt-BR"]);
  const i18n = make();

  i18n.setLocale("fr" as "pt");

  expect(i18n.locale).toBe("pt");
});

it("remembers nothing without a storage key", () => {
  browserLanguages(["pt-BR"]);
  const i18n = make({ storageKey: null });

  i18n.setLocale("en");

  expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
});

it("keeps `t` working when it is pulled off the instance", () => {
  browserLanguages(["pt-BR"]);
  const { t } = make();

  expect(t("greeting", { name: "Ada" })).toBe("Olá, Ada");
});

it("re-renders every translated text when the toggle switches the locale", async () => {
  browserLanguages(["pt-BR"]);
  const i18n = make();
  render(Harness, { i18n });

  await expect.element(page.getByTestId("greeting")).toHaveTextContent("Olá, Ada");
  await expect
    .element(page.getByRole("button", { name: "PT" }))
    .toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: "EN" }).click();

  await expect.element(page.getByTestId("greeting")).toHaveTextContent("Hello, Ada");
  await expect.element(page.getByTestId("days")).toHaveTextContent("2 days");
  await expect
    .element(page.getByRole("group", { name: "Idioma" }).getByRole("button", { name: "EN" }))
    .toHaveAttribute("aria-pressed", "true");
});
