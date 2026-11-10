import { expect, it } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-svelte";
import Harness from "./VirtualListHarness.spec.svelte";

const viewport = () => document.querySelector<HTMLElement>(".plinth-virtual")!;
const renderedItems = () => [...document.querySelectorAll<HTMLElement>(".plinth-virtual-item")];
const renderedIndices = () => renderedItems().map((item) => Number(item.dataset.index));
const rowNode = (key: number) => document.querySelector<HTMLElement>(`[data-key="${key}"]`);
const wrapperOf = (key: number) => rowNode(key)?.closest<HTMLElement>(".plinth-virtual-item");
const topOf = (key: number) => {
  const row = rowNode(key);
  if (!row) return Number.NaN;
  return row.getBoundingClientRect().top - viewport().getBoundingClientRect().top;
};
const distanceFromEnd = () => {
  const element = viewport();
  return element.scrollHeight - element.clientHeight - element.scrollTop;
};
const frames = async (count = 3) => {
  for (let step = 0; step < count; step++)
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
};

it("renders only the slice around the viewport out of 100,000 rows", async () => {
  render(Harness, { count: 100_000 });

  await expect.poll(() => renderedItems().length).toBeGreaterThan(0);
  await expect.element(page.getByRole("region", { name: "Rows" })).toBeInTheDocument();

  expect(renderedIndices()[0]).toBe(0);
  expect(renderedItems().length).toBeLessThan(25);
  expect(viewport().scrollHeight).toBe(100_000 * 40);
});

it("scrolls an index to the top of the viewport", async () => {
  const { component } = render(Harness, { count: 100_000 });
  await expect.poll(() => renderedItems().length).toBeGreaterThan(0);

  component.scrollToIndex(5000);

  await expect.poll(() => renderedIndices()).toContain(5000);
  expect(viewport().scrollTop).toBe(5000 * 40);
  expect(topOf(5000)).toBeCloseTo(0, 0);
  expect(renderedIndices()).not.toContain(0);
});

it("aligns an index to the end of the viewport", async () => {
  const { component } = render(Harness, { count: 1000 });
  await expect.poll(() => renderedItems().length).toBeGreaterThan(0);

  component.scrollToIndex(200, "end");

  await expect.poll(() => topOf(200)).toBeCloseTo(400 - 40, 0);
});

it("treats scrollToIndex on an empty list as a no-op", async () => {
  const { component } = render(Harness, { count: 0 });
  await frames(1);

  component.scrollToIndex(10);
  component.scrollToIndex(Number.NaN);
  await frames(1);

  expect(viewport().scrollTop).toBe(0);
  expect(renderedItems()).toHaveLength(0);
});

it("places each row after the measured height of the one before it", async () => {
  render(Harness, { count: 50, varied: true });

  await expect
    .poll(
      () =>
        (wrapperOf(1)?.getBoundingClientRect().top ?? 0) - viewport().getBoundingClientRect().top,
    )
    .toBeCloseTo(30, 0);
  await expect
    .poll(
      () =>
        (wrapperOf(2)?.getBoundingClientRect().top ?? 0) - viewport().getBoundingClientRect().top,
    )
    .toBeCloseTo(75, 0);
});

it("keeps the row being read in place when older rows are prepended", async () => {
  const { component } = render(Harness, { count: 200, varied: true });
  await expect.poll(() => renderedItems().length).toBeGreaterThan(0);

  component.scrollToIndex(100);
  await expect.poll(() => topOf(100)).toBeCloseTo(0, 0);
  await frames();
  const before = topOf(100);

  component.prepend(30);
  await frames();

  await expect.poll(() => topOf(100)).toBeCloseTo(before, 0);
  expect(wrapperOf(100)?.dataset.index).toBe("130");
  expect(rowNode(-30)).toBeNull();
});

it("keeps each row's DOM node across a prepend, because rows are keyed by item key", async () => {
  const { component } = render(Harness, { count: 200 });
  await expect.poll(() => renderedItems().length).toBeGreaterThan(0);

  component.scrollToIndex(50);
  await expect.poll(() => renderedIndices()).toContain(50);
  const row = rowNode(50);
  const wrapper = wrapperOf(50);

  component.prepend(10);
  await expect.poll(() => wrapperOf(50)?.dataset.index).toBe("60");

  expect(rowNode(50)).toBe(row);
  expect(wrapperOf(50)).toBe(wrapper);
});

it("follows an append while the reader sits at the end of a bottom-anchored list", async () => {
  const { component } = render(Harness, {
    count: 60,
    varied: true,
    anchorTo: "end",
    followOnAppend: true,
  });
  await expect.poll(() => renderedItems().length).toBeGreaterThan(0);

  component.scrollToEnd();
  await expect.poll(() => rowNode(59)).not.toBeNull();
  await expect.poll(distanceFromEnd).toBeLessThan(2);

  component.append();

  await expect.poll(() => rowNode(60)).not.toBeNull();
  await expect.poll(distanceFromEnd).toBeLessThan(2);
});

it("stays put on an append when the reader has scrolled away from the end", async () => {
  const { component } = render(Harness, { count: 60, anchorTo: "end", followOnAppend: true });
  await expect.poll(() => renderedItems().length).toBeGreaterThan(0);

  component.scrollToIndex(0);
  await frames();
  component.append();
  await frames();

  expect(viewport().scrollTop).toBe(0);
  expect(rowNode(60)).toBeNull();
});
