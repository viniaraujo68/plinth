import { expect, it } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-svelte";
import Harness from "./ThemeHarness.spec.svelte";

// The theme stylesheet is what turns the checkbox into a `color-scheme`, so the assertions below
// are meaningless without it loaded into the test document.
import "./theme.css";

const colorScheme = () => getComputedStyle(document.documentElement).colorScheme;

it("leaves the scheme to the OS while the preference is system", async () => {
  render(Harness, { initial: "system" });

  await expect.element(page.getByRole("button")).toHaveAttribute("data-preference", "system");
  expect(colorScheme()).toBe("light dark");
});

it("pins the scheme when the preference names a theme", async () => {
  render(Harness, { initial: "dark" });

  await expect.element(page.getByRole("button")).toHaveAttribute("data-preference", "dark");
  expect(colorScheme()).toBe("dark");
});

it("cycles system, light, dark and back through the toggle", async () => {
  render(Harness, { initial: "system" });
  const toggle = page.getByRole("button");

  await toggle.click();
  await expect.element(toggle).toHaveAttribute("data-preference", "light");
  expect(colorScheme()).toBe("light");

  await toggle.click();
  await expect.element(toggle).toHaveAttribute("data-preference", "dark");
  expect(colorScheme()).toBe("dark");

  await toggle.click();
  await expect.element(toggle).toHaveAttribute("data-preference", "system");
  expect(colorScheme()).toBe("light dark");
});

it("keeps the checkbox out of the accessibility tree and the layout", async () => {
  render(Harness, { initial: "light" });

  const controller = document.querySelector<HTMLInputElement>("input.theme-controller");

  expect(controller?.hidden).toBe(true);
  expect(controller?.checked).toBe(true);
  expect(controller?.value).toBe("plinth-light");
});
