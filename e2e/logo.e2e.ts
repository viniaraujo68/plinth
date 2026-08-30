import { expect, test } from "@playwright/test";

test("animates only the instance that asked for it", async ({ page }) => {
  await page.goto("/components/logo");

  const animationName = (testId: string) =>
    page
      .getByTestId(testId)
      .locator("div")
      .first()
      .evaluate((bar) => getComputedStyle(bar).animationName);

  await expect(page.getByTestId("static")).not.toHaveAttribute("data-animated");
  expect(await animationName("static")).toBe("none");

  await expect(page.getByTestId("animated")).toHaveAttribute("data-animated", "");
  expect(await animationName("animated")).not.toBe("none");
});

test("stands in for content while it loads, and announces that it is doing so", async ({
  page,
}) => {
  await page.goto("/components/logo");

  const overlay = page.getByRole("status", { name: "Loading batches" });
  await expect(overlay).toBeHidden();

  await page.getByTestId("reload").click();
  await expect(overlay).toBeVisible();
  await expect(overlay.locator(".plinth-logo > div")).toHaveCount(3);

  await expect(overlay).toBeHidden({ timeout: 5000 });
});
