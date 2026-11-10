import { expect, test, type Page } from "@playwright/test";

const ledger = "[data-testid='ledger']";
const chat = "[data-testid='chat']";
const windowed = "[data-testid='windowed']";

const settleFrames = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );

test("is reached from the patterns index and claimed by the patterns tab", async ({ page }) => {
  await page.goto("/patterns");
  await page
    .getByTestId("pattern-link")
    .filter({ hasText: "@viniaraujo68/plinth/virtual" })
    .click();

  await expect(page).toHaveURL(/\/virtual$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Virtual");
  await expect(page.getByRole("link", { name: "Patterns", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );
});

test("renders a small slice of the 100,000-row ledger and jumps to a row", async ({ page }) => {
  await page.goto("/virtual");

  const rows = page.locator(`${ledger} [data-testid='ledger-row']`);
  await expect(rows.first()).toContainText("#1");
  expect(await rows.count()).toBeLessThan(40);

  await page.getByTestId("ledger-target").fill("75000");
  await page.locator(ledger).getByRole("button", { name: "Jump to row" }).click();

  await expect(page.locator(ledger).getByText("#75,000", { exact: true })).toBeVisible();
  await expect(page.locator(ledger).getByText("#1", { exact: true })).toHaveCount(0);
});

test("opens the chat at the newest message and keeps the reader in place on load older", async ({
  page,
}) => {
  await page.goto("/virtual");

  const viewport = page.getByRole("region", { name: "Conversation" });
  await expect(page.locator(`${chat} [data-message='1199']`)).toBeVisible();

  await viewport.evaluate((element) => {
    element.scrollTop = element.scrollHeight - element.clientHeight - 600;
  });
  await settleFrames(page);
  await settleFrames(page);
  const id = await page.locator(`${chat} [data-message]`).nth(10).getAttribute("data-message");
  const message = page.locator(`${chat} [data-message='${id ?? ""}']`);
  const offsetInViewport = () =>
    message.evaluate((element) => {
      const region = element.closest("[role='region']");
      return element.getBoundingClientRect().top - (region?.getBoundingClientRect().top ?? 0);
    });
  const before = await offsetInViewport();

  await page.locator(chat).getByRole("button", { name: "Load older" }).click();
  await expect(page.getByTestId("chat-count")).toHaveText("230");

  await expect.poll(offsetInViewport).toBeCloseTo(before, 0);
});

test("follows a sent message when the reader is at the end", async ({ page }) => {
  await page.goto("/virtual");

  await expect(page.locator(`${chat} [data-message='1199']`)).toBeVisible();
  await page.locator(chat).getByRole("button", { name: "Send" }).click();

  await expect(page.locator(`${chat} [data-message='1200']`)).toBeVisible();
});

test("loads the paged list, then shows and recovers from failed pages", async ({ page }) => {
  await page.goto("/virtual");

  const rows = page.locator(`${windowed} [data-testid='shipment-row']`);
  await expect(rows.first()).toContainText("SH-25000");
  await expect(page.getByTestId("windowed-count")).toHaveText("25,000");

  await page.getByTestId("fail-pages").check();
  await page.getByRole("region", { name: "Shipments" }).evaluate((element) => {
    element.scrollTop = 44 * 60;
  });

  const alert = page.locator(windowed).getByRole("alert");
  await expect(alert).toContainText("Some rows could not be loaded.");
  await expect(page.getByTestId("failed-pages")).toHaveText("1");

  await page.getByTestId("fail-pages").uncheck();
  await alert.getByRole("button", { name: "Retry" }).click();

  await expect(alert).toHaveCount(0);
  await expect(page.locator(windowed).getByText("SH-24940", { exact: true })).toBeVisible();
});

test("starts over when the order changes", async ({ page }) => {
  await page.goto("/virtual");

  const rows = page.locator(`${windowed} [data-testid='shipment-row']`);
  await expect(rows.first()).toContainText("SH-25000");

  await page.locator(windowed).getByRole("button", { name: "Oldest" }).click();

  await expect(rows.first()).toContainText("SH-00001");
});
