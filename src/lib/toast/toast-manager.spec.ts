import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createToastManager } from "./toast-manager.svelte.js";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

const messages = (manager: ReturnType<typeof createToastManager>) =>
  manager.toasts.map((toast) => toast.message);

it("queues toasts oldest first and hands back an id for each", () => {
  const manager = createToastManager();

  const first = manager.info("first");
  const second = manager.success("second");

  expect(first).not.toBe(second);
  expect(messages(manager)).toEqual(["first", "second"]);
});

it("tags each toast with the variant of the method that created it", () => {
  const manager = createToastManager();

  manager.info("i");
  manager.success("s");
  manager.warning("w");
  manager.error("e");

  expect(manager.toasts.map((toast) => toast.variant)).toEqual([
    "info",
    "success",
    "warning",
    "error",
  ]);
});

it("auto-dismisses on the variant's default duration", () => {
  const manager = createToastManager();

  manager.success("saved");
  vi.advanceTimersByTime(2999);
  expect(manager.toasts).toHaveLength(1);

  vi.advanceTimersByTime(1);
  expect(manager.toasts).toHaveLength(0);
});

it("keeps errors on screen longer than successes", () => {
  const manager = createToastManager();

  manager.success("saved");
  manager.error("failed");
  vi.advanceTimersByTime(3000);

  expect(messages(manager)).toEqual(["failed"]);
});

it("takes per-variant durations from the constructor", () => {
  const manager = createToastManager({ durations: { info: 100 } });

  manager.info("quick");
  vi.advanceTimersByTime(100);

  expect(manager.toasts).toHaveLength(0);
});

it("lets a single call override the duration", () => {
  const manager = createToastManager();

  manager.success("saved", { duration: 10_000 });
  vi.advanceTimersByTime(9999);

  expect(manager.toasts).toHaveLength(1);
});

it("never auto-dismisses a toast with an infinite duration", () => {
  const manager = createToastManager();

  manager.info("uploading", { duration: Number.POSITIVE_INFINITY });
  vi.advanceTimersByTime(10 * 60 * 1000);

  expect(manager.toasts).toHaveLength(1);
});

it("treats a non-positive duration as sticky rather than as instant", () => {
  const manager = createToastManager();

  manager.info("pinned", { duration: 0 });
  vi.advanceTimersByTime(60_000);

  expect(manager.toasts).toHaveLength(1);
});

it("dismisses by id and ignores an id it no longer holds", () => {
  const manager = createToastManager();
  const id = manager.info("first");
  manager.info("second");

  manager.dismiss(id);
  manager.dismiss(id);

  expect(messages(manager)).toEqual(["second"]);
});

it("clears the queue and cancels the pending timers", () => {
  const manager = createToastManager();
  manager.info("first");
  manager.error("second");

  manager.clear();
  expect(manager.toasts).toHaveLength(0);

  // A timer that outlived `clear` would fire into an empty queue; the assertion is that nothing
  // throws and nothing reappears.
  vi.advanceTimersByTime(60_000);
  expect(manager.toasts).toHaveLength(0);
});

it("drops the oldest toast once the stack is full", () => {
  const manager = createToastManager({ limit: 2 });

  manager.info("first");
  manager.info("second");
  manager.info("third");

  expect(messages(manager)).toEqual(["second", "third"]);
});

it("cancels the timer of a toast the limit pushed out", () => {
  const manager = createToastManager({ limit: 1 });

  manager.info("first", { duration: 1000 });
  manager.info("second", { duration: 5000 });
  vi.advanceTimersByTime(1000);

  expect(messages(manager)).toEqual(["second"]);
});

it("replaces a toast in place when the id is reused", () => {
  const manager = createToastManager();

  const id = manager.info("publishing", { duration: Number.POSITIVE_INFINITY });
  manager.error("nope");
  manager.success("published", { id });

  expect(messages(manager)).toEqual(["published", "nope"]);
  expect(manager.toasts[0].variant).toBe("success");
});

it("keeps the original creation time across a replacement", () => {
  const manager = createToastManager();

  const id = manager.info("publishing", { duration: Number.POSITIVE_INFINITY });
  const createdAt = manager.toasts[0].createdAt;

  vi.advanceTimersByTime(1000);
  manager.success("published", { id });

  expect(manager.toasts[0].createdAt).toBe(createdAt);
});

it("restarts the countdown when a toast is replaced", () => {
  const manager = createToastManager();

  const id = manager.info("publishing", { duration: 1000 });
  vi.advanceTimersByTime(900);
  manager.info("still publishing", { id, duration: 1000 });

  vi.advanceTimersByTime(900);
  expect(manager.toasts).toHaveLength(1);

  vi.advanceTimersByTime(100);
  expect(manager.toasts).toHaveLength(0);
});

it("freezes the countdown while paused and resumes with the remainder", () => {
  const manager = createToastManager();
  const id = manager.info("read me", { duration: 1000 });

  vi.advanceTimersByTime(400);
  manager.pause(id);
  vi.advanceTimersByTime(60_000);
  expect(manager.toasts).toHaveLength(1);

  manager.resume(id);
  vi.advanceTimersByTime(599);
  expect(manager.toasts).toHaveLength(1);

  vi.advanceTimersByTime(1);
  expect(manager.toasts).toHaveLength(0);
});

it("stays paused when the toast is replaced under the pointer", () => {
  const manager = createToastManager();
  const id = manager.info("saving", { duration: 1000 });

  manager.pause(id);
  manager.success("saved", { id, duration: 1000 });
  vi.advanceTimersByTime(60_000);
  expect(manager.toasts).toHaveLength(1);

  manager.resume(id);
  vi.advanceTimersByTime(1000);
  expect(manager.toasts).toHaveLength(0);
});

it("ignores pause and resume for an id it does not hold", () => {
  const manager = createToastManager();

  manager.pause("nothing");
  manager.resume("nothing");

  expect(manager.toasts).toHaveLength(0);
});

it("marks every toast dismissible unless told otherwise", () => {
  const manager = createToastManager();

  manager.info("plain");
  manager.info("locked", { dismissible: false });

  expect(manager.toasts.map((toast) => toast.dismissible)).toEqual([true, false]);
});

it("does not carry a description over into a replacement that omits it", () => {
  const manager = createToastManager();

  const id = manager.info("saving", { description: "hold on", duration: 1000 });
  manager.success("saved", { id });

  expect(manager.toasts[0].description).toBeUndefined();
});
