import { expect, test } from "@playwright/test";

test("serves the showcase home from the static build", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("plinth");
});

// The index is the only page that knows the full set of demos, so a route that stops being linked
// from it is a demo nobody can reach from the navigation.
test("reaches every component demo from the components index", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Components", exact: true }).click();

  const links = page.getByTestId("demo-link");
  await expect(links).toHaveCount(13);

  await page.getByRole("link", { name: "Modal" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Modal");
  // The section tab stays marked as current on a page below it.
  await expect(page.getByRole("link", { name: "Components", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );
});
