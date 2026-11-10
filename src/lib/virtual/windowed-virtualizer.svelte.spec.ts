import { flushSync } from "svelte";
import { expect, it, vi } from "vitest";
import { WindowedData, type PageRequest } from "./windowed-data.svelte.js";
import { WindowedVirtualizer } from "./windowed-virtualizer.svelte.js";

const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

const backend = (total: number) =>
  vi.fn((request: PageRequest) =>
    Promise.resolve({
      items: Array.from(
        { length: Math.max(0, Math.min(request.limit, total - request.offset)) },
        (_, index) => `r${request.offset + index}`,
      ),
      total,
    }),
  );

const withinRoot = <T>(create: () => T) => {
  let value!: T;
  const destroy = $effect.root(() => {
    value = create();
  });
  flushSync();
  return { value, destroy };
};

const mountViewport = (virtualizer: WindowedVirtualizer<string>) => {
  const element = document.createElement("div");
  element.style.height = "400px";
  element.style.overflow = "auto";
  const spacer = document.createElement("div");
  element.append(spacer);
  document.body.append(element);
  spacer.style.height = `${virtualizer.totalSize}px`;
  const detach = virtualizer.viewport(element);
  return {
    scrollTo(offset: number) {
      element.scrollTop = offset;
      element.dispatchEvent(new Event("scroll"));
    },
    remove() {
      if (typeof detach === "function") detach();
      element.remove();
    },
  };
};

it("asks for the first page while empty, then for whatever range is on screen", async () => {
  const fetchPage = backend(400);
  const { value, destroy } = withinRoot(() => {
    const data = new WindowedData<string>({ pageSize: 20, fetchPage });
    return { data, virtualizer: new WindowedVirtualizer({ data, estimateSize: 40 }) };
  });
  const { data, virtualizer } = value;

  await settle();
  expect(fetchPage.mock.calls[0]?.[0].page).toBe(0);
  expect(data.count).toBe(400);
  expect(data.get(0)).toBe("r0");

  const viewport = mountViewport(virtualizer);
  flushSync();
  viewport.scrollTo(40 * 150);
  flushSync();
  await settle();

  expect(fetchPage.mock.calls.map(([request]) => request.page)).toContain(7);
  expect(data.get(150)).toBe("r150");

  viewport.remove();
  destroy();
});

it("clears measurements when a re-key empties the window, not on the first load", async () => {
  let filter = $state("a");
  const fetchPage = backend(60);
  const { value, destroy } = withinRoot(() => {
    const data = new WindowedData<string>({ pageSize: 20, signature: () => filter, fetchPage });
    return { data, virtualizer: new WindowedVirtualizer({ data, estimateSize: 40 }) };
  });
  const { data, virtualizer } = value;
  const clear = vi.spyOn(virtualizer, "clearMeasurements");

  await settle();
  expect(data.count).toBe(60);
  expect(clear).not.toHaveBeenCalled();

  filter = "b";
  flushSync();

  expect(clear).toHaveBeenCalledTimes(1);
  await settle();
  expect(data.count).toBe(60);

  destroy();
});
