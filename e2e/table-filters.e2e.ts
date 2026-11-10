import { expect, test } from "@playwright/test";

const urlTable = "[data-testid='url-table']";
const players = (frame: string) => `${frame} tbody [data-label='Player']`;

test("writes the chip bar's rules to the URL and reads them back after a reload", async ({
  page,
}) => {
  await page.goto("/table/filters");
  const table = page.locator(urlTable);

  await table.getByRole("button", { name: "Filter", exact: true }).click();
  await page.getByRole("list", { name: "Fields" }).getByRole("button", { name: "Goals" }).click();
  await page
    .getByRole("group", { name: "Goals comparison" })
    .getByRole("button", { name: "≥" })
    .click();
  await page.getByRole("spinbutton", { name: "Value" }).fill("25");
  await page.getByRole("button", { name: "Apply", exact: true }).click();

  await expect(page).toHaveURL(/filter=goals%3Agte%3A25/);
  await expect(page.getByTestId("url-summary")).toHaveText("3 of 24 players, 78 goals");

  await page.reload();

  await expect(page.getByTestId("url-summary")).toHaveText("3 of 24 players, 78 goals");
  await expect(table.getByRole("button", { name: "Edit filter Goals ≥ 25" })).toBeVisible();
});

test("drops what a stale link gets wrong and rewrites the address", async ({ page }) => {
  await page.goto("/table/filters?filter=goals:gte:abc;name:in:2,999;gone:eq:1");

  await expect(page.locator(players(urlTable))).toHaveText(["Bia"]);
  await expect(page).toHaveURL(/filter=name%3Ain%3A2$/);
});

test("keeps the place in the whole ranking when the rows are filtered", async ({ page }) => {
  await page.goto("/table/filters?filter=name:in:1,2");

  const ranks = page.locator(`${urlTable} tbody [data-label='#']`);
  await expect(page.locator(players(urlTable))).toHaveText(["Bia", "Ana"]);
  await expect(ranks).not.toHaveText(["1", "2"]);
});

test("keeps an or-group in the address and reads it back", async ({ page }) => {
  await page.goto("/table/filters?filter=matches:gte:30;or(goals:gte:20;assists:gte:15)");
  const table = page.locator(urlTable);

  await expect(table.getByRole("group", { name: "Filter group" })).toBeVisible();
  await expect(table.getByRole("button", { name: "Match all of these" })).toBeVisible();
  const summary = await page.getByTestId("url-summary").textContent();

  await table.getByRole("button", { name: "Match any of these" }).first().click();

  await expect(page).toHaveURL(/filter=or%28/);
  await expect(page.getByTestId("url-summary")).not.toHaveText(summary ?? "");
});
