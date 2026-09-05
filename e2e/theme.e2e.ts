import { expect, test, type Page } from "@playwright/test";

// The scheme is decided purely by CSS, so the assertion has to be on what the browser computed on
// the root element -- checking the checkbox alone would pass even if the stylesheet never shipped.
const colorScheme = (page: Page) =>
  page.evaluate(() => getComputedStyle(document.documentElement).colorScheme);

// The showcase mounts a second toggle inside the page as a demo, so this one is scoped to the
// header -- the one every route has.
const toggle = (page: Page) => page.getByRole("banner").getByRole("button", { name: /^Theme:/ });

test("switches the resolved scheme from the showcase header", async ({ page }) => {
  await page.goto("/theme");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Theme");
  expect(await colorScheme(page)).toBe("light dark");

  await toggle(page).click();
  await expect(page.getByTestId("preference")).toHaveText("light");
  expect(await colorScheme(page)).toBe("light");

  await toggle(page).click();
  await expect(page.getByTestId("preference")).toHaveText("dark");
  expect(await colorScheme(page)).toBe("dark");
});

// This is the assertion that catches a build pipeline downlevelling `light-dark()` into inherited
// custom properties: page-level switching survives that rewrite, subtree theming does not.
test("re-themes a subtree independently of the page", async ({ page }) => {
  await page.goto("/theme");

  const background = (testId: string) =>
    page.getByTestId(testId).evaluate((node) => getComputedStyle(node).backgroundColor);

  expect(await background("subtree-light")).toBe("rgb(255, 255, 255)");
  expect(await background("subtree-dark")).toBe("rgb(20, 22, 28)");

  await toggle(page).click();
  await toggle(page).click();
  await expect(page.getByTestId("preference")).toHaveText("dark");

  expect(await background("subtree-light")).toBe("rgb(255, 255, 255)");
  expect(await background("subtree-dark")).toBe("rgb(20, 22, 28)");
});

test("restores the persisted preference on the next visit", async ({ page }) => {
  await page.goto("/theme");
  await toggle(page).click();
  await expect(page.getByTestId("preference")).toHaveText("light");

  await page.goto("/theme");

  await expect(page.getByTestId("preference")).toHaveText("light");
  expect(await colorScheme(page)).toBe("light");
});

// The seed a consumer stamps on <html> for a flash-free first paint. Everything below runs
// against the production build on purpose: Lightning CSS folds a selector list into `:is(...)`,
// whose specificity is the max over its arguments, so the seed only ever ties with the live
// controller in the built stylesheet -- never in dev, and never in the unit run.
const seed = (page: Page) =>
  page.route(/\/theme$/, async (route) => {
    const response = await route.fetch();
    const body = (await response.text()).replace("<html", '<html data-theme="plinth-dark"');
    await route.fulfill({ response, body });
  });

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("paints the stamped seed at first paint", async ({ page }) => {
    await seed(page);
    await page.goto("/theme");

    expect(await colorScheme(page)).toBe("dark");
  });
});

test("drops the stamped seed once the controller mounts", async ({ page }) => {
  await seed(page);
  await page.goto("/theme");

  await expect(page.getByTestId("preference")).toHaveText("system");
  expect(await page.evaluate(() => document.documentElement.hasAttribute("data-theme"))).toBe(
    false,
  );
  expect(await colorScheme(page)).toBe("light dark");
});

test("keeps a seed put back under a checked controller from painting", async ({ page }) => {
  await page.goto("/theme");
  await toggle(page).click();
  await expect(page.getByTestId("preference")).toHaveText("light");

  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "plinth-dark"));

  expect(await colorScheme(page)).toBe("light");
});
