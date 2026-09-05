import { afterEach, expect, it } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-svelte";
import Harness from "./ThemeHarness.spec.svelte";
import { DARK_THEME, LIGHT_THEME } from "./theme.svelte.js";

// The theme stylesheet is what turns the checkbox into a `color-scheme`, so the assertions below
// are meaningless without it loaded into the test document.
import "./theme.css";

const colorScheme = () => getComputedStyle(document.documentElement).colorScheme;

// Both the stamp and the subtrees below live on the document rather than inside the rendered
// tree, so unmounting the harness does not take them with it.
afterEach(() => {
  document.documentElement.removeAttribute("data-theme");
  for (const node of subtrees.splice(0)) node.remove();
});

const subtrees: HTMLElement[] = [];

const subtree = (theme: string) => {
  const node = document.createElement("div");
  node.dataset.theme = theme;
  document.body.append(node);
  subtrees.push(node);
  return node;
};

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

// A consumer stamps the root before hydration so the first paint is already right. Everything
// below is about that stamp being a seed and nothing more.

it("paints the stamped seed while no controller is mounted", () => {
  document.documentElement.dataset.theme = DARK_THEME;

  expect(colorScheme()).toBe("dark");
});

it("lets a mounted controller override the seed it disagrees with", async () => {
  document.documentElement.dataset.theme = DARK_THEME;

  render(Harness, { initial: "light" });

  await expect.element(page.getByRole("button")).toHaveAttribute("data-preference", "light");
  expect(colorScheme()).toBe("light");
});

// The CSS guard on its own, with the seed put back after the controller has released it: this is
// the state a server-rendered app is in at first paint, before a line of JS has run. Dev CSS
// keeps the two selectors apart, so what the guard really defends against — Lightning CSS folding
// them into an equal-specificity `:is(...)` — is only reachable from the end-to-end run.
it("keeps a seed put back under a checked controller from painting", async () => {
  render(Harness, { initial: "light" });
  await expect.element(page.getByRole("button")).toHaveAttribute("data-preference", "light");

  document.documentElement.dataset.theme = DARK_THEME;

  expect(colorScheme()).toBe("light");
});

// "system" checks nothing, so the guard alone would leave the seed painting. Releasing it on
// mount is what makes the OS the authority again.
it("releases the seed so system goes back to the OS", async () => {
  document.documentElement.dataset.theme = DARK_THEME;

  render(Harness, { initial: "system" });

  await expect.element(page.getByRole("button")).toHaveAttribute("data-preference", "system");
  expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
  expect(colorScheme()).toBe("light dark");
});

it("cycles away from a seeded theme like any other preference", async () => {
  document.documentElement.dataset.theme = DARK_THEME;

  render(Harness, { initial: "dark" });
  const toggle = page.getByRole("button");

  await toggle.click();
  await expect.element(toggle).toHaveAttribute("data-preference", "system");
  expect(colorScheme()).toBe("light dark");

  await toggle.click();
  await expect.element(toggle).toHaveAttribute("data-preference", "light");
  expect(colorScheme()).toBe("light");
});

it("re-themes a nested subtree while the controller owns the root", async () => {
  render(Harness, { initial: "dark" });
  await expect.element(page.getByRole("button")).toHaveAttribute("data-preference", "dark");

  const light = subtree(LIGHT_THEME);
  const dark = subtree(DARK_THEME);

  expect(colorScheme()).toBe("dark");
  expect(getComputedStyle(light).colorScheme).toBe("light");
  expect(getComputedStyle(dark).colorScheme).toBe("dark");
});

it("re-themes a nested subtree under a seeded root with no controller", () => {
  document.documentElement.dataset.theme = DARK_THEME;

  const light = subtree(LIGHT_THEME);

  expect(colorScheme()).toBe("dark");
  expect(getComputedStyle(light).colorScheme).toBe("light");
});
