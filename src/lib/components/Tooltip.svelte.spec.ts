import { expect, it } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-svelte";
import Harness from "./TooltipHarness.spec.svelte";

const host = () => page.getByText("Publish", { exact: true });

const panelElement = () => document.querySelector<HTMLElement>('[role="tooltip"]');
const isOpen = () => panelElement()?.matches(":popover-open") ?? false;

it("renders the requested tag as its own root", async () => {
  render(Harness, { host: "button" });

  await expect.element(page.getByRole("button", { name: "Publish" })).toBeInTheDocument();
});

it("shows the snippet's markup, not a flattened string", async () => {
  render(Harness, { host: "button" });

  await host().hover();
  await expect.poll(isOpen).toBe(true);
  expect(panelElement()?.querySelector("strong")?.textContent).toBe("everyone");
});

it("makes a non-interactive host focusable so the tooltip survives keyboard use", async () => {
  render(Harness);

  const span = host().element() as HTMLElement;
  expect(span.tagName).toBe("SPAN");
  expect(span.tabIndex).toBe(0);

  span.focus();
  await expect.poll(isOpen).toBe(true);

  span.blur();
  await expect.poll(isOpen).toBe(false);
});

it("keeps the panel closed while tooltipDisabled is set", async () => {
  render(Harness, { host: "button", disabled: true });

  await host().hover();
  await expect.poll(isOpen).toBe(false);
});

it("wraps its text even when the host sits inside a nowrap ancestor", async () => {
  const screen = render(Harness, { host: "button" });
  (screen.container as HTMLElement).style.whiteSpace = "nowrap";

  await host().hover();
  await expect.poll(isOpen).toBe(true);
  expect(getComputedStyle(panelElement()!).whiteSpace).toBe("normal");
});
