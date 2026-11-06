import { expect, test } from "@playwright/test";

test("locks the save while the text does not parse, and saves once it does", async ({ page }) => {
  await page.goto("/components/json-input");

  const field = page.getByRole("textbox", { name: "Settings" });
  await field.fill('{"retention_days": 7,}');
  await page.getByRole("heading", { level: 1 }).click();

  await expect(page.getByTestId("save")).toBeDisabled();
  await expect(page.getByText(/^Invalid JSON: /)).toBeVisible();
  await expect(field).toHaveValue('{"retention_days": 7,}');

  await field.fill('{"retention_days":7}');
  await page.getByRole("heading", { level: 1 }).click();

  await expect(field).toHaveValue('{\n  "retention_days": 7\n}');
  await page.getByTestId("save").click();
  await expect(page.getByTestId("saved")).toContainText('"retention_days": 7');
});
