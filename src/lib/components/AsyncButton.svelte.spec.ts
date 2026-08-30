import { createRawSnippet } from "svelte";
import { afterEach, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-svelte";
import AsyncButton from "./AsyncButton.svelte";
import { setErrorReporter } from "../error.js";

const label = createRawSnippet(() => ({ render: () => "<span>Publish</span>" }));

const deferred = () => {
  let resolve!: () => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

afterEach(() => {
  setErrorReporter(null);
});

it("stays busy for exactly as long as the handler's promise", async () => {
  const gate = deferred();
  render(AsyncButton, { children: label, onclick: () => gate.promise });

  const button = page.getByRole("button", { name: "Publish" });
  await button.click();
  await expect.element(button).toBeDisabled();

  gate.resolve();
  await expect.element(button).toBeEnabled();
});

it("cannot start a second run while the first is in flight", async () => {
  const gate = deferred();
  const onclick = vi.fn(() => gate.promise);
  render(AsyncButton, { children: label, onclick });

  const button = page.getByRole("button", { name: "Publish" });
  await button.click();
  await expect.element(button).toBeDisabled();

  gate.resolve();
  await expect.element(button).toBeEnabled();
  expect(onclick).toHaveBeenCalledTimes(1);
});

it("hands a rejection to onerror and recovers", async () => {
  const failure = new Error("upstream is down");
  const onerror = vi.fn();
  render(AsyncButton, { children: label, onclick: () => Promise.reject(failure), onerror });

  const button = page.getByRole("button", { name: "Publish" });
  await button.click();

  await vi.waitFor(() => {
    expect(onerror).toHaveBeenCalledWith(failure);
  });
  await expect.element(button).toBeEnabled();
});

// Nothing may swallow a failure silently: with no onerror, the error still has to reach the
// library's single reporting channel.
it("falls back to the error reporter when no onerror is given", async () => {
  const failure = new Error("upstream is down");
  const reporter = vi.fn();
  setErrorReporter(reporter);
  render(AsyncButton, { children: label, onclick: () => Promise.reject(failure) });

  await page.getByRole("button", { name: "Publish" }).click();

  await vi.waitFor(() => {
    expect(reporter).toHaveBeenCalledWith(failure);
  });
});

it("works with a synchronous handler", async () => {
  const onclick = vi.fn();
  render(AsyncButton, { children: label, onclick });

  const button = page.getByRole("button", { name: "Publish" });
  await button.click();

  expect(onclick).toHaveBeenCalledTimes(1);
  await expect.element(button).toBeEnabled();
});
