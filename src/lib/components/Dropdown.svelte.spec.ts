import { expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-svelte";
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
