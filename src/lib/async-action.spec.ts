import { expect, it, vi } from "vitest";
import { AsyncAction } from "./async-action.svelte.js";

/** A promise plus the handles to settle it from the test, so a run can be inspected mid-flight. */
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

it("starts idle", () => {
  const action = new AsyncAction(() => Promise.resolve("done"));

  expect(action.status).toBe("idle");
  expect(action.isPending).toBe(false);
  expect(action.error).toBeNull();
});

it("walks idle to pending to success, returning the value", async () => {
  const gate = deferred<string>();
  const action = new AsyncAction(() => gate.promise);

  const running = action.run();
  expect(action.status).toBe("pending");
  expect(action.isPending).toBe(true);

  gate.resolve("done");

  await expect(running).resolves.toBe("done");
  expect(action.status).toBe("success");
  expect(action.isSuccess).toBe(true);
});

it("records a rejection as state instead of rejecting", async () => {
  const failure = new Error("boom");
  const action = new AsyncAction(() => Promise.reject(failure));

  await expect(action.run()).resolves.toBeUndefined();
  expect(action.status).toBe("error");
  expect(action.isError).toBe(true);
  expect(action.error).toBe(failure);
});

it("clears the previous error when a run starts", async () => {
  let attempt = 0;
  const action = new AsyncAction(() => {
    attempt++;
    return attempt === 1 ? Promise.reject(new Error("boom")) : Promise.resolve("ok");
  });

  await action.run();
  expect(action.isError).toBe(true);

  const running = action.run();
  expect(action.error).toBeNull();

  await running;
  expect(action.status).toBe("success");
});

it("passes its arguments through to the wrapped function", async () => {
  const fn = vi.fn((_id: string, _force: boolean) => Promise.resolve(1));
  const action = new AsyncAction(fn);

  await action.run("a", true);

  expect(fn).toHaveBeenCalledWith("a", true);
});

it("returns to idle on reset", async () => {
  const action = new AsyncAction(() => Promise.reject(new Error("boom")));

  await action.run();
  action.reset();

  expect(action.status).toBe("idle");
  expect(action.error).toBeNull();
  expect(action.isError).toBe(false);
});

// The failure this guards against is a double click: without it, the slower first call lands last
// and overwrites the outcome the user is actually waiting on.
it("ignores a run that a later run has superseded", async () => {
  const slow = deferred<string>();
  const fast = deferred<string>();
  let call = 0;
  const action = new AsyncAction(() => (++call === 1 ? slow.promise : fast.promise));

  const first = action.run();
  const second = action.run();

  fast.resolve("second");
  await second;
  expect(action.status).toBe("success");

  slow.reject(new Error("late failure"));
  await expect(first).resolves.toBeUndefined();
  expect(action.status).toBe("success");
  expect(action.error).toBeNull();
});

it("ignores a run that a reset has abandoned", async () => {
  const gate = deferred<string>();
  const action = new AsyncAction(() => gate.promise);

  const running = action.run();
  action.reset();
  gate.resolve("late");
  await running;

  expect(action.status).toBe("idle");
});
