import { expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-svelte";
import { overrideAnchorPositioningSupport } from "../anchoring.js";
import Harness from "./DropdownHarness.spec.svelte";

const trigger = () => page.getByRole("button", { name: "Actions" });
const remoteOpener = () => page.getByRole("button", { name: "Open from outside" });

const panelElement = () => document.querySelector<HTMLElement>(".panel");
const isOpen = () => panelElement()?.matches(":popover-open") ?? false;
const isMounted = () => panelElement()?.textContent?.includes("Done") ?? false;

it("does not mount the content until the panel is first opened", () => {
  render(Harness);

  expect(isOpen()).toBe(false);
  expect(isMounted()).toBe(false);
});

it("opens on the trigger and closes on the trigger again", async () => {
  render(Harness);

  await trigger().click();
  await expect.poll(isOpen).toBe(true);
  await expect.element(trigger()).toHaveAttribute("aria-expanded", "true");
  expect(isMounted()).toBe(true);

  // Re-clicking the trigger is the native popover's own toggle -- this asserts we did not break
  // it by adding a competing click handler.
  await trigger().click();
  await expect.poll(isOpen).toBe(false);
  await expect.element(trigger()).toHaveAttribute("aria-expanded", "false");
});

it("unmounts the content once the panel is hidden", async () => {
  render(Harness);

  await trigger().click();
  await expect.poll(isMounted).toBe(true);

  await trigger().click();
  await expect.poll(isMounted).toBe(false);
});

it("closes on Escape", async () => {
  render(Harness);

  await trigger().click();
  await expect.poll(isOpen).toBe(true);

  await userEvent.keyboard("{Escape}");
  await expect.poll(isOpen).toBe(false);
});

it("closes from inside the panel through the exposed handle", async () => {
  render(Harness);

  await trigger().click();
  await expect.poll(isOpen).toBe(true);

  await page.getByRole("button", { name: "Done" }).click();
  await expect.poll(isOpen).toBe(false);
});

it("stays hidden when panelClass carries a display of its own", async () => {
  // Standing in for daisyUI's `menu`, which is exactly the class a caller reaches for here: an
  // author `display` beats the UA rule that hides a closed popover, so without the component's own
  // guard the panel would keep rendering after it closed.
  const style = document.createElement("style");
  style.textContent = ".menu { display: flex; }";
  document.head.appendChild(style);

  try {
    render(Harness, { panelClass: "panel menu" });

    await trigger().click();
    await expect.poll(isOpen).toBe(true);
    await expect.element(page.getByRole("button", { name: "Done" })).toBeVisible();

    await trigger().click();
    await expect.poll(isOpen).toBe(false);
    expect(panelElement()!.checkVisibility()).toBe(false);
  } finally {
    style.remove();
  }
});

it("opens from outside with content already mounted", async () => {
  render(Harness);

  await remoteOpener().click();

  // The point of mounting before showing: the panel is never painted empty, so the content is
  // there in the same turn the popover becomes open.
  await expect.poll(isOpen).toBe(true);
  expect(isMounted()).toBe(true);
});

it("reports whether the panel is open through a bindable expanded", async () => {
  let expanded = false;
  render(Harness, {
    get expanded() {
      return expanded;
    },
    set expanded(next: boolean) {
      expanded = next;
    },
  });

  await trigger().click();
  await expect.poll(() => expanded).toBe(true);

  await userEvent.keyboard("{Escape}");
  await expect.poll(() => expanded).toBe(false);
});

it("mounts the content and focuses its autofocus element when the keyboard opens it", async () => {
  render(Harness, { withField: true });

  (trigger().element() as HTMLElement).focus();
  await userEvent.keyboard("{Enter}");

  await expect.poll(isOpen).toBe(true);
  await expect.element(page.getByRole("textbox", { name: "Filter" })).toHaveFocus();
});

it("hands the focus back to its trigger when it closes with the focus inside", async () => {
  render(Harness, { withField: true });

  await remoteOpener().click();
  await expect.element(page.getByRole("textbox", { name: "Filter" })).toHaveFocus();

  await userEvent.keyboard("{Escape}");
  await expect.poll(isOpen).toBe(false);
  await expect.element(trigger()).toHaveFocus();
});

it("moves the focus back into an open panel when asked to open again", async () => {
  const screen = render(Harness, { withField: true });

  screen.component.openMenu();
  const field = page.getByRole("textbox", { name: "Filter" });
  await expect.element(field).toHaveFocus();

  (trigger().element() as HTMLElement).focus();
  screen.component.openMenu();

  expect(isOpen()).toBe(true);
  await expect.element(field).toHaveFocus();
});

it("hangs the panel under the trigger where the browser has no anchor positioning", async () => {
  /* Firefox, and Safari before 26, drop the `position-area` this panel is placed with and leave
     the UA popover rules -- `position: fixed; inset: 0; margin: auto` -- which float the panel in
     the middle of the screen with no relation to the trigger at all. */
  overrideAnchorPositioningSupport(false);

  try {
    render(Harness);
    await trigger().click();
    await expect.poll(isOpen).toBe(true);

    const button = trigger().element().getBoundingClientRect();
    const box = () => panelElement()!.getBoundingClientRect();

    await expect.poll(() => Math.round(box().top)).toBe(Math.round(button.bottom));
    // `position-area: bottom` centres the panel on its anchor, which is what a menu wider than
    // its trigger needs.
    expect(Math.round(box().left + box().width / 2)).toBe(
      Math.round(button.left + button.width / 2),
    );
  } finally {
    overrideAnchorPositioningSupport(undefined);
  }
});

const EDGE = 8;

const assertKeepsOffTheEdge = async () => {
  render(Harness, { atEdge: true });
  await trigger().click();
  await expect.poll(isOpen).toBe(true);

  const box = () => panelElement()!.getBoundingClientRect();
  await expect.poll(() => Math.round(window.innerWidth - box().right)).toBeGreaterThanOrEqual(EDGE);
  expect(Math.round(box().left)).toBeGreaterThanOrEqual(EDGE);
};

// A menu opened from a trigger at the end of a toolbar is wider than the room beside it, and the
// browser shifts it back onto the screen. Without an inline margin it lands flush against the edge.
it("keeps a panel off the side of the screen when it has to be pulled back onto it", async () => {
  await assertKeepsOffTheEdge();
});

it("keeps the same distance from the edge where the panel is placed by script", async () => {
  overrideAnchorPositioningSupport(false);
  try {
    await assertKeepsOffTheEdge();
  } finally {
    overrideAnchorPositioningSupport(undefined);
  }
});

const assertMatchesTheTrigger = async () => {
  render(Harness, { matchWidth: true });
  const button = trigger().element() as HTMLElement;
  button.style.width = "18rem";
  button.style.margin = "4rem";

  await trigger().click();
  await expect.poll(isOpen).toBe(true);

  const anchor = button.getBoundingClientRect();
  const box = () => panelElement()!.getBoundingClientRect();
  await expect.poll(() => Math.round(box().width)).toBe(Math.round(anchor.width));
  expect(Math.round(box().left)).toBe(Math.round(anchor.left));
  expect(Math.round(box().top)).toBe(Math.round(anchor.bottom) + 4);
};

it("hangs a field's panel under the trigger at the trigger's width", async () => {
  await assertMatchesTheTrigger();
});

it("matches the trigger's width where the panel is placed by script", async () => {
  overrideAnchorPositioningSupport(false);
  try {
    await assertMatchesTheTrigger();
  } finally {
    overrideAnchorPositioningSupport(undefined);
  }
});
