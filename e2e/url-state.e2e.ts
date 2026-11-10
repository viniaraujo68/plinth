import { expect, test, type Page } from "@playwright/test";

const search = (page: Page) => new URL(page.url()).searchParams;

test("opens a deep link on the filters and page it carries", async ({ page }) => {
  await page.goto("/url-state?q=the&page=2&tab=foreign");

  await expect(page.getByTestId("filter-q")).toHaveValue("the");
  await expect(page.getByTestId("page-number")).toHaveText("Page 2 of 2");
  await expect(page.getByTestId("result")).toHaveCount(3);
  await expect(page.getByTestId("key")).toHaveText('"q=the&page=2"');
});

test("falls back to the defaults for params it cannot read", async ({ page }) => {
  await page.goto("/url-state?page=banana&genres=cookbooks");

  await expect(page.getByTestId("page-number")).toHaveText("Page 1 of 4");
  await expect(page.getByTestId("key")).toHaveText('""');
});

test("applies the draft only on Apply, keeping foreign params", async ({ page }) => {
  await page.goto("/url-state?tab=foreign");
  await expect(page.getByTestId("dirty")).toHaveText("draft matches committed");

  await page.getByTestId("filter-q").fill("helix");

  await expect(page.getByTestId("dirty")).toHaveText("draft differs from committed");
  await expect(page.getByTestId("result")).toHaveCount(4);
  expect(search(page).get("q")).toBeNull();

  await page.getByTestId("apply").click();

  await expect(page).toHaveURL(/q=helix/);
  expect(search(page).get("tab")).toBe("foreign");
  await expect(page.getByTestId("result")).toHaveText(["The Double Helix"]);
  await expect(page.getByTestId("key")).toHaveText('"q=helix"');
  await expect(page.getByTestId("dirty")).toHaveText("draft matches committed");
});

test("turns pages eagerly without applying a half-typed filter", async ({ page }) => {
  await page.goto("/url-state");

  await page.getByTestId("page-next").click();
  await expect(page).toHaveURL(/page=2/);

  await page.getByTestId("filter-q").fill("zzz");
  await page.getByTestId("page-next").click();

  await expect(page).toHaveURL(/page=3/);
  expect(search(page).get("q")).toBeNull();
  await expect(page.getByTestId("filter-q")).toHaveValue("zzz");
  await expect(page.getByTestId("page-number")).toHaveText("Page 3 of 4");
});

test("returns to the first page when a filter is applied", async ({ page }) => {
  await page.goto("/url-state?page=3");
  await expect(page.getByTestId("page-number")).toHaveText("Page 3 of 4");

  await page.getByTestId("filter-q").fill("the");
  await page.getByTestId("apply").click();

  await expect(page).toHaveURL(/q=the/);
  expect(search(page).get("page")).toBeNull();
  await expect(page.getByTestId("page-number")).toHaveText("Page 1 of 2");
});

test("reverts the draft and clears everything", async ({ page }) => {
  await page.goto("/url-state?q=the&page=2");
  await expect(page.getByTestId("filter-q")).toHaveValue("the");

  await page.getByTestId("filter-q").fill("something else");
  await page.getByTestId("revert").click();
  await expect(page.getByTestId("filter-q")).toHaveValue("the");

  await page.getByTestId("clear").click();

  await expect(page).toHaveURL(/\/url-state$/);
  await expect(page.getByTestId("filter-q")).toHaveValue("");
  await expect(page.getByTestId("page-number")).toHaveText("Page 1 of 4");
});

test("restores the previous filters on the back button", async ({ page }) => {
  await page.goto("/url-state");

  await page.getByTestId("filter-q").fill("the");
  await page.getByTestId("apply").click();
  await expect(page).toHaveURL(/q=the/);

  await page.getByTestId("filter-q").fill("helix");
  await page.getByTestId("apply").click();
  await expect(page).toHaveURL(/q=helix/);

  await page.goBack();

  await expect(page).toHaveURL(/q=the/);
  await expect(page.getByTestId("filter-q")).toHaveValue("the");
  await expect(page.getByTestId("page-number")).toHaveText("Page 1 of 2");
});

test("searches as you type without adding a history entry per keystroke", async ({ page }) => {
  await page.goto("/patterns");
  await page.getByRole("link", { name: "url-state" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("URL state");

  await page.getByTestId("find").pressSequentially("ma");

  await expect(page).toHaveURL(/find=ma$/);
  await expect(page.getByTestId("find")).toBeFocused();
  await expect(page.getByTestId("found").getByRole("listitem")).toHaveText(["magenta", "maroon"]);

  await page.goBack();

  await expect(page).toHaveURL(/\/patterns$/);
});
