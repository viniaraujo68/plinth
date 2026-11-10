import { expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-svelte";
import ErrorDisplay from "./ErrorDisplay.svelte";

it("offers recovery only when the boundary gave it a reset", async () => {
  const reset = vi.fn();
  render(ErrorDisplay, { reset });

  await page.getByRole("button", { name: "Try again" }).click();

  expect(reset).toHaveBeenCalledTimes(1);
});

it("renders without a retry button when nothing can be reset", async () => {
  render(ErrorDisplay, {});

  await expect.element(page.getByRole("alert")).toBeVisible();
  expect(page.getByRole("button", { name: "Try again" }).elements()).toHaveLength(0);
});

it("takes the wording the app wants", async () => {
  render(ErrorDisplay, { title: "Report unavailable", message: "The export service is offline." });

  await expect.element(page.getByRole("alert")).toHaveTextContent("Report unavailable");
  await expect.element(page.getByRole("alert")).toHaveTextContent("The export service is offline.");
});

it("takes the eyebrow and the retry label the app wants", async () => {
  render(ErrorDisplay, { reset: vi.fn(), eyebrow: "Erro", retryLabel: "Tentar novamente" });

  await expect.element(page.getByRole("alert")).toHaveTextContent("Erro");
  await expect.element(page.getByRole("button", { name: "Tentar novamente" })).toBeVisible();
});

it("drops the eyebrow when given an empty one", async () => {
  render(ErrorDisplay, { eyebrow: "" });

  await expect.element(page.getByRole("alert")).toBeVisible();
  expect(document.querySelector('[role="alert"] .uppercase')).toBeNull();
});
