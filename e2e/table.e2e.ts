import { expect, test } from "@playwright/test";

// Two tables on the demo page share one bound sort state; the only difference between them is the
// width of the box. That is what makes both forms assertable in one viewport, with no device
// emulation.
const wide = "[data-testid='wide']";
const narrow = "[data-testid='narrow']";

const peaks = (frame: string) => `${frame} tbody [data-label='Peak']`;

test("sorts on a header click and says so through aria-sort", async ({ page }) => {
  await page.goto("/table");

  const header = page.locator(`${wide} th`, { hasText: "Peak" });
  const button = page.locator(wide).getByRole("button", { name: "Peak" });
  await expect(header).toHaveAttribute("aria-sort", "none");

  await button.click();

  await expect(header).toHaveAttribute("aria-sort", "ascending");
  await expect(page.locator(peaks(wide)).first()).toHaveText("Denali");

  await button.click();

  await expect(header).toHaveAttribute("aria-sort", "descending");
  await expect(page.locator(peaks(wide)).first()).toHaveText("Olympus");
});

test("opens the table on the numeric column it was given", async ({ page }) => {
  await page.goto("/table");

  await expect(page.locator(peaks(wide)).first()).toHaveText("Everest");
  await expect(page.locator(`${wide} th`, { hasText: "Elevation" })).toHaveAttribute(
    "aria-sort",
    "descending",
  );
});

test("keeps rows without a value at the end in both directions", async ({ page }) => {
  await page.goto("/table");

  const ascent = page.locator(wide).getByRole("button", { name: "First ascent" });

  await ascent.click();
  await expect(page.locator(peaks(wide)).last()).toHaveText("Fuji");

  await ascent.click();
  await expect(page.locator(peaks(wide)).last()).toHaveText("Fuji");
});

test("renders the card form in the narrow frame and the table form in the wide one", async ({
  page,
}) => {
  await page.goto("/table");

  await expect(page.locator(`${wide} tbody .plinth-cell`).first()).toHaveCSS(
    "display",
    "table-cell",
  );
  await expect(page.locator(`${narrow} tbody .plinth-cell`).first()).toHaveCSS("display", "flex");
  // The headers survive as a strip of sort pills: on a phone they are the only sort control there is.
  await expect(page.locator(`${narrow} thead tr`)).toHaveCSS("display", "flex");
});

test("drives both tables from one bound sort state", async ({ page }) => {
  await page.goto("/table");

  await page.locator(narrow).getByRole("button", { name: "Peak" }).click();

  await expect(page.getByTestId("sort-state")).toHaveText("name asc");
  await expect(page.locator(peaks(wide)).first()).toHaveText("Denali");
  await expect(page.locator(peaks(narrow)).first()).toHaveText("Denali");
});

test("swaps the label/value pairs for a card snippet", async ({ page }) => {
  await page.goto("/table");

  // No snippet, no element: the card cell is only in the markup when the app supplies one.
  await expect(page.locator(`${narrow} .plinth-card`)).toHaveCount(0);

  await page.getByTestId("card-snippet").check();

  await expect(page.locator(`${narrow} .plinth-card`).first()).toHaveCSS("display", "block");
  // Never both: the label/value pairs step aside for the card rather than stacking under it.
  await expect(page.locator(`${narrow} tbody .plinth-cell`).first()).toHaveCSS("display", "none");
});

test("reports the row that was clicked", async ({ page }) => {
  await page.goto("/table");

  await page.locator(`${wide} tbody tr`).nth(1).click();

  await expect(page.getByTestId("selected")).toHaveText("K2");
});

test("keeps the headers when there is nothing to show", async ({ page }) => {
  await page.goto("/table");

  const empty = page.getByTestId("empty-table");

  await expect(empty.getByTestId("empty-message")).toBeVisible();
  await expect(empty.locator("th")).toHaveCount(5);
});
