import { expect, test } from "@playwright/test";

const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

test("anchors a preset on load and rebuilds the window on the one clicked", async ({ page }) => {
  await page.goto("/components/date-range-picker");
  const demo = page.getByTestId("live-demo");

  await expect(page.getByTestId("emitted-span")).toHaveText("60 min");
  await expect(page.getByTestId("emitted-from")).toHaveText(ISO_UTC);

  await demo.getByRole("button", { name: "7d", exact: true }).click();

  await expect(page.getByTestId("emitted-span")).toHaveText("10080 min");
  await expect(demo.getByRole("button", { name: "7d", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

// The demo re-anchors every 5s, which is the only reason this is watchable inside a test.
test("keeps a relative range sliding, and freezes once the range is custom", async ({ page }) => {
  await page.goto("/components/date-range-picker");
  const demo = page.getByTestId("live-demo");
  const emitCount = page.getByTestId("emit-count");

  await expect(emitCount).toHaveText("1");
  await expect(emitCount).toHaveText("2", { timeout: 15_000 });

  await demo.getByRole("button", { name: "Custom" }).click();
  const frozen = await page.getByTestId("emitted-to").innerText();

  await page.waitForTimeout(7_000);
  await expect(page.getByTestId("emitted-to")).toHaveText(frozen);
});

test("reads the custom fields as local time and emits UTC", async ({ page }) => {
  await page.goto("/components/date-range-picker");
  const demo = page.getByTestId("live-demo");

  await demo.getByRole("button", { name: "Custom" }).click();
  await demo.getByLabel("From").fill("2026-01-02T03:04");
  await demo.getByLabel("To").fill("2026-01-02T04:05");

  await expect(page.getByTestId("emitted-span")).toHaveText("61 min");
  await expect(page.getByTestId("emitted-local")).toHaveText("2026-01-02T03:04 → 2026-01-02T04:05");
  await expect(page.getByTestId("emitted-from")).toHaveText(ISO_UTC);
});

test("refuses to emit a reversed pair, and says why", async ({ page }) => {
  await page.goto("/components/date-range-picker");
  const demo = page.getByTestId("quiet-demo");

  await expect(page.getByTestId("quiet-to")).toHaveText("2026-01-31T23:59:00.000Z");

  await demo.getByLabel("From").fill("2026-02-10T08:00");

  await expect(demo.getByRole("alert")).toBeVisible();
  await expect(demo.getByLabel("From")).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByTestId("quiet-to")).toHaveText("2026-01-31T23:59:00.000Z");
});

test("seeds the custom fields from the range it was given", async ({ page }) => {
  await page.goto("/components/date-range-picker");
  const demo = page.getByTestId("quiet-demo");

  // The seeded value is UTC; the fields show the same instants in the browser's own zone, so the
  // expectation is computed the same way the component does rather than hard-coded.
  const expected = await page.evaluate(() =>
    ["2026-01-01T00:00:00.000Z", "2026-01-31T23:59:00.000Z"].map((iso) => {
      const local = new Date(iso);
      const pad = (value: number) => String(value).padStart(2, "0");

      return `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}T${pad(local.getHours())}:${pad(local.getMinutes())}`;
    }),
  );

  await expect(demo.getByLabel("From")).toHaveValue(expected[0]);
  await expect(demo.getByLabel("To")).toHaveValue(expected[1]);
});
