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
  await expect(links).toHaveCount(20);

  await page.getByRole("link", { name: "Modal" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Modal");
  // The section tab stays marked as current on a page below it.
  await expect(page.getByRole("link", { name: "Components", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );
});

// DataTable is the one component demo that lives outside `/components`, because it ships from its
// own entry point. The Components tab therefore has to claim it through `covers`, which is the one
// thing about that card the URL cannot check on its own.
test("claims the top-level table demo for the components tab", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Components", exact: true }).click();
  await page.getByRole("link", { name: "DataTable" }).click();

  await expect(page).toHaveURL(/\/table$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("DataTable");
  await expect(page.getByRole("link", { name: "Components", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );
});

// The pattern demos are top-level routes the Patterns index only links to, so the tab claims them
// through `covers` rather than through the URL. Both halves of that are asserted here.
test("reaches every pattern demo from the patterns index", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Patterns", exact: true }).click();

  const links = page.getByTestId("pattern-link");
  await expect(links).toHaveCount(5);

  await page.getByRole("link", { name: "formatters" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Formatters");
  await expect(page.getByRole("link", { name: "Patterns", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );
});
