import { expect, test } from "@playwright/test";

test("picks from a list in place with the keyboard and a typed prefix", async ({ page }) => {
  await page.goto("/components/listbox");

  const status = page.getByRole("listbox", { name: "Status" });
  await status.focus();
  await page.keyboard.press("p");
  await page.keyboard.press("Enter");

  await expect(page.getByTestId("status-value")).toHaveText("published");
  await expect(status.getByRole("option", { name: "Published" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});

test("finds a row by text it does not show", async ({ page }) => {
  await page.goto("/components/listbox");

  const search = page.getByRole("combobox", { name: "Name or tax id" });
  await search.fill("98765432");
  await page.keyboard.press("Enter");

  await expect(page.getByTestId("supplier-value")).toHaveText("globex");
});

test("takes the keyboard as the dropdown holding it opens", async ({ page }) => {
  await page.goto("/components/listbox");

  const trigger = page.getByRole("button", { name: "Actions" });
  await trigger.focus();
  await page.keyboard.press("Enter");

  await expect(page.getByRole("listbox", { name: "Actions" })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");

  await expect(page.getByTestId("last-action")).toHaveText("Move to…");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(trigger).toBeFocused();
});
