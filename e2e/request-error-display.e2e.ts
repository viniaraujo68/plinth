import { expect, test } from "@playwright/test";

test("renders every kind side by side, the three browsers' offline messages alike", async ({
  page,
}) => {
  await page.goto("/components/request-error-display");

  const samples = page.getByTestId("kind-sample");
  await expect(samples).toHaveCount(8);
  for (const index of [0, 1, 2])
    await expect(samples.nth(index).locator("[data-kind]")).toHaveAttribute("data-kind", "offline");
  await expect(samples.nth(3)).toContainText("Sign-in required");
  await expect(samples.nth(4)).toContainText("Access denied");
  await expect(samples.nth(5)).toContainText("Not found");
  await expect(samples.nth(6)).toContainText("Server error");
  await expect(samples.nth(7)).toContainText("Something went wrong");
});

test("classifies a real failed request and retries it", async ({ page }) => {
  await page.goto("/components/request-error-display");
  await expect(page.locator("body > [role='region'][aria-live='polite']")).toHaveCount(1);
  const live = page.getByTestId("live-request");

  await page.getByTestId("request-missing").click();
  await expect(live.locator("[data-kind]")).toHaveAttribute("data-kind", "not-found");

  await page.getByTestId("request-unreachable").click();
  await expect(live.locator("[data-kind]")).toHaveAttribute("data-kind", "offline");

  await live.getByRole("button", { name: "Try again" }).click();
  await expect(live.locator("[data-kind]")).toHaveAttribute("data-kind", "offline");
});
