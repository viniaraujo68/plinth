import { expect, test } from "@playwright/test";

test("toggles from the trigger and runs an action from the panel", async ({ page }) => {
  await page.goto("/components/dropdown");

  const trigger = page.getByRole("button", { name: "Row actions" });
  await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");

  await page.getByRole("button", { name: "Duplicate" }).click();
  await expect(page.getByTestId("last-action")).toHaveText("Duplicate");
});

test("dismisses on an outside click and on Escape", async ({ page }) => {
  await page.goto("/components/dropdown");

  const trigger = page.getByRole("button", { name: "Row actions" });
  const item = page.getByRole("button", { name: "Duplicate" });

  await trigger.click();
  await expect(item).toBeVisible();
  // Light dismiss is the browser's, not ours -- this is the assertion that catches a regression
  // where the panel stops being a real popover.
  await page.getByRole("heading", { level: 1 }).click();
  await expect(item).toBeHidden();

  await trigger.click();
  await expect(item).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(item).toBeHidden();
});

test("closes itself once a form inside it is applied", async ({ page }) => {
  await page.goto("/components/dropdown");

  const trigger = page.getByTestId("filter-trigger");
  await trigger.click();
  await page.getByRole("radio", { name: "settled" }).check();
  await page.getByTestId("apply-filter").click();

  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(trigger).toContainText("Filter: settled");
});

test("opens with its content already there when driven from outside", async ({ page }) => {
  await page.goto("/components/dropdown");

  await page.getByTestId("remote-open").click();

  await expect(page.getByTestId("remote-content")).toBeVisible();
});
