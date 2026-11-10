import { afterEach, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-svelte";
import Harness from "./JsonViewHarness.spec.svelte";

const DOCUMENT = {
  id: "ord-4821",
  customer: { name: "Mara Quill", city: "Lisbon" },
  items: [
    { sku: "TEA-001", qty: 2 },
    { sku: "MUG-014", qty: 1, glaze: { colour: "Slate" } },
  ],
};

const viewer = () => page.getByRole("region", { name: "JSON viewer" });
const rowElements = () => [...document.querySelectorAll<HTMLElement>("[data-line]")];
const rowText = (row: HTMLElement) => {
  const walker = document.createTreeWalker(row, NodeFilter.SHOW_TEXT);
  let text = "";
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode())
    if (/\S/.test(node.textContent ?? "")) text += node.textContent;
  return text.replace(/\u00a0/g, " ");
};
const rows = () => rowElements().map(rowText);
const rowStarting = (text: string) => rowElements().find((row) => rowText(row).startsWith(text))!;
const toggleOf = (text: string) =>
  rowStarting(text).querySelector<HTMLButtonElement>("button[aria-expanded]")!;
const focusViewer = () => (viewer().element() as HTMLElement).focus();

const stubClipboard = (writeText: (text: string) => Promise<void>) => {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
};

afterEach(() => {
  Reflect.deleteProperty(navigator, "clipboard");
});

it("renders every line of the document", async () => {
  render(Harness, { value: { a: 1, b: [true] } });

  await expect.element(viewer()).toBeVisible();
  expect(rows()).toEqual(["{", '"a": 1,', '"b": [', "true", "]", "}"]);
});

it("folds and unfolds one node", async () => {
  render(Harness, { value: DOCUMENT });

  await userEvent.click(toggleOf('"customer"'));
  await expect.poll(rows).toContain('"customer": {…}, 2');
  expect(rows()).not.toContain('"name": "Mara Quill",');
  expect(toggleOf('"customer"').getAttribute("aria-expanded")).toBe("false");

  await userEvent.click(toggleOf('"customer"'));
  await expect.poll(rows).toContain('"name": "Mara Quill",');
});

it("collapses everything below the root and expands it back", async () => {
  render(Harness, { value: DOCUMENT });

  await page.getByRole("button", { name: "Collapse all" }).click();
  await expect
    .poll(rows)
    .toEqual(["{", '"id": "ord-4821",', '"customer": {…}, 2', '"items": […] 2', "}"]);

  await page.getByRole("button", { name: "Expand all" }).click();
  await expect.poll(() => rows().length).toBe(JSON.stringify(DOCUMENT, null, 2).split("\n").length);
});

it("starts folded below collapseDepth", async () => {
  render(Harness, { value: DOCUMENT, collapseDepth: 2 });

  await expect.element(viewer()).toBeVisible();
  expect(rows()).toContain('"customer": {');
  expect(rows()).toContain("{…}, 2");
  expect(rows()).not.toContain('"sku": "TEA-001",');
});

it("folds the root itself at collapseDepth 0", async () => {
  render(Harness, { value: DOCUMENT, collapseDepth: 0 });

  await expect.element(viewer()).toBeVisible();
  expect(rows()).toEqual(["{…} 3"]);
});

it("opens its search on Ctrl+F only while it has the focus", async () => {
  render(Harness, { value: DOCUMENT });

  (page.getByRole("button", { name: "Outside" }).element() as HTMLElement).focus();
  await userEvent.keyboard("{Control>}f{/Control}");
  expect(document.querySelector("input[type=search]")).toBeNull();

  focusViewer();
  await userEvent.keyboard("{Control>}f{/Control}");

  const field = page.getByRole("searchbox", { name: "Search keys and values" });
  await expect.element(field).toHaveFocus();

  await userEvent.keyboard("{Escape}");
  expect(document.querySelector("input[type=search]")).toBeNull();
  await expect.element(viewer()).toHaveFocus();
});

it("unfolds the ancestors of the match it navigates to", async () => {
  render(Harness, { value: DOCUMENT, collapseDepth: 1 });

  focusViewer();
  await userEvent.keyboard("{Control>}f{/Control}");
  await userEvent.keyboard("slate");

  await expect.poll(rows).toContain('"colour": "Slate"');
  expect(document.querySelector("mark[data-active]")?.textContent).toBe("Slate");
  await expect.element(page.getByRole("status")).toHaveTextContent("1 of 1");
  expect(rows()).toContain('"customer": {…}, 2');
});

it("walks the matches with Enter and Shift+Enter, wrapping at the ends", async () => {
  render(Harness, { value: DOCUMENT, collapseDepth: 1 });

  focusViewer();
  await userEvent.keyboard("{Control>}f{/Control}");
  await userEvent.keyboard("sku");

  const status = page.getByRole("status");
  await expect.element(status).toHaveTextContent("1 of 2");

  await userEvent.keyboard("{Enter}");
  await expect.element(status).toHaveTextContent("2 of 2");
  await expect.poll(rows).toContain('"sku": "MUG-014",');

  await userEvent.keyboard("{Enter}");
  await expect.element(status).toHaveTextContent("1 of 2");

  await userEvent.keyboard("{Shift>}{Enter}{/Shift}");
  await expect.element(status).toHaveTextContent("2 of 2");
});

