import { expect, test } from "@playwright/test";

test("sweeps every placeholder on the page at the mark's tempo", async ({ page }) => {
  await page.goto("/components/skeleton");

  const lines = page.getByTestId("skeleton-line");
  await expect(lines.first()).toBeVisible();
  await expect(lines.first()).toHaveCSS("animation-duration", "1.7s");
  await expect(lines.first()).toHaveCSS("animation-timing-function", "linear");

  const running = await lines.evaluateAll((nodes) =>
    nodes.every((node) => getComputedStyle(node).animationName !== "none"),
  );
  expect(running).toBe(true);
});

test("follows a silhouette the caller cuts it to", async ({ page }) => {
  await page.goto("/components/skeleton");

  const avatar = page.getByTestId("skeleton-avatar").first();

  await expect(avatar).toHaveCSS("clip-path", /url\(/);
  await expect(avatar).toHaveCSS("border-radius", "0px");
  // The sweep is painted on the element itself, which is the only reason it survives the cut.
  await expect(avatar).toHaveCSS("background-image", /linear-gradient/);
});

// The one assertion the browser test suite cannot make on its own: vitest's runner has no hook for
// the media query, so it checks that the rule exists and this checks that the rule lands.
test("stands still for a reader who asked for less motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/components/skeleton");

  const line = page.getByTestId("skeleton-line").first();

  await expect(line).toHaveCSS("animation-name", "none");
  await expect(line).toHaveCSS("background-image", "none");
});

test("swaps the placeholders for content of the same proportions", async ({ page }) => {
  await page.goto("/components/skeleton");

  const region = page.getByRole("status", { name: "Loading releases" });
  await expect(region).toHaveAttribute("aria-busy", "true");

  const before = await region.boundingBox();

  await page.getByTestId("toggle-loading").click();

  await expect(region).toHaveAttribute("aria-busy", "false");
  await expect(region.getByText("Ada Lovelace")).toBeVisible();

  // A placeholder that does not hold the shape of what replaces it makes the page jump; the point
  // of the demo is that this height is the same on both sides of the swap.
  const after = await region.boundingBox();
  expect(Math.abs(after!.height - before!.height)).toBeLessThanOrEqual(8);
});
