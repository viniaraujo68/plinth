import { expect, test, type Page } from "@playwright/test";

// Chromium hands out neither clipboard verb to an automated context on its own.
test.use({ permissions: ["clipboard-read", "clipboard-write"] });

const clipboard = (page: Page) => page.evaluate(() => navigator.clipboard.readText());

test("copies the rendered value and confirms it", async ({ page }) => {
  await page.goto("/components/copyable");

  const copy = page.getByTestId("webhook").getByRole("button");
  await copy.click();

  await expect(copy).toHaveAttribute("aria-label", "Copied");
  expect(await clipboard(page)).toBe("https://example.test/hooks/2f6c1b90a4e34d7f");

  // The confirmation is a moment, not a state: it has to come back on its own.
  await expect(copy).toHaveAttribute("aria-label", "Copy");
});

test("copies the whole value even where the cell shows a truncated one", async ({ page }) => {
  await page.goto("/components/copyable");

  const id = "b7f1c0a4-3d8e-4a11-9c22-5e6f70d81b93";
  await page.getByRole("row").filter({ hasText: "Alpha" }).getByRole("button").click();

  expect(await clipboard(page)).toBe(id);
});

test("leaves the content's own behavior alone", async ({ page }) => {
  await page.goto("/components/copyable");

  // Clicking the link must navigate, not copy -- the button is the only thing that copies.
  await page.getByRole("row").filter({ hasText: "Bravo" }).getByRole("link").click();

  await expect(page).toHaveURL(/#0a3d9e51-77bc-4f0a-8e19-2c4b6a0f5d77$/);
});
