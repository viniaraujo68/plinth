import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { setErrorReporter } from "../error.js";
import { createToastManager } from "./toast-manager.svelte.js";

const reported: unknown[] = [];

beforeEach(() => {
  vi.useFakeTimers();
  reported.length = 0;
  setErrorReporter((error) => reported.push(error));
});

afterEach(() => {
  vi.useRealTimers();
  setErrorReporter(null);
});

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
};

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

it("keeps a loading toast on screen and undismissible by default", () => {
  const manager = createToastManager();

  manager.loading("Uploading…");
  vi.advanceTimersByTime(10 * 60 * 1000);

  expect(manager.toasts).toHaveLength(1);
  expect(manager.toasts[0].variant).toBe("loading");
  expect(manager.toasts[0].dismissible).toBe(false);
});

it("lets a loading toast opt into a countdown and a dismiss button", () => {
  const manager = createToastManager({ durations: { loading: 2000 } });

  manager.loading("Uploading…", { dismissible: true });
  expect(manager.toasts[0].dismissible).toBe(true);

  vi.advanceTimersByTime(2000);
  expect(manager.toasts).toHaveLength(0);
});

it("updates a toast in place, keeping what the patch leaves out", () => {
  const manager = createToastManager();
  const id = manager.info("Uploading", { description: "10%", duration: 1000 });

  expect(manager.update(id, { description: "50%" })).toBe(true);

  expect(manager.toasts).toHaveLength(1);
  expect(manager.toasts[0]).toMatchObject({
    message: "Uploading",
    description: "50%",
    variant: "info",
    duration: 1000,
  });
});

it("restarts the countdown on an update", () => {
  const manager = createToastManager();
  const id = manager.info("Uploading", { duration: 1000 });

  vi.advanceTimersByTime(900);
  manager.update(id, { description: "almost" });
  vi.advanceTimersByTime(900);
  expect(manager.toasts).toHaveLength(1);

  vi.advanceTimersByTime(100);
  expect(manager.toasts).toHaveLength(0);
});

it("takes the new variant's timing and dismissibility when an update changes the variant", () => {
  const manager = createToastManager();
  const id = manager.loading("Saving…");

  manager.update(id, { variant: "success", message: "Saved." });

  expect(manager.toasts[0]).toMatchObject({ variant: "success", dismissible: true });
  vi.advanceTimersByTime(3000);
  expect(manager.toasts).toHaveLength(0);
});

it("clears a description when the patch sets it to undefined", () => {
  const manager = createToastManager();
  const id = manager.info("Uploading", { description: "10%" });

  manager.update(id, { description: undefined });

  expect(manager.toasts[0].description).toBeUndefined();
});

it("refuses to update an id it does not hold", () => {
  const manager = createToastManager();

  expect(manager.update("nothing", { message: "ghost" })).toBe(false);
  expect(manager.toasts).toHaveLength(0);
});

it("turns a promise's loading toast into a success in place and resolves to the value", async () => {
  const manager = createToastManager();
  const work = deferred<number>();

  const result = manager.promise(work.promise, {
    loading: "Saving…",
    success: (count) => `Saved ${count} rows.`,
    error: "Could not save.",
  });

  expect(manager.toasts).toHaveLength(1);
  const [{ id, variant, createdAt }] = manager.toasts;
  expect(variant).toBe("loading");

  vi.advanceTimersByTime(60_000);
  work.resolve(3);

  await expect(result).resolves.toBe(3);
  expect(manager.toasts).toHaveLength(1);
  expect(manager.toasts[0]).toMatchObject({
    id,
    createdAt,
    variant: "success",
    message: "Saved 3 rows.",
    dismissible: true,
  });

  vi.advanceTimersByTime(3000);
  expect(manager.toasts).toHaveLength(0);
});

