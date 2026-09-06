import { expect, it } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-svelte";
import { overrideAnchorPositioningSupport } from "../anchoring.js";
import Harness from "./TooltipHarness.spec.svelte";

const trigger = () => page.getByRole("button", { name: "Archive" });

// The panel is queried through the DOM rather than through a locator because half of these
// assertions are about it not existing yet -- a locator matcher on a missing element fails
// outright instead of reporting "not visible". `:popover-open` is the honest reading of shown or
// hidden: a closed popover keeps its box in the tree, it just stops rendering.
const panelElement = () => document.querySelector<HTMLElement>('[role="tooltip"]');
const isOpen = () => panelElement()?.matches(":popover-open") ?? false;

it("shows the panel while the pointer is over the host", async () => {
  render(Harness);

  expect(isOpen()).toBe(false);

  await trigger().hover();
  await expect.poll(isOpen).toBe(true);
  expect(panelElement()?.textContent).toBe("Archives the release");

  await trigger().unhover();
  await expect.poll(isOpen).toBe(false);
});

it("shows the panel on focus and closes it on Escape", async () => {
  render(Harness);

  trigger()
    .element()
    .dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
  await expect.poll(isOpen).toBe(true);

  // Escape is the only exit a keyboard user has: a manual popover gets no light dismiss, and the
  // pointer never reaches the panel, so nothing else would ever hide it.
  trigger()
    .element()
    .dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  await expect.poll(isOpen).toBe(false);
});

it("points the host at the panel with aria-describedby", async () => {
  render(Harness);

  const host = trigger().element();
  expect(host.getAttribute("aria-describedby")).toBeNull();

  await trigger().hover();
  await expect.poll(isOpen).toBe(true);

  const describedBy = host.getAttribute("aria-describedby");
  expect(describedBy).toMatch(/^plinth-tooltip-\d+$/);
  expect(panelElement()?.id).toBe(describedBy);
});

it("suppresses the panel while disabled, and restores it when the flag flips", async () => {
  const screen = render(Harness, { disabled: true });

  await trigger().hover();
  await expect.poll(isOpen).toBe(false);

  await screen.rerender({ disabled: false });
  await trigger().unhover();
  await trigger().hover();
  await expect.poll(isOpen).toBe(true);
});

it("leaves nothing behind when the host is destroyed", async () => {
  const screen = render(Harness);

  await trigger().hover();
  await expect.poll(isOpen).toBe(true);

  await screen.unmount();

  // The string variant's panel lives on `document.body`, outside the render container, so the
  // attachment's own teardown is the only thing that can take it out of the document.
  expect(panelElement()).toBeNull();
});

it("takes the anchor styling off the host on teardown", async () => {
  const screen = render(Harness);
  const host = trigger().element() as HTMLElement;

  await trigger().hover();
  await expect.poll(isOpen).toBe(true);
  expect(host.style.getPropertyValue("anchor-name")).toMatch(/^--plinth-tooltip-\d+$/);

  await screen.unmount();

  expect(host.style.getPropertyValue("anchor-name")).toBe("");
  expect(host.getAttribute("aria-describedby")).toBeNull();
});

it("centres the panel over the host where the browser has no anchor positioning", async () => {
  /* Firefox, and Safari before 26, drop the `position-area` the panel is placed with and leave the
     UA popover rules -- which, with the panel's own margin overriding their `margin: auto`, pin it
     to the top corner of the screen. */
  overrideAnchorPositioningSupport(false);

  try {
    render(Harness, { style: "position: fixed; top: 300px; left: 180px" });
    await trigger().hover();
    await expect.poll(isOpen).toBe(true);

    const host = trigger().element().getBoundingClientRect();
    const box = () => panelElement()!.getBoundingClientRect();

    // Above the host, unlike every other panel in the library: a tooltip under the pointer is a
    // tooltip the pointer is about to cover.
    await expect.poll(() => Math.round(box().bottom)).toBe(Math.round(host.top) - 6);
    expect(Math.round(box().left + box().width / 2)).toBe(Math.round(host.left + host.width / 2));
  } finally {
    overrideAnchorPositioningSupport(undefined);
  }
});

it("flips the panel below the host when there is no room above it", async () => {
  overrideAnchorPositioningSupport(false);

  try {
    render(Harness, { style: "position: fixed; top: 0; left: 180px" });
    await trigger().hover();
    await expect.poll(isOpen).toBe(true);

    const host = trigger().element().getBoundingClientRect();
    const box = () => panelElement()!.getBoundingClientRect();

    // `position-try-fallbacks: flip-block`, done by hand.
    await expect.poll(() => Math.round(box().top)).toBe(Math.round(host.bottom) + 6);
  } finally {
    overrideAnchorPositioningSupport(undefined);
  }
});
