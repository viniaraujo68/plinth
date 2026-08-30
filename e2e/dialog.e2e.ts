import { expect, test } from "@playwright/test";

test("mounts a dialog's children only while it is open", async ({ page }) => {
  await page.goto("/components/dialog");

  await expect(page.getByTestId("mount-count")).toHaveText("0");
  await expect(page.getByTestId("plain-content")).toBeHidden();

  await page.getByTestId("open-plain").click();

  await expect(page.getByTestId("plain-content")).toBeVisible();
  await expect(page.getByTestId("mount-state")).toHaveText("yes");
  await expect(page.getByTestId("mount-count")).toHaveText("1");

  await page.keyboard.press("Escape");

  await expect(page.getByTestId("plain-content")).toBeHidden();
  await expect(page.getByTestId("mount-state")).toHaveText("no");

  await page.getByTestId("open-plain").click();

  await expect(page.getByTestId("mount-count")).toHaveText("2");
});

test("returns focus to the opener when a stacked dialog closes", async ({ page }) => {
  await page.goto("/components/dialog");

  await page.getByTestId("open-plain").click();
  await page.getByTestId("open-nested").click();
  await expect(page.getByTestId("nested-content")).toBeVisible();

  await page.keyboard.press("Escape");

  await expect(page.getByTestId("nested-content")).toBeHidden();
  await expect(page.getByTestId("plain-content")).toBeVisible();
  await expect(page.getByTestId("open-nested")).toBeFocused();
});

test("locks the background scroll while a modal is open and restores it", async ({ page }) => {
  await page.goto("/components/modal");

  const overflow = () => page.evaluate(() => document.body.style.overflow);
  expect(await overflow()).toBe("");

  await page.getByTestId("open-long").click();
  await expect(page.getByTestId("long-content")).toBeVisible();
  expect(await overflow()).toBe("hidden");

  await page.getByRole("button", { name: "Close" }).click();

  await expect(page.getByTestId("long-content")).toBeHidden();
  expect(await overflow()).toBe("");
});

test("scrolls a long modal body without moving its header", async ({ page }) => {
  await page.goto("/components/modal");
  await page.getByTestId("open-long").click();

  const heading = page.getByRole("heading", { name: "What the browser does, and what this adds" });
  const before = await heading.boundingBox();

  const body = page.getByTestId("long-content").locator("..");
  await body.evaluate((element) => element.scrollTo(0, element.scrollHeight));

  expect(await body.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  expect(await heading.boundingBox()).toEqual(before);
});

test("refuses to close a modal that requires a decision until one is made", async ({ page }) => {
  await page.goto("/components/modal");
  await page.getByTestId("open-blocking").click();

  await expect(page.getByTestId("blocking-content")).toBeVisible();
  await expect(page.getByRole("button", { name: "Close" })).toHaveCount(0);

  await page.keyboard.press("Escape");
  await expect(page.getByTestId("blocking-content")).toBeVisible();

  await page.getByTestId("blocking-discard").click();

  await expect(page.getByTestId("blocking-content")).toBeHidden();
  await expect(page.getByTestId("decision")).toHaveText("discarded");
});
