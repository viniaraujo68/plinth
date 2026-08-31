import { expect, it, vi } from "vitest";
import { confirm, createConfirmManager } from "./confirm-manager.svelte.js";

// Presenting is deferred by a microtask, so every assertion about what is on screen has to let one
// run first.
const settled = () => new Promise<void>((resolve) => queueMicrotask(resolve));

const attachSpy = (manager: ReturnType<typeof createConfirmManager>) => {
  const present = vi.fn();
  const detach = manager.attach(present);
  return { present, detach };
};

it("holds nothing before anything is asked", () => {
  const manager = createConfirmManager();

  expect(manager.current).toBeNull();
  expect(manager.pending).toBe(0);
});

it("puts a question on screen and asks the host to present it", async () => {
  const manager = createConfirmManager();
  const { present } = attachSpy(manager);

  void manager.confirm({ title: "Delete this night?" });
  await settled();

  expect(manager.current?.title).toBe("Delete this night?");
  expect(present).toHaveBeenCalledTimes(1);
});

it("resolves true only for the confirm action", async () => {
  const manager = createConfirmManager();
  attachSpy(manager);

  const answer = manager.confirm({ title: "Delete?" });
  await settled();
  manager.settle(manager.current!.id, true);

  await expect(answer).resolves.toBe(true);
});

it("resolves false when the question is cancelled", async () => {
  const manager = createConfirmManager();
  attachSpy(manager);

  const answer = manager.confirm({ title: "Delete?" });
  await settled();
  manager.settle(manager.current!.id, false);

  await expect(answer).resolves.toBe(false);
});

it("queues a second call behind the first instead of replacing it", async () => {
  const manager = createConfirmManager();
  const { present } = attachSpy(manager);

  const first = manager.confirm({ title: "First" });
  const second = manager.confirm({ title: "Second" });
  await settled();

  expect(manager.pending).toBe(2);
  expect(manager.current?.title).toBe("First");
  // One presentation, not two: only the head is ever on screen.
  expect(present).toHaveBeenCalledTimes(1);

  manager.settle(manager.current!.id, true);
  await settled();

  expect(manager.current?.title).toBe("Second");
  expect(present).toHaveBeenCalledTimes(2);
  await expect(first).resolves.toBe(true);

  manager.settle(manager.current!.id, false);
  await expect(second).resolves.toBe(false);
  expect(manager.pending).toBe(0);
});

it("ignores a settle aimed at anything but the question on screen", async () => {
  const manager = createConfirmManager();
  attachSpy(manager);

  const answer = manager.confirm({ title: "First" });
  await settled();
  const id = manager.current!.id;

  manager.settle("confirm-not-mine", true);
  expect(manager.pending).toBe(1);

  manager.settle(id, true);
  manager.settle(id, false);

  await expect(answer).resolves.toBe(true);
});

it("answers everything still waiting with a cancel when the queue is dropped", async () => {
  const manager = createConfirmManager();
  attachSpy(manager);

  const first = manager.confirm({ title: "First" });
  const second = manager.confirm({ title: "Second" });
  await settled();

  manager.cancelAll();

  await expect(Promise.all([first, second])).resolves.toEqual([false, false]);
  expect(manager.pending).toBe(0);
  expect(manager.current).toBeNull();
});

it("cancels what is pending when the last host goes away", async () => {
  const manager = createConfirmManager();
  const { detach } = attachSpy(manager);

  const answer = manager.confirm({ title: "Delete?" });
  await settled();
  detach();

  // A promise nobody can ever answer is worse than a false.
  await expect(answer).resolves.toBe(false);
});

it("keeps the queue alive while a second host is still mounted", async () => {
  const manager = createConfirmManager();
  const first = attachSpy(manager);
  const second = attachSpy(manager);

  const answer = manager.confirm({ title: "Delete?" });
  await settled();
  first.detach();

  expect(manager.pending).toBe(1);

  manager.settle(manager.current!.id, true);
  await expect(answer).resolves.toBe(true);
  second.detach();
});

it("presents what was already queued when a host arrives late", async () => {
  const manager = createConfirmManager();

  void manager.confirm({ title: "Asked before the host mounted" });
  await settled();

  const { present } = attachSpy(manager);
  await settled();

  expect(present).toHaveBeenCalledTimes(1);
  expect(manager.current?.title).toBe("Asked before the host mounted");
});

it("gives every question an id of its own", async () => {
  const manager = createConfirmManager();
  attachSpy(manager);

  void manager.confirm({ title: "First" });
  void manager.confirm({ title: "Second" });
  await settled();

  const firstId = manager.current!.id;
  manager.settle(firstId, false);
  await settled();

  expect(manager.current!.id).not.toBe(firstId);
});

it("drops a challenge that is blank or nothing but whitespace", async () => {
  const manager = createConfirmManager();
  attachSpy(manager);

  void manager.confirm({ title: "Delete?", challenge: "   " });
  await settled();

  // `challenge={maybeName}` must not produce a gate nobody can open.
  expect(manager.current?.challenge).toBeUndefined();
});

it("keeps a challenge exactly as it was given, spacing included", async () => {
  const manager = createConfirmManager();
  attachSpy(manager);

  void manager.confirm({ title: "Delete?", challenge: " Thursday Regulars " });
  await settled();

  expect(manager.current?.challenge).toBe(" Thursday Regulars ");
});

it("cancels on the server, where there is nobody to ask", async () => {
  // The node project is the server: `document` is undefined here, which is exactly the condition
  // the helper reads.
  expect(typeof document).toBe("undefined");
  await expect(confirm({ title: "Delete?" })).resolves.toBe(false);
});