it("turns a failed promise into an error in place, resolves undefined and reports it", async () => {
  const manager = createToastManager();
  const failure = new Error("boom");

  const result = manager.promise(Promise.reject(failure), {
    loading: "Saving…",
    success: "Saved.",
    error: (error) => `Failed: ${(error as Error).message}`,
  });

  await expect(result).resolves.toBeUndefined();
  expect(manager.toasts[0]).toMatchObject({ variant: "error", message: "Failed: boom" });
  expect(reported).toEqual([failure]);

  vi.advanceTimersByTime(5000);
  expect(manager.toasts).toHaveLength(0);
});

it("hands a failure to onerror instead of the reporter when one is given", async () => {
  const manager = createToastManager();
  const onerror = vi.fn();
  const failure = new Error("expected");

  await manager.promise(
    Promise.reject(failure),
    { loading: "Saving…", success: "Saved.", error: "Could not save." },
    { onerror },
  );

  expect(onerror).toHaveBeenCalledWith(failure);
  expect(reported).toEqual([]);
});

it("runs a promise factory, and catches one that throws before returning a promise", async () => {
  const manager = createToastManager();

  await expect(
    manager.promise(() => Promise.resolve("ok"), {
      loading: "…",
      success: (value) => value,
      error: "no",
    }),
  ).resolves.toBe("ok");

  const failure = new Error("sync");
  await expect(
    manager.promise(
      () => {
        throw failure;
      },
      { loading: "…", success: "yes", error: "no" },
    ),
  ).resolves.toBeUndefined();
  expect(reported).toEqual([failure]);
});

it("applies per-phase options and keeps a caller's id", async () => {
  const manager = createToastManager();

  const result = manager.promise(
    Promise.resolve(1),
    { loading: "Saving…", success: "Saved.", error: "Failed." },
    {
      id: "save",
      loading: { description: "Hold on" },
      success: { duration: 10_000 },
    },
  );

  expect(manager.toasts[0]).toMatchObject({ id: "save", description: "Hold on" });
  await result;
  expect(manager.toasts[0]).toMatchObject({ id: "save", description: undefined, duration: 10_000 });
});

it("does not resurrect a toast that was dismissed or cleared while the promise ran", async () => {
  const manager = createToastManager();
  const first = deferred<undefined>();
  const second = deferred<undefined>();
  const messages = { loading: "…", success: "done", error: "failed" };

  const dismissed = manager.promise(first.promise, messages, { loading: { dismissible: true } });
  manager.dismiss(manager.toasts[0].id);
  first.resolve(undefined);
  await dismissed;
  expect(manager.toasts).toHaveLength(0);

  const cleared = manager.promise(second.promise, messages);
  manager.clear();
  second.reject(new Error("late"));
  await cleared;
  expect(manager.toasts).toHaveLength(0);
});

it("lets a later write under the same id supersede the promise", async () => {
  const manager = createToastManager();
  const work = deferred<undefined>();

  const result = manager.promise(
    work.promise,
    { loading: "Saving…", success: "Saved.", error: "Failed." },
    { id: "save" },
  );
  manager.warning("Saving cancelled.", { id: "save" });
  work.resolve(undefined);
  await result;

  expect(manager.toasts[0]).toMatchObject({ variant: "warning", message: "Saving cancelled." });
});

it("keeps the promise in charge across an update of its loading toast", async () => {
  const manager = createToastManager();
  const work = deferred<undefined>();

  const result = manager.promise(work.promise, {
    loading: "Uploading…",
    success: "Uploaded.",
    error: "Failed.",
  });
  const { id } = manager.toasts[0];
  manager.update(id, { description: "50%" });
  work.resolve(undefined);
  await result;

  expect(manager.toasts[0]).toMatchObject({ variant: "success", message: "Uploaded." });
});

it("drops the toast and reports when a message function throws", async () => {
  const manager = createToastManager();
  const formatterFailure = new Error("bad formatter");

  const result = manager.promise(Promise.resolve(1), {
    loading: "Saving…",
    success: () => {
      throw formatterFailure;
    },
    error: "Failed.",
  });

  await expect(result).resolves.toBe(1);
  expect(manager.toasts).toHaveLength(0);
  expect(reported).toEqual([formatterFailure]);
});
