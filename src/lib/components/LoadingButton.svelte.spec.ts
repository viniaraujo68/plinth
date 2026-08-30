import { createRawSnippet } from "svelte";
import { expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-svelte";
import LoadingButton from "./LoadingButton.svelte";

const label = createRawSnippet(() => ({ render: () => "<span>Save</span>" }));

it("keeps the label visible while loading", async () => {
  render(LoadingButton, { children: label, loading: true });

  const button = page.getByRole("button", { name: "Save" });
  await expect.element(button).toBeVisible();
  await expect.element(button).toHaveAttribute("aria-busy", "true");
});

it("refuses clicks while loading", async () => {
  const onclick = vi.fn();
  render(LoadingButton, { children: label, loading: true, onclick });

  const button = page.getByRole("button", { name: "Save" });
  await expect.element(button).toBeDisabled();
  expect(onclick).not.toHaveBeenCalled();
});

it("stays clickable when idle", async () => {
  const onclick = vi.fn();
  render(LoadingButton, { children: label, onclick });

  const button = page.getByRole("button", { name: "Save" });
  await expect.element(button).toBeEnabled();

  await button.click();
  expect(onclick).toHaveBeenCalledTimes(1);
});

// The HTML default would be "submit", which turns any button dropped into a form into a second
// way to submit it.
it("is an inert button unless the app asks for a submit", async () => {
  render(LoadingButton, { children: label });
  await expect
    .element(page.getByRole("button", { name: "Save" }))
    .toHaveAttribute("type", "button");

  render(LoadingButton, { children: label, type: "submit" });
  await expect
    .element(page.getByRole("button", { name: "Save" }).nth(1))
    .toHaveAttribute("type", "submit");
});

// `disabled` is a separate concern from `loading`; a form that disables its submit for an unrelated
// reason must not be re-enabled by the button not happening to be busy.
it("honours an explicit disabled on top of the loading state", async () => {
  render(LoadingButton, { children: label, loading: false, disabled: true });

  await expect.element(page.getByRole("button", { name: "Save" })).toBeDisabled();
});
