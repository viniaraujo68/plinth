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

test("marks one entry current in each form, and Home only at the root", async ({ page }) => {
  await page.goto("/shell");

  // The demo opens deep under /orders. The root is a prefix of every route id, so a trail test
  // would light Home up here as well as Orders.
  await expect(page.locator(`${mobile} .shell-bottom-bar [aria-current='page']`)).toHaveText([
    "Orders",
  ]);
  await expect(page.locator(`${wide} .shell-sidebar [aria-current='page']`)).toHaveText(["Orders"]);

  await page.getByTestId("route-select").selectOption("/");

  await expect(page.locator(`${mobile} .shell-bottom-bar [aria-current='page']`)).toHaveText([
    "Home",
  ]);
  await expect(page.locator(`${wide} .shell-sidebar [aria-current='page']`)).toHaveText(["Home"]);
});

test("carries the sidebar's chrome into the sheet, in order", async ({ page }) => {
  await page.goto("/shell");

  const sheet = page.locator(`${mobile} .plinth-sheet`);
  await page.locator(`${mobile} .bar-link`, { hasText: "More" }).click();
  await expect(sheet).toBeVisible();

  // The brand heads it, the entries that did not fit follow, then the app's footer control, then
  // the user block — everything the bar form drops along with the sidebar.
  await expect(sheet.locator(".sheet-header")).toContainText("Acme");
  await expect(sheet.locator(".sheet-footer button")).toBeVisible();
  await expect(sheet.locator(".user-name")).toHaveText("Ada Lovelace");
  await expect(sheet.getByRole("button", { name: "Sign out" })).toBeVisible();
});

test("keeps the sheet open while a footer control is used, and closes it on sign-out", async ({
  page,
}) => {
  await page.goto("/shell");

  const sheet = page.locator(`${mobile} .plinth-sheet`);
  await page.locator(`${mobile} .bar-link`, { hasText: "More" }).click();

  const theme = sheet.locator(".sheet-footer button");
  const before = await theme.getAttribute("data-preference");
  await theme.click();

  // A theme picker is a setting, not a destination: dismissing here would hide its own result.
  await expect(theme).not.toHaveAttribute("data-preference", before!);
  await expect(sheet).toBeVisible();

  await sheet.getByRole("button", { name: "Sign out" }).click();

  // Signing out is a departure, and the block the button sits in has just stopped existing.
  await expect(sheet).toBeHidden();
  await expect(page.locator(`${wide} .user-card`)).toHaveCount(0);
});

test("keeps More once nothing overflows, for the sake of the sheet's chrome", async ({ page }) => {
  await page.goto("/shell");

  await page.getByTestId("toggle-role").click();
  await page.getByTestId("bar-slots").selectOption("8");

  // Seven entries into eight slots: every one of them rides the bar, and "More" takes the slot
  // none of them wanted rather than pushing an entry out of the way.
  await expect(page.locator(`${mobile} .bar-link`)).toHaveText([
    "Home",
    "Dashboard",
    "Orders",
    "Customers",
    "Invoices",
    "Inventory",
    "Settings",
    "More",
  ]);

  await page.locator(`${mobile} .bar-link`, { hasText: "More" }).click();

  const sheet = page.locator(`${mobile} .plinth-sheet`);
  await expect(sheet).toBeVisible();
  await expect(sheet.locator("a")).toHaveCount(0);
  await expect(sheet.locator(".user-name")).toHaveText("Ada Lovelace");
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

test("draws the signed-in user's avatar as a disc", async ({ page }) => {
  await page.goto("/shell");

  const avatar = page.locator(`${wide} .avatar-initials`);
  await expect(avatar).toHaveText("AL");
  await expect(avatar).toHaveCSS("border-radius", "9999px");
  await expect(avatar).toHaveCSS("clip-path", "none");
});

test("opens the top bar's account menu, closes it on a choice and signs out", async ({ page }) => {
  await page.goto("/shell");

  const frame = page.getByTestId("frame-top-bar");
  const trigger = frame.getByRole("button", { name: "Account menu" });
  await expect(trigger).toBeVisible();

  // The panel lives in the top layer, outside the frame, so it is found by its own class.
  const orders = page.locator(".plinth-top-bar-menu").getByRole("link", { name: "Orders" });
  await trigger.click();
  await expect(orders).toBeVisible();
  await orders.click();
  await expect(orders).toBeHidden();

  // The same context as the shell frames: signing out here signs them out too.
  await trigger.click();
  await page.locator(".plinth-top-bar-menu").getByRole("button", { name: "Sign out" }).click();
  await expect(trigger).toBeHidden();
  await expect(frame.getByRole("button", { name: "Sign in" })).toBeVisible();
  await expect(page.locator(`${wide} .avatar-initials`)).toHaveCount(0);
});

test("renders the breadcrumb trail of the current match", async ({ page }) => {
  await page.goto("/shell");

  const crumbs = page.locator("[data-testid='crumbs'] .crumb");
  await expect(crumbs).toHaveText(["Home", "Orders", "Order #7841", "Line 3"]);

  // Every ancestor has a page of its own, so each one links; the last crumb never does.
  await expect(page.locator("[data-testid='crumbs'] a")).toHaveText([
    "Home",
    "Orders",
    "Order #7841",
  ]);
  await expect(page.locator("[data-testid='crumbs'] [aria-current='page']")).toHaveText("Line 3");
});
