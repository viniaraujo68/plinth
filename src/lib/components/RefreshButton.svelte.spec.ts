import { expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-svelte";
import RefreshButton from "./RefreshButton.svelte";

it("runs the refresh on demand", async () => {
  const onRefresh = vi.fn();
  render(RefreshButton, { onRefresh });

  await page.getByRole("button", { name: "Refresh now" }).click();

  expect(onRefresh).toHaveBeenCalledTimes(1);
});

it("shows the timestamp of the last landing", async () => {
  render(RefreshButton, {
    onRefresh: () => undefined,
    lastSuccessAt: Date.UTC(2024, 0, 2, 15, 4, 5),
    locale: "en-GB",
  });

  await expect
    .element(page.getByTestId("refresh-clock"))
    .toHaveTextContent(new Date(Date.UTC(2024, 0, 2, 15, 4, 5)).toLocaleTimeString("en-GB"));
});

it("has no timestamp to show before the first landing", async () => {
  render(RefreshButton, { onRefresh: () => undefined });

  await expect.element(page.getByTestId("refresh-clock")).toHaveTextContent("--:--:--");
});

// Arming the schedule swaps the timestamp for the countdown, so the strip never shows a stale
// "last updated" next to a live counter.
it("arms and disarms the schedule from the toggle", async () => {
  render(RefreshButton, { onRefresh: () => undefined, defaultInterval: 30 });

  const toggle = page.getByRole("button", { name: "Start auto-refresh" });
  await toggle.click();

  const armed = page.getByRole("button", { name: "Pause auto-refresh" });
  await expect.element(armed).toHaveAttribute("aria-pressed", "true");
  await expect.element(page.getByRole("combobox", { name: "Auto-refresh interval" })).toBeVisible();
  await expect.element(page.getByTestId("refresh-clock")).toHaveTextContent("30s");

  await armed.click();
  await expect.element(page.getByTestId("refresh-clock")).toHaveTextContent("--:--:--");
});

it("restarts the countdown when the period changes", async () => {
  render(RefreshButton, { onRefresh: () => undefined, defaultInterval: 30 });

  await page.getByRole("button", { name: "Start auto-refresh" }).click();
  await page.getByRole("combobox", { name: "Auto-refresh interval" }).selectOptions("5m");

  await expect.element(page.getByTestId("refresh-clock")).toHaveTextContent("300s");
});
