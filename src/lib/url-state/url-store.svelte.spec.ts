import { flushSync } from "svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { navigations, page, resetKit, visit } from "./fake-kit.spec.svelte.js";
import { createParamsCodec, param } from "./params-codec.js";
import { changedParams } from "./search-params.js";
import { createUrlState, urlStore, type UrlStateOptions } from "./url-store.svelte.js";

vi.mock("$app/state", () => import("./fake-kit.spec.svelte.js"));
vi.mock("$app/navigation", () => import("./fake-kit.spec.svelte.js"));

const filters = createParamsCodec({
  q: param.string({ default: "" }),
  page: param.number({ default: 1, min: 1, integer: true }),
});

const settle = async () => {
  await new Promise((resolve) => setTimeout(resolve));
  flushSync();
};

const cleanups: (() => void)[] = [];

const mountState = <State>(
  codec: Parameters<typeof createUrlState<State>>[0],
  options: UrlStateOptions<State> = {},
) => {
  let state!: ReturnType<typeof createUrlState<State>>;
  cleanups.push(
    $effect.root(() => {
      state = createUrlState(codec, options);
    }),
  );
  flushSync();
  return state;
};

beforeEach(() => resetKit("/list?tab=2"));

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});

describe("reading", () => {
  it("syncs a deep link in once mounted and reports it", () => {
    resetKit("/list?tab=2&q=ice&page=3");
    const onSynced = vi.fn();

    const state = mountState(filters, { onSynced });

    expect(state.committed).toEqual({ q: "ice", page: 3 });
    expect(state.draft).toEqual({ q: "ice", page: 3 });
    expect(onSynced).toHaveBeenCalledTimes(1);
  });

  it("falls back to the defaults for invalid params", () => {
    resetKit("/list?page=banana");

    const state = mountState(filters);

    expect(state.committed.page).toBe(1);
  });

  it("reads a pending write before it lands", () => {
    const store = urlStore(["q"]);

    store.write(new URLSearchParams("q=pending"));

    expect(store.read().get("q")).toBe("pending");
    expect(store.read().get("tab")).toBe("2");
    expect(page.url.searchParams.get("q")).toBeNull();
  });
});

describe("writing", () => {
  it("writes only the owned params and keeps the foreign ones", async () => {
    const state = mountState(filters);

    state.draft.q = "ice";
    state.commit();
    await settle();

    expect(page.url.pathname).toBe("/list");
    expect(page.url.searchParams.get("tab")).toBe("2");
    expect(page.url.searchParams.get("q")).toBe("ice");
    expect(navigations).toEqual([
      expect.objectContaining({ replaceState: false, keepFocus: true, noScroll: true }),
    ]);
  });

  it("removes a param once its field is back to the default", async () => {
    resetKit("/list?tab=2&q=ice&page=2");
    const state = mountState(filters);

    state.reset();
    await settle();

    expect(page.url.search).toBe("?tab=2");
  });

  it("does not navigate when the URL would only be reordered", async () => {
    resetKit("/list?page=2&tab=2&q=ice");
    const state = mountState(filters);

    state.commit();
    await settle();

    expect(navigations).toEqual([]);
  });

  it("does not notify its subscriber of its own write", async () => {
    const onChange = vi.fn();
    const store = urlStore(["q"]);
    cleanups.push($effect.root(() => store.subscribe(onChange)));
    flushSync();

    store.write(new URLSearchParams("q=mine"));
    await settle();
    expect(onChange).toHaveBeenCalledTimes(1);

    visit("/list?q=theirs");
    await settle();
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("does not re-sync from its own write", async () => {
    const onSynced = vi.fn();
    const state = mountState(filters, { onSynced });

    state.draft.q = "ice";
    state.commit();
    state.draft.q = "half-typed";
    await settle();

    expect(onSynced).toHaveBeenCalledTimes(1);
    expect(state.draft.q).toBe("half-typed");
  });
});

describe("outside changes", () => {
  it("keeps the draft when only a foreign param changes", async () => {
    const onSynced = vi.fn();
    const state = mountState(filters, { onSynced });

    state.draft.q = "half-typed";
    visit("/list?tab=3");
    await settle();

    expect(state.draft.q).toBe("half-typed");
    expect(onSynced).toHaveBeenCalledTimes(1);
  });

  it("takes a back-button change over the draft", async () => {
    const onSynced = vi.fn();
    const state = mountState(filters, { onSynced });

    state.draft.q = "half-typed";
    visit("/list?tab=2&q=older");
    await settle();

    expect(state.committed.q).toBe("older");
    expect(state.draft.q).toBe("older");
    expect(onSynced).toHaveBeenCalledTimes(2);
  });
});

describe("history", () => {
  it("replaces the entry when asked to", async () => {
    const state = mountState(filters, { replace: true });

    state.update((current) => ({ ...current, q: "i" }));
    await settle();

    expect(navigations.map((navigation) => navigation.replaceState)).toEqual([true]);
  });

  it("decides per write through a predicate", async () => {
    const state = mountState(filters, {
      replace: (previous, next) => changedParams(previous, next).every((name) => name === "q"),
      resetOnCommit: ["page"],
    });

    state.update((current) => ({ ...current, page: 2 }));
    await settle();
    state.update((current) => ({ ...current, page: 1, q: "i" }));
    await settle();
    state.update((current) => ({ ...current, q: "ic" }));
    await settle();

    expect(navigations.map((navigation) => navigation.replaceState)).toEqual([false, false, true]);
    expect(page.url.search).toBe("?tab=2&q=ic");
  });
});

describe("several states on one page", () => {
  const sorting = createParamsCodec({
    sort: param.string({ oneOf: ["asc", "desc"], default: "asc" }),
  });

  it("merges writes made in the same tick instead of dropping the first", async () => {
    const list = mountState(filters);
    const order = mountState(sorting);

    list.update((current) => ({ ...current, q: "ice" }));
    order.update(() => ({ sort: "desc" }));
    await settle();

    expect(page.url.searchParams.get("q")).toBe("ice");
    expect(page.url.searchParams.get("sort")).toBe("desc");
    expect(page.url.searchParams.get("tab")).toBe("2");
    expect(list.committed.q).toBe("ice");
    expect(order.committed.sort).toBe("desc");
  });

  it("pushes when any write merged into the same tick wanted a push", async () => {
    const list = mountState(filters);
    const order = mountState(sorting, { replace: true });

    list.update((current) => ({ ...current, q: "ice" }));
    order.update(() => ({ sort: "desc" }));
    await settle();

    expect(navigations.at(-1)?.replaceState).toBe(false);
  });
});
