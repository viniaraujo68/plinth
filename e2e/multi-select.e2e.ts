import { expect, test } from "@playwright/test";

test("checks rows without closing the list and shows them as chips", async ({ page }) => {
  await page.goto("/components/multi-select");

  const field = page.getByRole("combobox", { name: "Members" });
  await field.click();

  const search = page.getByRole("combobox", { name: "Search…" });
  await expect(search).toBeFocused();
  await search.fill("lamport hamilton");
  await expect(page.getByRole("option")).toHaveCount(0);

  await search.fill("hamilton");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("option", { name: /Margaret Hamilton/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );

  await page.keyboard.press("Escape");
  await expect(field).toBeFocused();
  await expect(page.getByTestId("members-value")).toHaveText("grace, ada, margaret");

  await page.keyboard.press("Backspace");
  await expect(page.getByTestId("members-value")).toHaveText("grace, ada");
});

test("submits every pick and keeps a locked one", async ({ page }) => {
  await page.goto("/components/multi-select");

  await expect(page.getByRole("button", { name: "Remove Email (always on)" })).toHaveCount(0);
  await page.getByRole("button", { name: "Remove Push notification" }).click();
  await page.getByRole("button", { name: "Save" }).click();

  await expect(page.getByTestId("channels-submitted")).toHaveText("email");
});

test("a chip's remove button takes a tap that lands just beside its cross", async ({ page }) => {
  await page.goto("/components/multi-select");

  const remove = page.getByRole("button", { name: "Remove Ada Lovelace" });
  const box = await remove.boundingBox();
  if (!box) throw new Error("remove button is not laid out");
  await page.mouse.click(box.x + box.width / 2, box.y - 4);

  await expect(page.getByTestId("members-value")).toHaveText("grace");
  await expect(page.getByRole("listbox")).toHaveCount(0);
});
