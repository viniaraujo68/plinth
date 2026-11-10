import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import { flushSync } from "svelte";
import NavigationProgress from "./NavigationProgress.svelte";

const line = () => document.querySelector(".plinth-navigation-progress");

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

it("stays hidden while nothing is navigating", () => {
  render(NavigationProgress, { active: false });

  vi.advanceTimersByTime(1000);
  flushSync();

  expect(line()).toBeNull();
});

it("shows only once a navigation has outlasted the delay", () => {
  render(NavigationProgress, { active: true, delay: 150 });

  vi.advanceTimersByTime(100);
  flushSync();
  expect(line()).toBeNull();

  vi.advanceTimersByTime(60);
  flushSync();
  expect(line()).not.toBeNull();
  expect(line()?.getAttribute("aria-hidden")).toBe("true");
});

it("never shows for a navigation that ends inside the delay", async () => {
  const { rerender } = render(NavigationProgress, { active: true, delay: 150 });

  vi.advanceTimersByTime(100);
  await rerender({ active: false });
  vi.advanceTimersByTime(500);
  flushSync();

  expect(line()).toBeNull();
});

it("goes away as soon as the navigation ends", async () => {
  const { rerender } = render(NavigationProgress, { active: true, delay: 0 });

  vi.advanceTimersByTime(1);
  flushSync();
  expect(line()).not.toBeNull();

  await rerender({ active: false });
  flushSync();

  expect(line()).toBeNull();
});
