import { expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-svelte";
import Harness from "./TabsHarness.spec.svelte";

const tab = (name: string) => page.getByRole("tab", { name });

it("names the list and marks only the selected tab", async () => {
  render(Harness);

  await expect.element(page.getByRole("tablist", { name: "Sections" })).toBeVisible();
  await expect.element(tab("Ranking")).toHaveAttribute("aria-selected", "true");
  await expect.element(tab("Players")).toHaveAttribute("aria-selected", "false");
});

it("puts only the selected tab in the tab order", async () => {
  render(Harness);

  await expect.element(tab("Ranking")).toHaveAttribute("tabindex", "0");
  await expect.element(tab("Matchdays")).toHaveAttribute("tabindex", "-1");
});

it("ties each tab to the panel, and the panel back to the selected tab", async () => {
  render(Harness);

  await expect.element(tab("Ranking")).toHaveAttribute("aria-controls", "panel");
  await expect.element(tab("Ranking")).toHaveAttribute("id", "tab-ranking");
  await expect.element(page.getByRole("tabpanel", { name: "Ranking" })).toBeVisible();
});

it("selects a tab on click and reports it once", async () => {
  const onchange = vi.fn();
  render(Harness, { onchange });

  await tab("Players").click();

  expect(onchange).toHaveBeenCalledExactlyOnceWith("players");
  await expect.element(page.getByText("Showing players")).toBeVisible();
});

it("stays silent when the selected tab is clicked again", async () => {
  const onchange = vi.fn();
  render(Harness, { onchange });

  await tab("Ranking").click();

  expect(onchange).not.toHaveBeenCalled();
});

it("moves the selection and the focus with the arrow keys, wrapping at the ends", async () => {
  render(Harness);

  await tab("Ranking").click();
  await userEvent.keyboard("{ArrowRight}");
  await expect.element(tab("Players")).toHaveAttribute("aria-selected", "true");
  await expect.element(tab("Players")).toHaveFocus();

  await userEvent.keyboard("{ArrowRight}{ArrowRight}");
  await expect.element(tab("Matchdays")).toHaveAttribute("aria-selected", "true");

  await userEvent.keyboard("{ArrowLeft}");
  await expect.element(tab("Group stats")).toHaveAttribute("aria-selected", "true");
  await expect.element(tab("Group stats")).toHaveFocus();
});

it("jumps to the first and the last tab with Home and End", async () => {
  render(Harness);

  await tab("Ranking").click();
  await userEvent.keyboard("{End}");
  await expect.element(tab("Group stats")).toHaveAttribute("aria-selected", "true");

  await userEvent.keyboard("{Home}");
  await expect.element(tab("Matchdays")).toHaveAttribute("aria-selected", "true");
  await expect.element(tab("Matchdays")).toHaveFocus();
});

it("scrolls sideways instead of wrapping, and fades the edge while tabs are hidden past it", async () => {
  render(Harness, { width: "9rem" });

  const strip = page.getByRole("tablist").element() as HTMLElement;
  expect(strip.scrollWidth).toBeGreaterThan(strip.clientWidth);
  // One row, however narrow: every tab sits on the same line.
  const tops = new Set(
    [...strip.querySelectorAll("[role=tab]")].map((node) => node.getBoundingClientRect().top),
  );
  expect(tops.size).toBe(1);
  await expect.poll(() => strip.parentElement?.classList.contains("fade")).toBe(true);
});

it("drops the fade once the row fits", async () => {
  render(Harness, { width: "60rem" });

  const strip = page.getByRole("tablist").element() as HTMLElement;
  await expect.poll(() => strip.parentElement?.classList.contains("fade")).toBe(false);
});
