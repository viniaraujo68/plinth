import { describe, expect, it, vi } from "vitest";
import { WindowedData, type PageRequest, type WindowedPage } from "./windowed-data.svelte.js";

const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
};

const rowsOf = (total: number, { offset, limit }: PageRequest) =>
  Array.from({ length: Math.max(0, Math.min(limit, total - offset)) }, (_, i) => `r${offset + i}`);

const backend = (total: number) =>
  vi.fn((request: PageRequest) =>
    Promise.resolve<WindowedPage<string>>({ items: rowsOf(total, request), total }),
  );

const requestedPages = (fetchPage: ReturnType<typeof backend>) =>
  fetchPage.mock.calls.map(([request]) => request.page);

describe("WindowedData", () => {
  it("fetches only the pages a range touches and maps indices onto them", async () => {
    const fetchPage = backend(95);
    const data = new WindowedData({ pageSize: 10, fetchPage });

    expect(data.get(0)).toBeUndefined();
    expect(data.resolved).toBe(false);

    data.ensure(0, 25);
    expect(data.loading).toBe(true);
    await settle();

    expect(requestedPages(fetchPage)).toEqual([0, 1, 2]);
    expect(fetchPage.mock.calls[1]?.[0]).toMatchObject({ page: 1, offset: 10, limit: 10 });
    expect(data.get(0)).toBe("r0");
    expect(data.get(10)).toBe("r10");
    expect(data.get(29)).toBe("r29");
    expect(data.get(30)).toBeUndefined();
    expect(data.count).toBe(95);
    expect(data.resolved).toBe(true);
    expect(data.loading).toBe(false);
  });

  it("dedupes a page that is already in flight or loaded", async () => {
    const gate = deferred<WindowedPage<string>>();
    const fetchPage = vi.fn((_request: PageRequest) => gate.promise);
    const data = new WindowedData({ pageSize: 10, fetchPage });

    data.ensure(0, 5);
    data.ensure(2, 8);
    data.ensure(0, 9);
    expect(fetchPage).toHaveBeenCalledTimes(1);

    gate.resolve({
      items: rowsOf(10, { page: 0, offset: 0, limit: 10, signal: new AbortController().signal }),
      total: 10,
    });
    await settle();
    data.ensure(0, 9);

    expect(fetchPage).toHaveBeenCalledTimes(1);
    expect(data.get(9)).toBe("r9");
  });

  it("caps the range at the known total", async () => {
    const fetchPage = backend(15);
    const data = new WindowedData({ pageSize: 10, fetchPage });

    data.ensure(0, 9);
    await settle();
    data.ensure(0, 500);
    await settle();

    expect(requestedPages(fetchPage)).toEqual([0, 1]);
    expect(data.get(14)).toBe("r14");
    expect(data.get(15)).toBeUndefined();
  });

  it("releases pages outside the retain band and keeps the count while it refetches", async () => {
    const fetchPage = backend(1000);
    const data = new WindowedData({ pageSize: 10, retain: 1, fetchPage });

    data.ensure(0, 9);
    await settle();
    expect(data.get(0)).toBe("r0");

    data.ensure(500, 519);
    expect(data.get(0)).toBeUndefined();
    expect(data.statusOf(0)).toBe("idle");
    expect(data.count).toBe(1000);
    await settle();
    expect(data.get(505)).toBe("r505");

    data.ensure(0, 9);
    await settle();
    expect(requestedPages(fetchPage)).toEqual([0, 50, 51, 0]);
  });

  it("keeps the pages inside the retain band", async () => {
    const fetchPage = backend(1000);
    const data = new WindowedData({ pageSize: 10, retain: 2, fetchPage });

    data.ensure(0, 9);
    await settle();
    data.ensure(20, 29);
    await settle();

    expect(data.get(0)).toBe("r0");
    expect(requestedPages(fetchPage)).toEqual([0, 2]);
  });

  it("aborts a page released while in flight and ignores its late answer", async () => {
    const gates = new Map<number, ReturnType<typeof deferred<WindowedPage<string>>>>();
    const signals = new Map<number, AbortSignal>();
    const fetchPage = vi.fn((request: PageRequest) => {
      const gate = deferred<WindowedPage<string>>();
      gates.set(request.page, gate);
      signals.set(request.page, request.signal);
      return gate.promise;
    });
    const data = new WindowedData({ pageSize: 10, retain: 0, fetchPage });

    data.ensure(0, 9);
    data.ensure(100, 109);

    expect(signals.get(0)?.aborted).toBe(true);
    gates.get(0)?.resolve({ items: ["stale"], total: 3 });
    await settle();

    expect(data.get(0)).toBeUndefined();
    expect(data.count).toBe(0);
  });

  it("re-keys when the signature changes, aborting the old generation", async () => {
    let filter = "a";
    const signals: AbortSignal[] = [];
    const fetchPage = vi.fn((request: PageRequest) => {
      signals.push(request.signal);
      const total = filter === "a" ? 30 : 12;
      return Promise.resolve({
        items: rowsOf(total, request).map((row) => `${filter}:${row}`),
        total,
      });
    });
    const data = new WindowedData({ pageSize: 10, signature: () => filter, fetchPage });

    data.ensure(0, 9);
    await settle();
    expect(data.count).toBe(30);
    expect(data.get(0)).toBe("a:r0");

    data.ensure(10, 19);
    filter = "b";
    data.ensure(0, 9);

    expect(signals[1]?.aborted).toBe(true);
    expect(data.count).toBe(0);
    expect(data.resolved).toBe(false);
    expect(data.get(0)).toBeUndefined();

    await settle();
    expect(data.count).toBe(12);
    expect(data.get(0)).toBe("b:r0");
  });

  it("records a failed page instead of leaving it loading", async () => {
    const failure = new Error("page 1 is down");
    const fetchPage = vi.fn((request: PageRequest) =>
      request.page === 1
        ? Promise.reject(failure)
        : Promise.resolve({ items: rowsOf(40, request), total: 40 }),
    );
    const data = new WindowedData({ pageSize: 10, fetchPage });

    data.ensure(0, 25);
    await settle();

    expect(data.get(5)).toBe("r5");
    expect(data.get(15)).toBeUndefined();
    expect(data.statusOf(15)).toBe("error");
    expect(data.failedPages).toEqual([1]);
    expect(data.error).toBe(failure);
    expect(data.failures).toEqual([{ page: 1, error: failure }]);
    expect(data.loading).toBe(false);
  });

  it("does not refetch a failed page on the next ensure, only on retry", async () => {
    let healthy = false;
    const fetchPage = vi.fn((request: PageRequest) =>
      healthy
        ? Promise.resolve({ items: rowsOf(20, request), total: 20 })
        : Promise.reject(new Error("offline")),
    );
    const data = new WindowedData({ pageSize: 10, fetchPage });

    data.ensure(0, 9);
    await settle();
    data.ensure(0, 9);
    await settle();
    expect(fetchPage).toHaveBeenCalledTimes(1);
    expect(data.resolved).toBe(false);
    expect(data.failedPages).toEqual([0]);

    healthy = true;
    data.retry();
    expect(data.statusOf(0)).toBe("loading");
    expect(data.failedPages).toEqual([]);
    await settle();

    expect(fetchPage).toHaveBeenCalledTimes(2);
    expect(data.get(0)).toBe("r0");
    expect(data.count).toBe(20);
    expect(data.error).toBeUndefined();
  });

  it("turns a synchronous throw from fetchPage into a failed page", async () => {
    const data = new WindowedData<string>({
      pageSize: 10,
      fetchPage: () => {
        throw new Error("bad request");
      },
    });

    data.ensure(0, 0);
    await settle();

    expect(data.failedPages).toEqual([0]);
  });

  it("refetches a failed page that was evicted and comes back into range", async () => {
    let calls = 0;
    const fetchPage = vi.fn((request: PageRequest) => {
      calls++;
      if (request.page === 0 && calls === 1) return Promise.reject(new Error("flaky"));
      return Promise.resolve({ items: rowsOf(1000, request), total: 1000 });
    });
    const data = new WindowedData({ pageSize: 10, retain: 0, fetchPage });

    data.ensure(0, 9);
    await settle();
    expect(data.failedPages).toEqual([0]);

    data.ensure(500, 509);
    expect(data.failedPages).toEqual([]);
    data.ensure(0, 9);
    await settle();

    expect(data.get(0)).toBe("r0");
  });

  it("resolves an empty set without fetching again", async () => {
    const fetchPage = backend(0);
    const data = new WindowedData({ pageSize: 10, fetchPage });

    data.ensure(0, 0);
    await settle();
    data.ensure(0, 30);

    expect(data.resolved).toBe(true);
    expect(data.count).toBe(0);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it("stops after dispose, aborting what is in flight", () => {
    const signals: AbortSignal[] = [];
    const fetchPage = vi.fn((request: PageRequest) => {
      signals.push(request.signal);
      return new Promise<WindowedPage<string>>(() => undefined);
    });
    const data = new WindowedData({ pageSize: 10, fetchPage });

    data.ensure(0, 9);
    data.dispose();
    data.ensure(0, 9);
    data.retry();

    expect(signals[0]?.aborted).toBe(true);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });
});
