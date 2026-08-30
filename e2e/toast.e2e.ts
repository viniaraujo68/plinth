import { expect, test } from "@playwright/test";

// Longer than every default auto-dismiss delay, so surviving it is proof of stickiness rather
// than of a slow assertion.
const PAST_EVERY_DURATION_MS = 5500;

test.beforeEach(async ({ page }) => {
  await page.goto("/components/toast");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Toast");

  // The prerendered markup answers every query on this page, so waiting for it proves nothing:
  // a click landing before hydration is silently swallowed. Reaching <body> is the one state the
  // server cannot produce -- only the client attachment portals the stack into the top layer.
  await expect(page.locator("body > [role='region'][aria-live='polite']")).toHaveCount(1);
});

test("fires one toast per variant, each with its own severity", async ({ page }) => {
  await page.getByTestId("fire-success").click();
  await expect(page.getByText("Settings saved.")).toBeVisible();
  await expect(page.getByTestId("toast")).toHaveAttribute("role", "status");

  await page.getByTestId("fire-error").click();
  const error = page.getByTestId("toast").filter({ hasText: "Could not reach the server." });
  await expect(error).toHaveAttribute("role", "alert");
  await expect(error).toContainText("Check your connection and try again.");

  await page.getByTestId("clear").click();
  await expect(page.getByTestId("toast")).toHaveCount(0);
});

test("takes an auto-dismissing toast away on its own", async ({ page }) => {
  await page.getByTestId("fire-success").click();
  await expect(page.getByText("Settings saved.")).toBeVisible();

  await expect(page.getByTestId("toast")).toHaveCount(0, { timeout: PAST_EVERY_DURATION_MS });
});

test("keeps a sticky toast until something dismisses it", async ({ page }) => {
  await page.getByTestId("fire-sticky").click();
  const sticky = page.getByText("Upload in progress.");
  await expect(sticky).toBeVisible();

  await page.waitForTimeout(PAST_EVERY_DURATION_MS);
  await expect(sticky).toBeVisible();

  await page.getByTestId("dismiss-sticky").click();
  await expect(sticky).toBeHidden();
});

test("dismisses a toast from its own button", async ({ page }) => {
  await page.getByTestId("fire-sticky").click();
  await expect(page.getByText("Upload in progress.")).toBeVisible();

  await page.getByRole("button", { name: "Dismiss notification" }).click();

  await expect(page.getByTestId("toast")).toHaveCount(0);
});

test("replaces a toast in place when the id is reused", async ({ page }) => {
  await page.getByTestId("fire-replaced").click();
  await expect(page.getByText("Publishing…")).toBeVisible();

  await expect(page.getByText("Published.")).toBeVisible();
  // The outcome takes over the pending toast's slot rather than stacking a second one.
  await expect(page.getByTestId("toast")).toHaveCount(1);
});

// The stack is portalled into the top layer, so this is also what proves the popover host did not
// strand the region somewhere the assistive tree cannot reach.
test("stacks toasts inside a labelled polite live region on the body", async ({ page }) => {
  const region = page.getByRole("region", { name: "Notifications" });

  await expect(region).toHaveAttribute("aria-live", "polite");
  expect(await region.evaluate((node) => node.parentElement?.tagName)).toBe("BODY");

  await page.getByTestId("fire-sticky").click();
  await expect(region.getByTestId("toast")).toHaveCount(1);
});
