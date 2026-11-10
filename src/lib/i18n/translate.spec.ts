import { describe, expect, it } from "vitest";
import { interpolate, matchLocale, pickPhrase } from "./translate.js";

describe("pickPhrase", () => {
  const days = { one: "{count} dia", other: "{count} dias" };

  it("returns plain text as it is", () => {
    expect(pickPhrase("Entrar")).toBe("Entrar");
  });

  it("takes `one` for exactly one and `other` for everything else, zero included", () => {
    expect(pickPhrase(days, { count: 1 })).toBe("{count} dia");
    expect(pickPhrase(days, { count: 0 })).toBe("{count} dias");
    expect(pickPhrase(days, { count: 2 })).toBe("{count} dias");
    expect(pickPhrase(days)).toBe("{count} dias");
  });
});

describe("interpolate", () => {
  it("fills every placeholder it has a value for", () => {
    expect(interpolate("{name} fez {count} gols", { name: "golin", count: 3 })).toBe(
      "golin fez 3 gols",
    );
  });

  it("leaves a placeholder with no value as written", () => {
    expect(interpolate("Olá, {name}", {})).toBe("Olá, {name}");
    expect(interpolate("Olá, {name}", { name: undefined })).toBe("Olá, {name}");
    expect(interpolate("Olá, {name}", { name: null })).toBe("Olá, {name}");
  });

  it("prints a zero rather than dropping it", () => {
    expect(interpolate("{count} gols", { count: 0 })).toBe("0 gols");
  });

  it("returns the text untouched without parameters", () => {
    expect(interpolate("{count} gols")).toBe("{count} gols");
  });
});

describe("matchLocale", () => {
  const tags = { pt: "pt-BR", en: "en-US" };

  it("matches a tag exactly", () => {
    expect(matchLocale(["en-US"], tags)).toBe("en");
  });

  it("matches by language when the region differs", () => {
    expect(matchLocale(["pt-PT"], tags)).toBe("pt");
    expect(matchLocale(["en"], tags)).toBe("en");
  });

  it("follows the reader's order of preference", () => {
    expect(matchLocale(["fr-FR", "en-GB", "pt-BR"], tags)).toBe("en");
  });

  it("returns null when nothing matches", () => {
    expect(matchLocale(["fr-FR", "de"], tags)).toBeNull();
    expect(matchLocale([], tags)).toBeNull();
  });
});
