import { expect, test } from "@playwright/test";

test("opens a plain list with no field of its own anywhere in it", async ({ page }) => {
  await page.goto("/components/select");

  await page.getByTestId("size").click();
  await expect(page.getByRole("option", { name: "Medium" })).toBeVisible();
  await expect(page.getByRole("option")).toHaveCount(4);
  // Typing is `Combobox`'s job; this panel is a list and nothing else.
  await expect(page.getByRole("textbox")).toHaveCount(0);
});

test("walks the list from the keyboard and selects with Enter", async ({ page }) => {
  await page.goto("/components/select");

  await page.getByTestId("size").focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByTestId("size")).toHaveAttribute("aria-expanded", "true");
  // The trigger keeps the focus: the rows are pointed at, never focused.
  await expect(page.getByTestId("size")).toBeFocused();
  await expect(page.getByTestId("size")).toHaveAttribute("aria-activedescendant", /option/);

  await page.keyboard.press("End");
  await page.keyboard.press("Enter");

  await expect(page.getByTestId("size")).toContainText("Extra large");
  await expect(page.getByTestId("size")).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByTestId("size")).toBeFocused();
});

test("picks with the mouse and reopens on the row it picked", async ({ page }) => {
  await page.goto("/components/select");

  await page.getByTestId("local").click();
  await page.getByRole("option", { name: "Corrêas" }).click();

  await expect(page.getByTestId("local-value")).toHaveText("correas");
  await expect(page.getByTestId("local")).toContainText("Corrêas");

  await page.getByTestId("local").click();
  await expect(page.getByRole("option", { name: "Corrêas" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
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
  await expect(page.getByRole("option")).toHaveCount(9);
});

test("renders a decorated row and still closes to the plain label", async ({ page }) => {
  await page.goto("/components/select");

  await page.getByTestId("busiest").click();
  const row = page.getByRole("option", { name: /Itaipava/ });
  await expect(row).toContainText("18");

  await row.click();
  await expect(page.getByTestId("busiest")).toContainText("Itaipava");
  await expect(page.getByTestId("busiest")).not.toContainText("18");
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
  await expect(page.getByRole("listbox")).toBeVisible();
  await expect(page.getByTestId("modal-local")).toBeFocused();

  await page.getByRole("option", { name: "Nogueira" }).click();
  await expect(page.getByTestId("modal-value")).toHaveText("nogueira");
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
