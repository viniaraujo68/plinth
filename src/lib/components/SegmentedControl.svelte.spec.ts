import { expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-svelte";
import SegmentedControl from "./SegmentedControl.svelte";

const OPTIONS = [
  { id: "total", label: "Total" },
  { id: "match", label: "Per match" },
  { id: "day", label: "Per day", disabled: true },
];

it("names the group and marks the chosen option as pressed", async () => {
  render(SegmentedControl<string>, { options: OPTIONS, value: "total", label: "Unit" });

  await expect.element(page.getByRole("group", { name: "Unit" })).toBeVisible();
  await expect
    .element(page.getByRole("button", { name: "Total" }))
    .toHaveAttribute("aria-pressed", "true");
  await expect
    .element(page.getByRole("button", { name: "Per match" }))
    .toHaveAttribute("aria-pressed", "false");
});

it("moves the choice and reports it once", async () => {
  const onchange = vi.fn();
  render(SegmentedControl<string>, { options: OPTIONS, value: "total", label: "Unit", onchange });

  await page.getByRole("button", { name: "Per match" }).click();

  expect(onchange).toHaveBeenCalledExactlyOnceWith("match");
  await expect
    .element(page.getByRole("button", { name: "Per match" }))
    .toHaveAttribute("aria-pressed", "true");
});

it("stays silent when the current option is pressed again", async () => {
  const onchange = vi.fn();
  render(SegmentedControl<string>, { options: OPTIONS, value: "total", label: "Unit", onchange });

  await page.getByRole("button", { name: "Total" }).click();

  expect(onchange).not.toHaveBeenCalled();
});

it("shows a disabled option without letting it be picked", async () => {
  render(SegmentedControl<string>, { options: OPTIONS, value: "total", label: "Unit" });

  await expect.element(page.getByRole("button", { name: "Per day" })).toBeDisabled();
});

it("renders the caption as text, outside the group's name", async () => {
  render(SegmentedControl<string>, {
    options: OPTIONS,
    value: "total",
    label: "Unit",
    caption: "Goals:",
  });

  await expect.element(page.getByText("Goals:")).toBeVisible();
  await expect.element(page.getByRole("group", { name: "Unit" })).toBeVisible();
});
