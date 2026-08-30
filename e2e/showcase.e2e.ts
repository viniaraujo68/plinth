import { expect, test } from "@playwright/test";

test("serves the showcase home from the static build", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("plinth");
});
