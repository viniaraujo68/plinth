import { expect, test, type Page } from "@playwright/test";

test.use({ permissions: ["clipboard-read", "clipboard-write"] });

const clipboard = (page: Page) => page.evaluate(() => navigator.clipboard.readText());

const exportViewer = (page: Page) => page.getByRole("region", { name: "JSON viewer" }).first();

test("searches inside folded nodes and unfolds the one it lands on", async ({ page }) => {
  await page.goto("/components/json-view");

  await page
    .getByRole("group", { name: "collapseDepth" })
    .getByRole("button", { name: "1" })
    .click();
  const viewer = exportViewer(page);
  await expect(viewer.getByText('"Granite Logistics"')).toHaveCount(0);

  await viewer.getByText('"export"').click();
  await page.keyboard.press("ControlOrMeta+f");
  await expect(viewer.getByRole("searchbox", { name: "Search keys and values" })).toBeFocused();
  await page.keyboard.type("granite");

  await expect(viewer.getByRole("status")).toHaveText("1 of 1");
  await expect(viewer.locator("mark[data-active]")).toHaveText("Granite");
  await expect(viewer.locator("mark[data-active]")).toBeInViewport();
});

test("copies the whole export as indented JSON", async ({ page }) => {
  await page.goto("/components/json-view");

  const viewer = exportViewer(page);
  await viewer.getByRole("button", { name: "Copy JSON" }).click();
  await expect(viewer.getByRole("button", { name: "Copied" })).toBeVisible();

  const text = await clipboard(page);
  const parsed = JSON.parse(text) as { shipments: unknown[] };
  expect(text).toBe(JSON.stringify(parsed, null, 2));
  expect(text.startsWith('{\n  "export": {')).toBe(true);
  expect(parsed.shipments.length).toBeGreaterThan(0);
});

test("grows the export to ten thousand nodes", async ({ page }) => {
  await page.goto("/components/json-view");

  await page
    .getByRole("group", { name: "Document size" })
    .getByRole("button", { name: "10,000" })
    .click();

  await expect
    .poll(async () => Number(await page.getByTestId("node-count").textContent()))
    .toBeGreaterThanOrEqual(10_000);
  await expect(exportViewer(page).locator("[data-line]").first()).toBeVisible();
});

test("keeps the folds through a refresh of the values", async ({ page }) => {
  await page.goto("/components/json-view");

  const viewer = exportViewer(page);
  const toggle = (key: string) =>
    viewer.locator("[data-line]").filter({ hasText: key }).first().getByRole("button").first();

  await viewer.getByRole("button", { name: "Collapse all" }).click();
  await toggle('"shipments"').click();
  await expect(toggle('"shipments"')).toHaveAttribute("aria-expanded", "true");
  await expect(toggle('"export"')).toHaveAttribute("aria-expanded", "false");

  await page.getByTestId("refresh").click();

  await expect(toggle('"shipments"')).toHaveAttribute("aria-expanded", "true");
  await expect(toggle('"export"')).toHaveAttribute("aria-expanded", "false");
});

test("reports the path of a clicked value", async ({ page }) => {
  await page.goto("/components/json-view");

  await exportViewer(page).getByText('"exp-2026-11-10-eu"').click();

  await expect(page.getByTestId("selected-path")).toHaveText("/export/id");
  await expect(page.getByTestId("selected-value")).toHaveText('"exp-2026-11-10-eu"');
});

test("shows a Date as its ISO string and a cycle as a marker", async ({ page }) => {
  await page.goto("/components/json-view");

  const viewer = page.getByRole("region", { name: "JSON viewer" }).nth(1);
  await expect(viewer.getByText('"2026-11-12T14:00:00.000Z"')).toBeVisible();
  await expect(viewer.getByText("[Circular]")).toBeVisible();
  await expect(viewer.getByText('"describe"')).toHaveCount(0);
});
