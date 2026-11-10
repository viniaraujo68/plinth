import { untrack } from "svelte";
import { SvelteMap } from "svelte/reactivity";
import { pageSpan } from "./paging.js";

export interface WindowedPage<Row> {
  items: readonly Row[];
  total: number;
}

export interface PageRequest {
  page: number;
  offset: number;
  limit: number;
  signal: AbortSignal;
}

export interface WindowedDataOptions<Row> {
  pageSize: number;
  fetchPage: (request: PageRequest) => Promise<WindowedPage<Row>>;
  retain?: number;
  signature?: () => string;
}

export type PageStatus = "loading" | "ready" | "error";

export interface PageFailure {
  page: number;
  error: unknown;
}

const DEFAULT_RETAIN = 2;

class PageSlot<Row> {
  status = $state<PageStatus>("loading");
  rows = $state.raw<readonly Row[]>([]);
  error = $state.raw<unknown>(undefined);
  controller: AbortController | null = null;
  released = false;
}

export class WindowedData<Row> {
  readonly pageSize: number;
  readonly retain: number;

  readonly #fetchPage: WindowedDataOptions<Row>["fetchPage"];
  readonly #signature: (() => string) | undefined;
  readonly #slots = new SvelteMap<number, PageSlot<Row>>();
  #currentSignature: string | undefined;
  #disposed = false;
  #count = $state(0);
  #resolved = $state(false);

  readonly failures: PageFailure[] = $derived.by(() =>
    [...this.#slots]
      .filter(([, slot]) => slot.status === "error")
      .map(([page, slot]) => ({ page, error: slot.error }))
      .sort((left, right) => left.page - right.page),
  );

  readonly loading: boolean = $derived.by(() =>
    [...this.#slots.values()].some((slot) => slot.status === "loading"),
  );

  constructor(options: WindowedDataOptions<Row>) {
    this.pageSize = Math.max(1, Math.floor(options.pageSize));
    this.retain = Math.max(0, Math.floor(options.retain ?? DEFAULT_RETAIN));
    this.#fetchPage = options.fetchPage;
    this.#signature = options.signature;
  }

  get count(): number {
    return this.#count;
  }

  get resolved(): boolean {
    return this.#resolved;
  }

  get failedPages(): number[] {
    return this.failures.map((failure) => failure.page);
  }

  get error(): unknown {
    return this.failures[0]?.error;
  }

  get(index: number): Row | undefined {
    if (!(index >= 0)) return undefined;
    const slot = this.#slots.get(Math.floor(index / this.pageSize));
    if (slot?.status !== "ready") return undefined;
    return slot.rows[index % this.pageSize];
  }

  statusOf(index: number): PageStatus | "idle" {
    if (!(index >= 0)) return "idle";
    return this.#slots.get(Math.floor(index / this.pageSize))?.status ?? "idle";
  }

  ensure(start: number, end: number): void {
    if (this.#disposed) return;
    const signature = this.#signature?.() ?? "";
    untrack(() => {
      if (signature !== this.#currentSignature) this.#rekey(signature);
      const span = pageSpan(start, end, this.pageSize, this.#resolved ? this.#count : null);
      if (!span) return;

      for (let page = span.first; page <= span.last; page++) {
        if (this.#slots.has(page)) continue;
        const slot = new PageSlot<Row>();
        this.#slots.set(page, slot);
        this.#load(page, slot);
      }

      for (const [page, slot] of this.#slots) {
        if (page >= span.first - this.retain && page <= span.last + this.retain) continue;
        this.#release(slot);
        this.#slots.delete(page);
      }
    });
  }

  retry(): void {
    if (this.#disposed) return;
    untrack(() => {
      for (const [page, slot] of this.#slots) if (slot.status === "error") this.#load(page, slot);
    });
  }

  dispose(): void {
    this.#disposed = true;
    untrack(() => this.#releaseAll());
  }

  #rekey(signature: string): void {
    this.#releaseAll();
    this.#currentSignature = signature;
    this.#count = 0;
    this.#resolved = false;
  }

  #load(page: number, slot: PageSlot<Row>): void {
    const controller = new AbortController();
    slot.controller = controller;
    slot.status = "loading";
    slot.error = undefined;

    const settled = (apply: () => void) => {
      if (slot.released || controller.signal.aborted) return;
      slot.controller = null;
      apply();
    };

    const request = (async () =>
      this.#fetchPage({
        page,
        offset: page * this.pageSize,
        limit: this.pageSize,
        signal: controller.signal,
      }))();

    void request.then(
      (result) =>
        settled(() => {
          slot.rows = result.items;
          slot.status = "ready";
          this.#count = Math.max(0, Math.floor(result.total));
          this.#resolved = true;
        }),
      (error: unknown) =>
        settled(() => {
          slot.error = error;
          slot.status = "error";
        }),
    );
  }

  #release(slot: PageSlot<Row>): void {
    slot.released = true;
    slot.controller?.abort();
    slot.controller = null;
  }

  #releaseAll(): void {
    for (const slot of this.#slots.values()) this.#release(slot);
    this.#slots.clear();
  }
}
