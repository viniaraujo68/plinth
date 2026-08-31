import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/components/confirm");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Confirm");

  // The prerendered markup answers every query on this page, so waiting for it proves nothing: a
  // click landing before hydration is silently swallowed. The openers are disabled until the page
  // has hydrated, which makes "enabled" the one state the server cannot produce.
  await expect(page.getByTestId("ask-plain")).toBeEnabled();
});

test("answers a plain question both ways", async ({ page }) => {
  await page.getByTestId("ask-plain").click();
  await expect(page.getByRole("dialog", { name: "Archive this report?" })).toBeVisible();

  await page.getByTestId("confirm-cancel").click();
  await expect(page.getByTestId("outcome")).toHaveText("Archive — cancelled");

  await page.getByTestId("ask-plain").click();
  await page.getByTestId("confirm-accept").click();
  await expect(page.getByTestId("outcome")).toHaveText("Archive — confirmed");
});

test("renders a title-only question as nothing but a heading and its actions", async ({ page }) => {
  await page.getByTestId("ask-title-only").click();
  const dialog = page.getByRole("dialog", { name: "Leave without saving?" });
  await expect(dialog).toBeVisible();

  // Measured rather than eyeballed: no empty padded strip between the two bands. The box's own
  // 1px border is not a band, and `getBoundingClientRect` counts it at both ends.
  const gap = await dialog.locator(".modal-box").evaluate((box) => {
    const style = getComputedStyle(box);
    const height = (element: Element | null) => element?.getBoundingClientRect().height ?? 0;

    return (
      height(box) -
      parseFloat(style.borderTopWidth) -
      parseFloat(style.borderBottomWidth) -
      height(box.querySelector("header")) -
      height(box.querySelector("footer"))
    );
  });
  expect(gap).toBeLessThan(1);

  await page.getByTestId("confirm-cancel").click();
  await expect(page.getByTestId("outcome")).toHaveText("Leave — cancelled");
});

test("opens a destructive question on cancel, with the action styled as destructive", async ({
  page,
}) => {
  await page.getByTestId("ask-danger").click();
  await expect(page.getByRole("dialog", { name: "Delete Thursday night?" })).toBeVisible();

  // A stray Enter has to hit cancel, never the button that deletes.
  await expect(page.getByTestId("confirm-cancel")).toBeFocused();
  await expect(page.getByTestId("confirm-accept")).toHaveClass(/btn-error/);
  await expect(page.getByTestId("confirm-accept")).toHaveText("Delete the night");

  await page.keyboard.press("Enter");
  await expect(page.getByTestId("outcome")).toHaveText("Delete — cancelled");
});

test("answers no when the question is escaped away", async ({ page }) => {
  await page.getByTestId("ask-danger").click();
  await expect(page.getByRole("dialog")).toBeVisible();

  await page.keyboard.press("Escape");

  await expect(page.getByTestId("outcome")).toHaveText("Delete — cancelled");
  await expect(page.getByRole("dialog")).toBeHidden();
});

test("answers no when the backdrop is clicked", async ({ page }) => {
  await page.getByTestId("ask-plain").click();
  await expect(page.getByRole("dialog")).toBeVisible();

  // The top left corner of the dialog is backdrop: the box is centred inside it.
  await page.getByRole("dialog").click({ position: { x: 4, y: 4 } });

  await expect(page.getByTestId("outcome")).toHaveText("Archive — cancelled");
});

test("holds the challenge gate shut until the exact string is typed", async ({ page }) => {
  await page.getByTestId("ask-challenge").click();
  await expect(page.getByRole("dialog", { name: "Delete the group?" })).toBeVisible();

  // Focus opens in the input, so the destructive button is two deliberate moves away.
  await expect(page.getByTestId("confirm-challenge")).toBeFocused();
  await expect(page.getByTestId("confirm-accept")).toBeDisabled();

  await page.getByTestId("confirm-challenge").fill("thursday regulars");
  await expect(page.getByTestId("confirm-accept")).toBeDisabled();

  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();

  await page.getByTestId("confirm-challenge").fill("Thursday Regulars");
  await expect(page.getByTestId("confirm-accept")).toBeEnabled();

  await page.keyboard.press("Enter");
  await expect(page.getByTestId("outcome")).toHaveText("Delete group — confirmed");
});

test("queues a second question behind the first", async ({ page }) => {
  await page.getByTestId("ask-twice").click();

  await expect(page.getByRole("dialog", { name: "First question" })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(1);

  await page.getByTestId("confirm-accept").click();

  await expect(page.getByRole("dialog", { name: "Second question" })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(1);

  await page.getByTestId("confirm-cancel").click();

  await expect(page.getByTestId("outcome")).toHaveText("Queued — confirmed, then cancelled");
});

test("renders a host whose labels are all translated", async ({ page }) => {
  await page.getByTestId("ask-localized").click();
  await expect(page.getByRole("dialog", { name: "Supprimer la photo ?" })).toBeVisible();

  await expect(page.getByTestId("confirm-accept")).toHaveText("Supprimer");
  await expect(page.getByTestId("confirm-cancel")).toHaveText("Annuler");
  await expect(page.getByRole("button", { name: "Fermer" })).toBeVisible();
  await expect(page.getByLabel("Saisissez photo-2024 pour confirmer")).toBeVisible();

  await page.getByTestId("confirm-challenge").fill("photo-2024");
  await page.getByTestId("confirm-accept").click();

  await expect(page.getByTestId("outcome")).toHaveText("Localized — confirmed");
});
