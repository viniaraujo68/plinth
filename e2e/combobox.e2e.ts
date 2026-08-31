import { expect, test } from "@playwright/test";

test("types straight into the bar and picks what it finds", async ({ page }) => {
  await page.goto("/components/combobox");

  const bar = page.getByTestId("city");
  await expect(bar).toHaveValue("Petrópolis");

  await bar.click();
  await expect(bar).toHaveAttribute("aria-expanded", "true");
  // Opening on a selection offers the whole list, not the one row whose label is in the field.
  await expect(page.getByRole("option")).toHaveCount(52);

  // The click selected the text, so the first keystroke replaces it rather than appending.
  await page.keyboard.type("goia");
  await expect(bar).toHaveValue("goia");
  await expect(page.getByRole("option")).toHaveCount(1);

  await page.keyboard.press("Enter");
  await expect(page.getByTestId("city-value")).toHaveText("goiania");
  await expect(bar).toHaveValue("Goiânia");
  await expect(bar).toBeFocused();
  await expect(bar).toHaveAttribute("aria-expanded", "false");
});

test("finds an accented label from an unaccented query, anywhere in the word", async ({ page }) => {
  await page.goto("/components/combobox");

  const bar = page.getByTestId("city");
  await bar.click();
  await bar.fill("polis");

  // Mid-word and past the accents at once, which is the pair native type-ahead cannot do.
  await expect(page.getByRole("option")).toHaveCount(3);
  await expect(page.getByRole("option").first()).toContainText("Florianópolis");

  await bar.fill("buzios");
  await expect(page.getByRole("option")).toHaveCount(1);
  await expect(page.getByRole("option").first()).toContainText("Armação dos Búzios");
});

test("says so when the query matches nothing", async ({ page }) => {
  await page.goto("/components/combobox");

  await page.getByTestId("city").click();
  await page.getByTestId("city").fill("zurique");

  await expect(page.getByRole("option")).toHaveCount(0);
  await expect(page.getByText("No city by that name")).toBeVisible();
});

test("puts the selected label back when the list closes without a pick", async ({ page }) => {
  await page.goto("/components/combobox");

  const bar = page.getByTestId("city");
  await bar.click();
  await bar.fill("santo");
  await page.keyboard.press("Escape");

  await expect(bar).toHaveValue("Petrópolis");
  await expect(page.getByTestId("city-value")).toHaveText("petropolis");

  // Emptying the field is not a way to clear it either: leaving reverts.
  await bar.click();
  await bar.fill("");
  await page.getByRole("heading", { level: 1 }).click();

  await expect(bar).toHaveValue("Petrópolis");
  await expect(page.getByTestId("city-value")).toHaveText("petropolis");
});

test("clears only through the ✕, and keeps the keyboard when it does", async ({ page }) => {
  await page.goto("/components/combobox");

  await page.getByRole("button", { name: "Clear selection" }).first().click();

  await expect(page.getByTestId("city-value")).toHaveText("none");
  await expect(page.getByTestId("city")).toHaveValue("");
  await expect(page.getByTestId("city")).toBeFocused();
});

test("walks the filtered list with the arrows without leaving the field", async ({ page }) => {
  await page.goto("/components/combobox");

  const bar = page.getByTestId("city");
  await bar.click();
  await bar.fill("sao");

  await expect(bar).toBeFocused();
  await expect(bar).toHaveAttribute("aria-activedescendant", /option/);

  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");

  await expect(page.getByTestId("city-value")).toHaveText("sao-paulo");
});

test("searches an airport by its code through the custom filter", async ({ page }) => {
  await page.goto("/components/combobox");

  const bar = page.getByTestId("airport");
  await bar.click();
  await bar.fill("gig");

  await expect(page.getByRole("option")).toHaveCount(1);
  await expect(page.getByRole("option").first()).toContainText("Galeão");

  // The same field still searches the label, which is what composing buys over replacing.
  await bar.fill("rio");
  await expect(page.getByRole("option")).toHaveCount(2);
});

test("renders a decorated row and still closes to the plain label", async ({ page }) => {
  await page.goto("/components/combobox");

  const bar = page.getByTestId("origin");
  await bar.click();
  await bar.fill("gramado");

  const row = page.getByRole("option").first();
  await expect(row).toContainText("routes");

  await row.click();
  await expect(bar).toHaveValue("Gramado");
  await expect(bar).not.toHaveValue(/routes/);
});

test("steps over a disabled row and refuses to open a disabled control", async ({ page }) => {
  await page.goto("/components/combobox");

  await page.getByTestId("courier").click();
  await expect(page.getByRole("option", { name: /Overnight/ })).toBeDisabled();

  // Standard, Express, then straight past Overnight to Collect in store.
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("courier")).toHaveValue("Collect in store");

  await expect(page.getByTestId("locked")).toBeDisabled();
  await expect(page.getByTestId("locked")).toHaveValue("Rio de Janeiro — Galeão");
  await expect(page.getByTestId("locked")).toHaveAttribute("aria-expanded", "false");
});

test("opens over a modal and closes one layer at a time", async ({ page }) => {
  await page.goto("/components/combobox");

  await page.getByTestId("open-filters").click();
  const dialog = page.getByRole("dialog", { name: "Filters" });
  await expect(dialog).toBeVisible();

  const bar = page.getByTestId("modal-city");
  await bar.click();
  await expect(page.getByRole("listbox")).toBeVisible();
  await expect(bar).toBeFocused();

  await bar.fill("paraty");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("modal-value")).toHaveText("paraty");
  await expect(dialog).toBeVisible();

  // The list is the topmost thing in the top layer, so the first Escape is spent on it.
  await bar.click();
  await expect(page.getByRole("listbox")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("listbox")).toBeHidden();
  await expect(dialog).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});
