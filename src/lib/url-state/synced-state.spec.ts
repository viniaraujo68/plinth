import { describe, expect, it, vi } from "vitest";
import type { ExternalStore } from "./codec.js";
import { createParamsCodec, param } from "./params-codec.js";
import { SyncedState } from "./synced-state.svelte.js";

const codec = createParamsCodec({
  q: param.string({ default: "" }),
  status: param.string({ oneOf: ["open", "closed"], default: "open" }),
  page: param.number({ default: 1, min: 1, integer: true }),
});

const memoryStore = (initial = "") => {
  let current = new URLSearchParams(initial);
  const listeners: (() => void)[] = [];
  const writes: string[] = [];
  const store: ExternalStore<URLSearchParams> = {
    read: () => new URLSearchParams(current),
    write: (params) => {
      current = new URLSearchParams(params);
      writes.push(params.toString());
    },
    subscribe: (onChange) => {
      listeners.push(onChange);
    },
  };
  const navigate = (search: string) => {
    current = new URLSearchParams(search);
    for (const listener of listeners) listener();
  };
  return { store, writes, navigate, current: () => current.toString() };
};

describe("without a store", () => {
  it("starts both halves at the codec defaults", () => {
    const state = new SyncedState({ codec });

    expect(state.draft).toEqual({ q: "", status: "open", page: 1 });
    expect(state.committed).toEqual(state.draft);
    expect(state.key()).toBe("");
    expect(state.isDirty).toBe(false);
  });

  it("stages edits on the draft until commit", () => {
    const state = new SyncedState({ codec });

    state.draft.q = "ice";
    expect(state.committed.q).toBe("");
    expect(state.isDirty).toBe(true);

    state.commit();
    expect(state.committed.q).toBe("ice");
    expect(state.key()).toBe("q=ice");
    expect(state.isDirty).toBe(false);
  });

  it("does not share objects between draft and committed", () => {
    const state = new SyncedState({ codec });
    state.draft.q = "ice";
    state.commit();

    state.draft.q = "changed";

    expect(state.committed.q).toBe("ice");
  });

  it("reverts the draft to the committed state", () => {
    const state = new SyncedState({ codec });
    state.draft.q = "ice";
    state.commit();
    state.draft.q = "half-typed";

    state.revert();

    expect(state.draft.q).toBe("ice");
    expect(state.isDirty).toBe(false);
  });

  it("resets both halves to the defaults", () => {
    const state = new SyncedState({ codec });
    state.draft.q = "ice";
    state.commit();
    state.draft.status = "closed";

    state.reset();

    expect(state.draft).toEqual(codec.createDefault());
    expect(state.committed).toEqual(codec.createDefault());
  });

  it("applies an eager update to both halves and keeps unrelated draft edits", () => {
    const state = new SyncedState({ codec });
    state.draft.q = "half-typed";

    state.update((current) => ({ ...current, page: current.page + 1 }));

    expect(state.committed.page).toBe(2);
    expect(state.draft.page).toBe(2);
    expect(state.committed.q).toBe("");
    expect(state.draft.q).toBe("half-typed");
  });

  it("commits the normalized draft, so committed is what a reload would read", () => {
    const state = new SyncedState({ codec });
    state.draft.q = "ice";
    state.draft.page = Number.NaN;
    state.draft.status = "nonsense" as "open";

    state.commit();

    expect(state.committed).toEqual({ q: "ice", status: "open", page: 1 });
    expect(state.draft).toEqual(state.committed);
  });

  it("normalizes an eager update on the committed half only", () => {
    const state = new SyncedState({ codec });

    state.update((current) => ({ ...current, page: -3 }));

    expect(state.committed.page).toBe(1);
    expect(state.draft.page).toBe(-3);
  });

  it("does not count a draft that normalizes to the committed state as dirty", () => {
    const state = new SyncedState({ codec });

    state.draft.page = Number.NaN;

    expect(state.isDirty).toBe(false);
    expect(state.normalized()).toEqual(codec.createDefault());
  });
});

