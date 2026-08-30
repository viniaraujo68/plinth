import { expect, test } from "@playwright/test";

// Both frames on the demo page hold a full shell against the same routing context; the only
// difference between them is the width of the box. That is what makes the two forms assertable in
// one viewport, with no device emulation.
const wide = "[data-testid='frame-wide']";
const mobile = "[data-testid='frame-mobile']";

test("shows the sidebar in the wide frame and the bottom bar in the narrow one", async ({
  page,
}) => {
  await page.goto("/shell");

  await expect(page.locator(`${wide} .shell-sidebar`)).toBeVisible();
  await expect(page.locator(`${wide} .shell-bottom-bar`)).toBeHidden();

  await expect(page.locator(`${mobile} .shell-bottom-bar`)).toBeVisible();
  await expect(page.locator(`${mobile} .shell-sidebar`)).toBeHidden();
});

test("feeds both forms from one declaration", async ({ page }) => {
  await page.goto("/shell");

  // The sidebar lists everything; the bar keeps four and spends its last slot on "More".
  await expect(page.locator(`${wide} .shell-sidebar .nav-link`)).toHaveText([
    "Home",
    "Dashboard",
    "Orders",
    "Customers",
    "Invoices",
    "Reports",
    "Inventory",
    "Settings",
  ]);
  await expect(page.locator(`${mobile} .bar-link`)).toHaveText([
    "Home",
    "Dashboard",
    "Orders",
    "Customers",
    "More",
  ]);
});

test("opens the overflow sheet and navigates from it", async ({ page }) => {
  await page.goto("/shell");

  const sheet = page.locator(`${mobile} .plinth-sheet`);
  await expect(sheet).toBeHidden();

  await page.locator(`${mobile} .bar-link`, { hasText: "More" }).click();

  await expect(sheet).toBeVisible();
  await expect(sheet.locator("a")).toHaveText(["Invoices", "Reports", "Inventory", "Settings"]);

  await sheet.getByRole("link", { name: "Settings" }).click();

  // Choosing from the sheet dismisses it, and the choice reaches the other frame too: one context,
  // two shells.
  await expect(sheet).toBeHidden();
  await expect(page.locator(`${wide} .shell-sidebar [aria-current='page']`)).toHaveText("Settings");
});

test("drops a gated entry from every form at once", async ({ page }) => {
  await page.goto("/shell");

  await expect(
    page.locator(`${wide} .shell-sidebar .nav-link`, { hasText: "Reports" }),
  ).toHaveCount(1);

  await page.getByTestId("toggle-role").click();

  await expect(
    page.locator(`${wide} .shell-sidebar .nav-link`, { hasText: "Reports" }),
  ).toHaveCount(0);

  await page.locator(`${mobile} .bar-link`, { hasText: "More" }).click();
  await expect(page.locator(`${mobile} .plinth-sheet a`)).toHaveText([
    "Invoices",
    "Inventory",
    "Settings",
  ]);
});

test("remembers the collapsed sidebar across a reload", async ({ page }) => {
  await page.goto("/shell");

  const toggle = page.locator(`${wide}`).getByRole("button", { name: "Toggle sidebar" });
  await expect(toggle).toHaveAttribute("aria-pressed", "false");

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");

  await page.reload();

  await expect(
    page.locator(`${wide}`).getByRole("button", { name: "Toggle sidebar" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(`${wide} .plinth-shell`)).toHaveClass(/collapsed/);
});

test("gives each shell on the page its own copy of the avatar mask", async ({ page }) => {
  await page.goto("/shell");

  const avatar = page.locator(`${wide} .avatar-initials`);
  await expect(avatar).toHaveText("AL");
  await expect(avatar).toHaveCSS("clip-path", /url\(/);

  // Two shells share this page, and a shared id would have pointed both at whichever definition
  // the parser reached first — invisible here, and wrong the moment the two differ.
  const masks = await page
    .locator(".avatar-initials")
    .evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).clipPath));

  expect(masks).toHaveLength(2);
  expect(new Set(masks).size).toBe(2);
});

test("renders the breadcrumb trail of the current match", async ({ page }) => {
  await page.goto("/shell");

  const crumbs = page.locator("[data-testid='crumbs'] .crumb");
  await expect(crumbs).toHaveText(["Home", "Orders", "Order #7841", "Line 3"]);

  // "/orders" has no page of its own, so it is text; the last crumb is never a link.
  await expect(page.locator("[data-testid='crumbs'] a")).toHaveText(["Home", "Order #7841"]);
  await expect(page.locator("[data-testid='crumbs'] [aria-current='page']")).toHaveText("Line 3");
});
