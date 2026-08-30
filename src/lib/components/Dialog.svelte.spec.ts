import { expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-svelte";
import Harness from "./DialogHarness.spec.svelte";

// jsdom has none of what is under test here: no top layer, no `showModal()`, no focus restoration
// and no `checkVisibility()`. Every assertion below is about the browser doing its half.
const element = () => document.querySelector("dialog");

it("keeps the content out of the document until it is shown", async () => {
  render(Harness);

  expect(element()).toBeNull();
  expect(page.getByTestId("content").query()).toBeNull();
  await expect.element(page.getByTestId("opener")).toBeInTheDocument();
});

it("mounts the content and raises a real modal on show()", async () => {
  render(Harness);

  await page.getByTestId("opener").click();

  await expect.element(page.getByTestId("content")).toBeVisible();
  // `:modal` matches only an element the browser is treating as modal, which is what tells apart
  // `showModal()` from a dialog merely carrying the `open` attribute.
  expect(element()?.matches(":modal")).toBe(true);
});

it("closes on Escape and hands focus back to the opener", async () => {
  render(Harness);
  const opener = page.getByTestId("opener");

  await opener.click();
  expect(document.activeElement).not.toBe(opener.element());

  await userEvent.keyboard("{Escape}");

  await expect.poll(() => element()?.open ?? false).toBe(false);
  await expect.poll(() => document.activeElement).toBe(opener.element());
});

it("closes from a control inside the content", async () => {
  render(Harness);

  await page.getByTestId("opener").click();
  await page.getByTestId("inner-close").click();

  await expect.poll(() => element()?.open ?? false).toBe(false);
});

it("unmounts the content once the element is hidden", async () => {
  render(Harness);

  await page.getByTestId("opener").click();
  await expect.element(page.getByTestId("content")).toBeInTheDocument();

  await page.getByTestId("inner-close").click();

  await expect.poll(() => page.getByTestId("content").query()).toBeNull();
  await expect.poll(element).toBeNull();
});

it("mounts a fresh copy of the content on every open", async () => {
  render(Harness);
  const opener = page.getByTestId("opener");

  await opener.click();
  const first = page.getByTestId("content").element();

  await page.getByTestId("inner-close").click();
  await expect.poll(() => page.getByTestId("content").query()).toBeNull();

  await opener.click();
  await expect.element(page.getByTestId("content")).toBeVisible();
  expect(page.getByTestId("content").element()).not.toBe(first);
});