describe("resetOnCommit", () => {
  const paged = () => new SyncedState({ codec, resetOnCommit: ["page"] });

  it("returns to the first page when a commit changes a filter", () => {
    const state = paged();
    state.update((current) => ({ ...current, page: 4 }));

    state.draft.q = "ice";
    state.commit();

    expect(state.committed).toEqual({ q: "ice", status: "open", page: 1 });
    expect(state.draft.page).toBe(1);
  });

  it("keeps the page when the commit changes nothing but the page", () => {
    const state = paged();
    state.draft.page = 3;

    state.commit();

    expect(state.committed.page).toBe(3);
  });

  it("keeps the page when an apply changes nothing at all", () => {
    const state = paged();
    state.update((current) => ({ ...current, page: 4 }));

    state.commit();

    expect(state.committed.page).toBe(4);
  });

  it("turns pages eagerly without resetting them", () => {
    const state = paged();

    state.update((current) => ({ ...current, page: 2 }));
    state.update((current) => ({ ...current, page: current.page + 1 }));

    expect(state.committed.page).toBe(3);
  });

  it("returns to the first page when an eager update changes a filter", () => {
    const state = paged();
    state.update((current) => ({ ...current, page: 4 }));

    state.update((current) => ({ ...current, status: "closed" }));

    expect(state.committed).toEqual({ q: "", status: "closed", page: 1 });
    expect(state.draft.page).toBe(1);
  });

  it("ignores filter edits that normalize away", () => {
    const state = paged();
    state.update((current) => ({ ...current, page: 4 }));

    state.draft.status = "nonsense" as "open";
    state.commit();

    expect(state.committed.page).toBe(4);
  });
});

describe("with a store", () => {
  it("does not read the store until the subscription first fires", () => {
    const { store } = memoryStore("q=deep");
    const onSynced = vi.fn();

    const state = new SyncedState({ codec, store, onSynced });

    expect(state.committed.q).toBe("");
    expect(onSynced).not.toHaveBeenCalled();
  });

  it("syncs in on the first run, even when the store holds the defaults", () => {
    const { store, navigate } = memoryStore();
    const onSynced = vi.fn();
    const state = new SyncedState({ codec, store, onSynced });

    navigate("");

    expect(onSynced).toHaveBeenCalledTimes(1);
    expect(state.committed).toEqual(codec.createDefault());
  });

  it("parses a deep link into both halves", () => {
    const { store, navigate } = memoryStore();
    const state = new SyncedState({ codec, store });

    navigate("q=deep&page=3");

    expect(state.committed).toEqual({ q: "deep", status: "open", page: 3 });
    expect(state.draft).toEqual(state.committed);
  });

  it("writes the normalized committed state, never the draft", () => {
    const { store, writes } = memoryStore();
    const state = new SyncedState({ codec, store });

    state.draft.q = "staged";
    state.update((current) => ({ ...current, page: 2 }));
    state.commit();
    state.draft.q = "again";
    state.revert();
    state.reset();

    expect(writes).toEqual(["page=2", "q=staged&page=2", ""]);
  });

  it("keeps the draft when a store change does not change the key", () => {
    const { store, navigate } = memoryStore();
    const onSynced = vi.fn();
    const state = new SyncedState({ codec, store, onSynced });
    navigate("q=a&page=2");

    state.draft.q = "half-typed";
    navigate("page=2&q=a&tab=foreign");
    navigate("q=a&page=2&status=open");

    expect(state.draft.q).toBe("half-typed");
    expect(onSynced).toHaveBeenCalledTimes(1);
  });

  it("takes a genuine external change over the draft and reports it", () => {
    const { store, navigate } = memoryStore();
    const onSynced = vi.fn();
    const state = new SyncedState({ codec, store, onSynced });
    navigate("");

    state.draft.q = "half-typed";
    navigate("q=from-back-button");

    expect(state.committed.q).toBe("from-back-button");
    expect(state.draft.q).toBe("from-back-button");
    expect(onSynced).toHaveBeenCalledTimes(2);
  });
});
