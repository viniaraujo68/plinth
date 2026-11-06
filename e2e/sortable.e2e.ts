import { expect, test } from "@playwright/test";

const order = (page: import("@playwright/test").Page) =>
  page
    .getByTestId("team")
    .allTextContents()
    .then((texts) => texts.map((text) => text.trim()));

test("a team dragged by its grip takes the place it is dropped on", async ({ page }) => {
  await page.goto("/components/sortable");
  const grip = page.getByRole("button", { name: "Move Red" });
  const from = (await grip.boundingBox())!;
  const to = (await page.getByTestId("team").first().boundingBox())!;

  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + 4, to.y + to.height / 2, { steps: 12 });
  await page.mouse.up();

  expect(await order(page)).toEqual(["Red", "Black", "White", "Blue", "Green"]);
  await expect(page.getByTestId("first-match")).toHaveText("Red x Black");
});

test("the arrow keys move the focused grip's team and the focus goes with it", async ({ page }) => {
  await page.goto("/components/sortable");
  await page.getByRole("button", { name: "Move Black" }).focus();

  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");

  expect(await order(page)).toEqual(["White", "Red", "Black", "Blue", "Green"]);
  await expect(page.getByRole("button", { name: "Move Black" })).toBeFocused();
});

test("a task dragged down by its grip takes the row it is dropped on", async ({ page }) => {
  await page.goto("/components/sortable");
  const tasks = page.getByTestId("task");
  const grip = (await page
    .getByRole("button", { name: "Move Book the pitch for Thursday" })
    .boundingBox())!;
  const third = (await tasks.nth(2).boundingBox())!;

  await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
  await page.mouse.down();
  await page.mouse.move(grip.x + grip.width / 2, third.y + third.height / 2 + 8, { steps: 16 });
  await page.mouse.up();

  await expect(tasks.first()).toContainText("Collect this month's fees");
  await expect(tasks.nth(2)).toContainText("Book the pitch for Thursday");
});
