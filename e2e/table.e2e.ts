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
  await expect(empty.locator("th")).toHaveCount(6);
});

// The rank column reads nothing off its row: its only input is the position argument, which is why
// it renumbers on a sort instead of travelling with the peak it started next to.
test("renumbers the rank column as the sort changes", async ({ page }) => {
  await page.goto("/table");

  const ranked = (frame: string) => page.locator(`${frame} tbody tr`).first();

  await expect(ranked(wide).locator("[data-label='#']")).toHaveText("1");
  await expect(ranked(wide).locator("[data-label='Peak']")).toHaveText("Everest");

  await page.locator(wide).getByRole("button", { name: "Peak" }).click();

  await expect(ranked(wide).locator("[data-label='#']")).toHaveText("1");
  await expect(ranked(wide).locator("[data-label='Peak']")).toHaveText("Denali");
  // Both tables share the sort, so both renumber.
  await expect(ranked(narrow).locator("[data-label='#']")).toHaveText("1");
  await expect(page.locator(`${wide} tbody tr`).last().locator("[data-label='#']")).toHaveText("7");
});

test("names every sort control through sortLabel, pills included", async ({ page }) => {
  await page.goto("/table");

  await expect(
    page.locator(wide).getByRole("button", { name: "Sort by Elevation", exact: true }),
  ).toBeVisible();
  await expect(
    page.locator(narrow).getByRole("button", { name: "Sort by Elevation", exact: true }),
  ).toBeVisible();
});

const arranged = "[data-testid='arranged']";
const arrangedHeaders = (page: import("@playwright/test").Page) =>
  page.locator(`${arranged} thead th`);

test.describe("a table the reader arranges", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/table");
    await page.evaluate(() => localStorage.removeItem("plinth-showcase:peaks"));
    await page.reload();
  });

  test("hides a column from the menu and keeps it hidden after a reload", async ({ page }) => {
    await expect(arrangedHeaders(page)).toHaveCount(5);
    await page.locator(arranged).getByRole("button", { name: "Columns" }).click();
    await page.getByRole("checkbox", { name: "Range" }).click();

    await expect(arrangedHeaders(page)).toHaveCount(4);
    await expect(page.locator(`${arranged} th`, { hasText: "Range" })).toHaveCount(0);

    await page.reload();
    await expect(arrangedHeaders(page)).toHaveCount(4);
    await expect(page.locator(`${arranged} th`, { hasText: "Range" })).toHaveCount(0);
  });

  test("reorders columns by dragging a row of the menu", async ({ page }) => {
    await page.locator(arranged).getByRole("button", { name: "Columns" }).click();
    const list = page.getByRole("list", { name: "Columns" });
    const grade = list.locator("li", { hasText: "Grade" });
    const peak = list.locator("li", { hasText: "Peak" });

    await grade.dragTo(peak, { targetPosition: { x: 20, y: 2 } });

    await expect(arrangedHeaders(page).nth(1)).toContainText("Grade");
  });

  test("resizes a column by dragging its header's edge", async ({ page }) => {
    const handle = page.locator(arranged).getByRole("separator", { name: "Resize Range" });
    const header = page.locator(`${arranged} th`, { hasText: "Range" });
    // `page.mouse` works in viewport coordinates and never scrolls on its own.
    await handle.scrollIntoViewIfNeeded();
    const before = (await header.boundingBox())?.width ?? 0;
    const box = await handle.boundingBox();
    if (!box) throw new Error("the resize handle is not on screen");

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2, { steps: 6 });
    await page.mouse.up();

    const after = (await header.boundingBox())?.width ?? 0;
    expect(after).toBeGreaterThan(before + 100);

    await handle.dblclick();
    await expect.poll(async () => (await header.boundingBox())?.width ?? 0).toBeLessThan(after);
  });

  test("renders the toolbar in the same bar as the menu", async ({ page }) => {
    await page.getByRole("button", { name: "feet" }).click();

    await expect(page.locator(`${arranged} th`, { hasText: "Elevation (ft)" })).toBeVisible();
    await expect(page.locator(`${arranged} tbody tr`).first()).toContainText("29,032");
  });
});
