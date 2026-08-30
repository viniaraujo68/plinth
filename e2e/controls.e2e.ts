import { expect, test } from "@playwright/test";

test("keeps the label and blocks the button while loading", async ({ page }) => {
  await page.goto("/components/loading-button");

  const button = page.getByTestId("demo");
  await expect(button).toBeEnabled();

  await page.getByRole("checkbox").check();

  await expect(button).toHaveText("Save changes");
  await expect(button).toBeDisabled();
  await expect(button).toHaveAttribute("aria-busy", "true");
});

test("runs the async action through to success", async ({ page }) => {
  await page.goto("/components/async-button");

  const button = page.getByTestId("publish");
  await button.click();

  await expect(button).toBeDisabled();
  await expect(page.getByTestId("published-count")).toHaveText("1");
  await expect(button).toBeEnabled();
});

test("surfaces a failed async action and recovers from it", async ({ page }) => {
  await page.goto("/components/async-button");

  const button = page.getByTestId("publish-failing");
  await button.click();

  const failure = page.getByTestId("failure");
  await expect(failure).toContainText("Could not publish");
  await expect(failure).toContainText("The publishing service refused the request.");
  await expect(button).toBeEnabled();

  await failure.getByRole("button", { name: "Try again" }).click();
  await expect(failure).toBeHidden();
});

test("refreshes on demand and swaps the clock for a countdown", async ({ page }) => {
  await page.goto("/components/refresh-button");

  const strip = page.getByTestId("refresh-clock").first();
  await expect(strip).toHaveText("--:--:--");

  await page.getByRole("button", { name: "Refresh now" }).first().click();
  await expect(page.getByTestId("load-count")).toHaveText("1");
  await expect(strip).not.toHaveText("--:--:--");

  await page.getByRole("button", { name: "Start auto-refresh" }).first().click();
  await expect(strip).toHaveText(/^\d+s$/);
});

test("walks the pages and resets on a size change", async ({ page }) => {
  await page.goto("/components/paginator");

  const items = page.getByTestId("items");
  await expect(items.getByText("1", { exact: true })).toBeVisible();

  const pagination = page.getByRole("navigation", { name: "Pagination" }).first();
  await pagination.getByRole("button", { name: "Page 3" }).click();
  await expect(items.getByText("41", { exact: true })).toBeVisible();
  await expect(pagination).toContainText("Showing 41 to 60 of 113 items");

  await pagination.getByRole("combobox", { name: "Items per page" }).selectOption("50");
  await expect(pagination).toContainText("Showing 1 to 50 of 113 items");
});

// The boundary is the seam this whole area exists for: one report per crash, and a retry that
// puts the real panel back.
test("catches a crash in a boundary and reports it once", async ({ page }) => {
  await page.goto("/components/error-display");

  await page.getByTestId("crash").click();

  await expect(page.getByText("Something went wrong").first()).toBeVisible();
  await expect(page.getByTestId("report-count")).toHaveText("1");

  await page.getByRole("button", { name: "Try again" }).first().click();
  await expect(page.getByText("Quarterly revenue")).toBeVisible();
  await expect(page.getByTestId("report-count")).toHaveText("1");
});

test("switches the error page between a missing address and a failure", async ({ page }) => {
  await page.goto("/components/error-page");

  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await expect(page.getByText("/reports/2019")).toBeVisible();
  await expect(page.getByRole("button", { name: "Reload" })).toBeHidden();

  await page.getByRole("button", { name: "403" }).click();
  await expect(page.getByRole("heading", { name: "Something went wrong" })).toBeVisible();
  await expect(page.getByText("You do not have access to this workspace.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Reload" })).toBeVisible();
});
