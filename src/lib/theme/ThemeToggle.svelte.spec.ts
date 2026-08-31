import { expect, it } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-svelte";
import Harness from "./ThemeHarness.spec.svelte";
import type { ThemePreference } from "./theme.svelte.js";

const PREFERENCES: Record<ThemePreference, string> = {
  system: "Sistema",
  light: "Claro",
  dark: "Escuro",
};

const preferenceLabel = (preference: ThemePreference) => PREFERENCES[preference];

const sentence = (current: ThemePreference, next: ThemePreference) =>
  `Tema: ${PREFERENCES[current]}. Mudar para ${PREFERENCES[next]}.`;

const named = (name: string) => page.getByRole("button", { name });

it("names the control in English by default, through the whole cycle", async () => {
  render(Harness, { initial: "system" });

  const toggle = named("Theme: System. Switch to Light.");
  await expect.element(toggle).toBeInTheDocument();
  await expect.element(toggle).toHaveTextContent("System");

  await toggle.click();
  await expect.element(named("Theme: Light. Switch to Dark.")).toBeInTheDocument();

  await named("Theme: Light. Switch to Dark.").click();
  await expect.element(named("Theme: Dark. Switch to System.")).toBeInTheDocument();
});

it("takes the accessible name from label and follows the preference", async () => {
  render(Harness, { initial: "system", label: sentence });

  const toggle = named(sentence("system", "light"));
  await expect.element(toggle).toBeInTheDocument();

  await toggle.click();
  await expect.element(named(sentence("light", "dark"))).toBeInTheDocument();

  await named(sentence("light", "dark")).click();
  await expect.element(named(sentence("dark", "system"))).toBeInTheDocument();

  await named(sentence("dark", "system")).click();
  await expect.element(named(sentence("system", "light"))).toBeInTheDocument();
});

// The visible word and the words inside the default sentence are the same wording, so one prop has
// to reach both -- an app that only translates `preferenceLabel` must not keep an English name.
it("translates the visible text and the default sentence from preferenceLabel alone", async () => {
  render(Harness, { initial: "light", preferenceLabel });

  const toggle = named("Theme: Claro. Switch to Escuro.");
  await expect.element(toggle).toHaveTextContent("Claro");

  await toggle.click();
  await expect.element(named("Theme: Escuro. Switch to Sistema.")).toHaveTextContent("Escuro");
});

it("lets label phrase the sentence while preferenceLabel names the visible state", async () => {
  render(Harness, {
    initial: "dark",
    preferenceLabel,
    label: (current, next) => `${PREFERENCES[next]} (agora: ${PREFERENCES[current]})`,
  });

  const toggle = page.getByRole("button");

  await expect.element(toggle).toHaveAttribute("aria-label", "Sistema (agora: Escuro)");
  await expect.element(toggle).toHaveTextContent("Escuro");
});
