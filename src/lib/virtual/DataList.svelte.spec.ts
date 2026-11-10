import { expect, it } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-svelte";
import Harness from "./DataListHarness.spec.svelte";

const list = () => document.querySelector<HTMLElement>(".plinth-data-list")!;
const renderedRows = () => document.querySelectorAll(".harness-item").length;
const placeholders = (status: "loading" | "error") =>
  document.querySelectorAll(`.plinth-data-placeholder[data-status="${status}"]`).length;

it("shows placeholders while the first page loads, then the rows", async () => {
  const { component } = render(Harness);

  await expect.element(page.getByRole("status", { name: "Loading" })).toBeInTheDocument();
  expect(list().getAttribute("aria-busy")).toBe("true");
  expect(renderedRows()).toBe(0);
  expect(placeholders("loading")).toBeGreaterThan(0);

  await expect.poll(() => component.pending()).toBeGreaterThan(0);
  component.answer();

  await expect.element(page.getByText("Item 0", { exact: true })).toBeInTheDocument();
  await expect.element(page.getByRole("region", { name: "Items" })).toBeInTheDocument();
  expect(page.getByRole("status", { name: "Loading" }).elements()).toHaveLength(0);
  expect(list().getAttribute("aria-busy")).toBe("false");
  expect(renderedRows()).toBeLessThan(30);
});

it("replaces the list with the error and a retry when the first page fails", async () => {
  const { component } = render(Harness, { failingPages: [0] });

  await expect.poll(() => component.pending()).toBeGreaterThan(0);
  component.answer();

  await expect.element(page.getByRole("alert")).toHaveTextContent("Some rows could not be loaded.");
  expect(renderedRows()).toBe(0);

  component.heal();
  await page.getByRole("button", { name: "Retry" }).click();
  await expect.poll(() => component.pending()).toBeGreaterThan(0);
  component.answer();

  await expect.element(page.getByText("Item 0", { exact: true })).toBeInTheDocument();
  expect(page.getByRole("alert").elements()).toHaveLength(0);
});

it("keeps the loaded rows and flags the failed page until it is retried", async () => {
  const { component } = render(Harness, { pageSize: 5, failingPages: [1], withErrorSnippet: true });

  await expect.poll(() => component.pending()).toBeGreaterThan(0);
  component.answer();
  await expect.element(page.getByText("Item 0", { exact: true })).toBeInTheDocument();
  await expect.poll(() => component.pending()).toBeGreaterThan(0);
  component.answer();

  await expect.element(page.getByTestId("failed-pages")).toHaveTextContent("1");
  expect(placeholders("error")).toBe(5);
  expect(page.getByText("Item 5", { exact: true }).elements()).toHaveLength(0);

  component.heal();
  await page.getByRole("button", { name: "Try again" }).click();
  await expect.poll(() => placeholders("loading")).toBe(5);
  await expect.poll(() => component.pending()).toBeGreaterThan(0);
  component.answer();

  await expect.element(page.getByText("Item 5", { exact: true })).toBeInTheDocument();
  expect(page.getByTestId("failed-pages").elements()).toHaveLength(0);
  expect(placeholders("error")).toBe(0);
});

it("says so when the set is empty", async () => {
  const { component } = render(Harness, { total: 0 });

  await expect.poll(() => component.pending()).toBeGreaterThan(0);
  component.answer();

  await expect.element(page.getByText("Nothing to show")).toBeInTheDocument();
  expect(renderedRows()).toBe(0);
});
