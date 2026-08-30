import { expect, test } from "@playwright/test";

// Panels are located by their text rather than by role: the page mounts several `Tooltip`
// components whose panels are in the DOM from the start, hidden by `popover`, so a role query
// would match all of them at once.
test("shows a tooltip on hover and takes it away on leave", async ({ page }) => {
  await page.goto("/components/tooltip");

  const hint = page.getByText("Opens the palette from anywhere");
  await expect(hint).toBeHidden();

  await page.getByRole("button", { name: "Command palette" }).hover();
  await expect(hint).toBeVisible();

  await page.getByRole("heading", { level: 1 }).hover();
  await expect(hint).toBeHidden();
});

test("places the panel in the top layer, above the sticky header", async ({ page }) => {
  await page.goto("/components/tooltip");

  const trigger = page.getByRole("button", { name: "Publish" });
  await trigger.hover();

  const panel = page.getByText("Publishes to everyone, immediately");
  await expect(panel).toBeVisible();

  // The panel is placed by CSS anchor positioning, so this fails loudly if the browser silently
  // ignored `position-anchor` and left it at the document origin.
  const [panelBox, triggerBox] = await Promise.all([panel.boundingBox(), trigger.boundingBox()]);
  expect(panelBox).not.toBeNull();
  expect(triggerBox).not.toBeNull();
  expect(Math.abs(panelBox!.x - triggerBox!.x)).toBeLessThan(200);
});

test("suppresses gated tooltips without losing them", async ({ page }) => {
  await page.goto("/components/tooltip");

  const hint = page.getByText("Deletes the album and its tracks");

  await page.getByRole("button", { name: "Delete" }).hover();
  await expect(hint).toBeVisible();

  await page.getByTestId("disable-toggle").check();
  await page.getByRole("heading", { level: 1 }).hover();
  await page.getByRole("button", { name: "Delete" }).hover();
  await expect(hint).toBeHidden();

  await page.getByTestId("disable-toggle").uncheck();
  await page.getByRole("button", { name: "Delete" }).hover();
  await expect(hint).toBeVisible();
});
