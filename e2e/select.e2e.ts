import { expect, test } from "@playwright/test";

test("leaves a short list without a search field and gives a long one its own", async ({
  page,
}) => {
  await page.goto("/components/select");

  await page.getByTestId("size").click();
  await expect(page.getByRole("option", { name: "Medium" })).toBeVisible();
  await expect(page.getByPlaceholder("Search locals")).toBeHidden();
  await page.keyboard.press("Escape");

  await page.getByTestId("local").click();
  await expect(page.getByPlaceholder("Search locals")).toBeFocused();
});

test("finds an accented option from an unaccented query", async ({ page }) => {
  await page.goto("/components/select");

  await page.getByTestId("local").click();
  await page.getByPlaceholder("Search locals").fill("otavio");

  const rows = page.getByRole("option");
  await expect(rows).toHaveCount(1);
  await rows.first().click();

  await expect(page.getByTestId("local-value")).toHaveText("otavio-rocha");
  await expect(page.getByTestId("local")).toContainText("Otávio Rocha");
  await expect(page.getByTestId("local")).toBeFocused();
});

test("says so when the query matches nothing", async ({ page }) => {
  await page.goto("/components/select");

  await page.getByTestId("local").click();
  await page.getByPlaceholder("Search locals").fill("zurique");

  await expect(page.getByRole("option")).toHaveCount(0);
  await expect(page.getByText("No local by that name")).toBeVisible();
});

test("walks the list from the keyboard and selects with Enter", async ({ page }) => {
  await page.goto("/components/select");

  await page.getByTestId("size").focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByTestId("size")).toHaveAttribute("aria-expanded", "true");

  await page.keyboard.press("End");
  await page.keyboard.press("Enter");

  await expect(page.getByTestId("size")).toContainText("Extra large");
  await expect(page.getByTestId("size")).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByTestId("size")).toBeFocused();
});

test("clears the selection without ever offering a blank row", async ({ page }) => {
  await page.goto("/components/select");

  await page.getByTestId("local").click();
  await page.getByRole("option", { name: "Centro" }).click();
  await expect(page.getByTestId("local-value")).toHaveText("centro");

  await page.getByRole("button", { name: "Clear selection" }).first().click();
  await expect(page.getByTestId("local-value")).toHaveText("none");
  await expect(page.getByTestId("local")).toContainText("Every local");

  await page.getByTestId("local").click();
  await expect(page.getByRole("option")).toHaveCount(11);
});

test("searches an airport by its code through the custom filter", async ({ page }) => {
  await page.goto("/components/select");

  await page.getByTestId("airport").click();
  await page.getByPlaceholder("Code or city").fill("gig");

  const rows = page.getByRole("option");
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("Galeão");

  // The same field still searches the label, which is what the composition buys over replacing it.
  await page.getByPlaceholder("Code or city").fill("rio");
  await expect(page.getByRole("option")).toHaveCount(2);
});

test("steps over a disabled row and refuses to open a disabled control", async ({ page }) => {
  await page.goto("/components/select");

  await page.getByTestId("shipping").click();
  await expect(page.getByRole("option", { name: /Overnight/ })).toBeDisabled();

  // Standard, Express, then straight past Overnight to Collect in store.
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("shipping")).toContainText("Collect in store");

  await expect(page.getByTestId("locked")).toBeDisabled();
  await expect(page.getByTestId("locked")).toHaveAttribute("aria-expanded", "false");
});

test("opens over a modal and closes one layer at a time", async ({ page }) => {
  await page.goto("/components/select");

  await page.getByTestId("open-filters").click();
  const dialog = page.getByRole("dialog", { name: "Filters" });
  await expect(dialog).toBeVisible();

  await page.getByTestId("modal-local").click();
  const search = page.getByPlaceholder("Search");
  await expect(search).toBeFocused();

  await search.fill("goncalo");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("modal-value")).toHaveText("sao-goncalo");
  await expect(dialog).toBeVisible();

  // The panel is the topmost thing in the top layer, so the first Escape is spent on it.
  await page.getByTestId("modal-local").click();
  await expect(page.getByRole("listbox")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("listbox")).toBeHidden();
  await expect(dialog).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});