it("says when nothing matches", async () => {
  render(Harness, { value: DOCUMENT });

  await page.getByRole("button", { name: "Search", exact: true }).click();
  await userEvent.keyboard("zebra");

  await expect.element(page.getByRole("status")).toHaveTextContent("No matches");
  await expect.element(page.getByRole("button", { name: "Next match" })).toBeDisabled();
});

it("copies the whole document as JSON.stringify prints it", async () => {
  const writeText = vi.fn((_: string) => Promise.resolve());
  stubClipboard(writeText);
  render(Harness, { value: DOCUMENT, collapseDepth: 1 });

  await page.getByRole("button", { name: "Copy JSON" }).click();

  expect(writeText).toHaveBeenCalledWith(JSON.stringify(DOCUMENT, null, 2));
  await expect.element(page.getByRole("button", { name: "Copied" })).toBeVisible();
});

it("stays quiet when the clipboard refuses the write", async () => {
  const rejections: unknown[] = [];
  const onRejection = (event: PromiseRejectionEvent) => rejections.push(event.reason);
  window.addEventListener("unhandledrejection", onRejection);
  const writeText = vi.fn((_: string) =>
    Promise.reject(new DOMException("Denied", "NotAllowedError")),
  );
  stubClipboard(writeText);
  render(Harness, { value: DOCUMENT });

  await page.getByRole("button", { name: "Copy JSON" }).click();
  await new Promise((resolve) => setTimeout(resolve, 50));
  window.removeEventListener("unhandledrejection", onRejection);

  expect(writeText).toHaveBeenCalledOnce();
  expect(rejections).toEqual([]);
  await expect.element(page.getByRole("button", { name: "Copy JSON" })).toBeVisible();
});

it("stays quiet when there is no clipboard at all", async () => {
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined });
  render(Harness, { value: DOCUMENT });

  await page.getByRole("button", { name: "Copy JSON" }).click();

  await expect.element(page.getByRole("button", { name: "Copy JSON" })).toBeVisible();
});

it("copies a selection from the model, expanding what is folded", async () => {
  render(Harness, { value: DOCUMENT });

  await userEvent.click(toggleOf('"customer"'));
  await expect.poll(rows).toContain('"customer": {…}, 2');

  const start = rowStarting('"id"');
  const end = rowStarting('"customer"');
  const selection = getSelection()!;
  const range = document.createRange();
  range.setStart(start, 0);
  range.setEnd(end, end.childNodes.length);
  selection.removeAllRanges();
  selection.addRange(range);

  const clipboardData = new DataTransfer();
  const event = new ClipboardEvent("copy", { clipboardData, bubbles: true, cancelable: true });
  end.dispatchEvent(event);

  expect(event.defaultPrevented).toBe(true);
  expect(clipboardData.getData("text/plain")).toBe(
    '"id": "ord-4821",\n  "customer": {\n    "name": "Mara Quill",\n    "city": "Lisbon"\n  },',
  );
});

it("slices the endpoint rows by character when a selection starts and ends mid-token", async () => {
  render(Harness, { value: DOCUMENT });

  await expect.element(viewer()).toBeVisible();
  const value = rowStarting('"name"').querySelector('[data-part="value"]')!.firstChild!;
  const key = rowStarting('"city"').querySelector('[data-part="name"]')!.firstChild!;
  const range = document.createRange();
  range.setStart(value, 1);
  range.setEnd(key, 3);
  getSelection()!.removeAllRanges();
  getSelection()!.addRange(range);

  const clipboardData = new DataTransfer();
  rowStarting('"name"').dispatchEvent(
    new ClipboardEvent("copy", { clipboardData, bubbles: true, cancelable: true }),
  );

  expect(clipboardData.getData("text/plain")).toBe('Mara Quill",\n    "ci');
});

it("reports the path and the value of what is clicked", async () => {
  const onselect = vi.fn();
  render(Harness, { value: DOCUMENT, onselect });

  await page.getByText('"MUG-014"').click();
  expect(onselect).toHaveBeenCalledWith("/items/1/sku", "MUG-014");

  await page.getByText('"glaze"').click();
  expect(onselect).toHaveBeenLastCalledWith("/items/1/glaze", { colour: "Slate" });
});

it("shows a Date as its ISO string and a cycle as a marker", async () => {
  const node: Record<string, unknown> = { at: new Date("2026-03-04T05:06:07.000Z") };
  node.self = node;
  render(Harness, { value: node });

  await expect.element(viewer()).toBeVisible();
  expect(rows()).toEqual(["{", '"at": "2026-03-04T05:06:07.000Z",', '"self": [Circular]', "}"]);
});

it("takes its words from labels", async () => {
  const node: Record<string, unknown> = {};
  node.loop = node;
  render(Harness, {
    value: node,
    labels: { region: "Visualizador", copy: "Copiar", circular: "<ciclo>" },
  });

  await expect.element(page.getByRole("region", { name: "Visualizador" })).toBeVisible();
  await expect.element(page.getByRole("button", { name: "Copiar" })).toBeVisible();
  expect(rows()).toContain('"loop": <ciclo>');
});

it("says so when there is nothing to show", async () => {
  render(Harness, { value: undefined });

  await expect.element(page.getByText("Nothing to show")).toBeVisible();
  await expect.element(page.getByRole("button", { name: "Copy JSON" })).toBeDisabled();
});
