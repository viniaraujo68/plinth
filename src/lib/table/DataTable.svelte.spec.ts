import { expect, it } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-svelte";
import DataTable from "./DataTable.svelte";
import Harness from "./DataTableHarness.spec.svelte";
// The `.table` cell borders the card form has to clear come from outside the component, so the
// stylesheet that draws them has to be in the page for a spec to see them at all.
import "../theme/theme.css";

const NARROW = "20rem";

const header = (name: string) => page.getByRole("columnheader", { name });
const headerElement = (name: string) =>
  [...document.querySelectorAll("th")].find((th) => th.textContent?.trim().startsWith(name));
const rowElements = () => [...document.querySelectorAll<HTMLTableRowElement>("tbody tr")];
const names = () => rowElements().map((row) => row.querySelector("td")?.textContent?.trim());
const sortState = () => document.querySelector("[data-testid='sort-state']")?.textContent;

it("starts in the order the rows arrived in", async () => {
  render(Harness);

  expect(names()).toEqual(["Rust", "Python", "TypeScript"]);
  await expect.element(header("Language")).toHaveAttribute("aria-sort", "none");
});

// The uncontrolled mode: a plain `sort` prop is an initial order, and the table takes it from
// there. Binding is what a parent adds when it wants to read the order back or share it.
it("takes over a sort prop the parent did not bind", async () => {
  // `render` cannot infer the component's row type from a props object, so it is pinned here.
  render(DataTable<{ id: string; name: string }>, {
    rows: [
      { id: "b", name: "Beta" },
      { id: "a", name: "Alpha" },
    ],
    columns: [{ key: "name", label: "Name" }],
    rowKey: (row) => row.id,
    sort: { key: "name", direction: "desc" },
  });

  expect(names()).toEqual(["Beta", "Alpha"]);

  await page.getByRole("button", { name: "Name" }).click();

  expect(names()).toEqual(["Alpha", "Beta"]);
});

it("cycles a header between the two directions", async () => {
  render(Harness);

  await page.getByRole("button", { name: "Language" }).click();
  expect(names()).toEqual(["Python", "Rust", "TypeScript"]);
  await expect.element(header("Language")).toHaveAttribute("aria-sort", "ascending");
  expect(sortState()).toBe("name:asc");

  await page.getByRole("button", { name: "Language" }).click();
  expect(names()).toEqual(["TypeScript", "Rust", "Python"]);
  await expect.element(header("Language")).toHaveAttribute("aria-sort", "descending");

  // No third, unsorted step: the header goes back where it started.
  await page.getByRole("button", { name: "Language" }).click();
  await expect.element(header("Language")).toHaveAttribute("aria-sort", "ascending");
});

it("opens a numeric column on its largest value and clears the previous header", async () => {
  render(Harness, { initialSort: { key: "name", direction: "asc" } });

  await page.getByRole("button", { name: "Year" }).click();

  expect(names()).toEqual(["TypeScript", "Rust", "Python"]);
  await expect.element(header("Year")).toHaveAttribute("aria-sort", "descending");
  await expect.element(header("Language")).toHaveAttribute("aria-sort", "none");
});

it("gives an unsortable column no button and no aria-sort", async () => {
  render(Harness);

  expect(page.getByRole("button", { name: "Actions" }).elements()).toHaveLength(0);
  expect(headerElement("Actions")?.hasAttribute("aria-sort")).toBe(false);
});

it("renders a column's cell snippet in place of the raw value", async () => {
  render(Harness);

  await expect.element(page.getByTestId("typing-badge").first()).toHaveTextContent("STATIC");
});

// The keyed `{#each}` is the whole reason `rowKey` exists: re-sorting has to move the markup, not
// rebuild it, or every cell's state -- an open menu, a focused input, a running transition -- dies
// on each click.
it("moves existing rows rather than recreating them when the sort changes", async () => {
  render(Harness);

  const before = rowElements();
  const python = before[1];

  await page.getByRole("button", { name: "Language" }).click();

  const after = rowElements();
  expect(names()).toEqual(["Python", "Rust", "TypeScript"]);
  expect(after[0]).toBe(python);
  expect(after[1]).toBe(before[0]);
});

it("renders the empty snippet, with the headers still there to sort by", async () => {
  render(Harness, { rows: [] });

  await expect.element(page.getByTestId("empty")).toBeInTheDocument();
  expect(rowElements()).toHaveLength(1);
  await expect.element(header("Language")).toBeInTheDocument();
});

it("calls back with the row that was clicked", async () => {
  render(Harness);

  await rowElements()[2].click();

  await expect.element(page.getByTestId("clicked")).toHaveTextContent("ts");
});

it("keeps table cells in table form in a wide container", () => {
  render(Harness);

  const cell = document.querySelector<HTMLElement>("tbody td");

  expect(cell && getComputedStyle(cell).display).toBe("table-cell");
});

// No resize listener anywhere: the only thing that changed is the width of the box the table sits
// in, and the container query does the rest.
it("switches to card form in a narrow container", () => {
  render(Harness, { width: NARROW });

  const cell = document.querySelector<HTMLElement>("tbody .plinth-cell");
  const row = document.querySelector<HTMLElement>("tbody tr");

  expect(cell && getComputedStyle(cell).display).toBe("flex");
  expect(row && getComputedStyle(row).display).toBe("block");
  // The label the header used to carry travels with the value.
  expect(cell && getComputedStyle(cell, "::before").content).toContain("Language");
});

it("keeps the sort headers reachable as pills in card form", async () => {
  render(Harness, { width: NARROW });

  const strip = document.querySelector<HTMLElement>("thead tr");
  expect(strip && getComputedStyle(strip).display).toBe("flex");

  await page.getByRole("button", { name: "Year" }).click();

  expect(names()).toEqual(["TypeScript", "Rust", "Python"]);
});

it("swaps the label/value pairs for a card snippet when one is given", () => {
  render(Harness, { width: NARROW, withCard: true });

  const card = document.querySelector<HTMLElement>(".plinth-card");
  const cell = document.querySelector<HTMLElement>("tbody .plinth-cell");

  expect(card && getComputedStyle(card).display).toBe("block");
  expect(cell && getComputedStyle(cell).display).toBe("none");
  expect(document.querySelectorAll("[data-testid='language-card']")).toHaveLength(3);
});

it("hides the card snippet in table form", () => {
  render(Harness, { withCard: true });

  const card = document.querySelector<HTMLElement>(".plinth-card");

  expect(card && getComputedStyle(card).display).toBe("none");
});

// daisyUI rules `.table` cells with a border-bottom that separates rows of a grid. In card form
// there is no grid left to separate, so the rule reads as a hairline under every sort pill and a
// line drawn through the middle of every card.
it("clears daisyUI's cell borders in card form", () => {
  render(Harness, { width: NARROW });

  const pill = document.querySelector<HTMLElement>("thead .plinth-head.plinth-sortable");
  const cell = document.querySelector<HTMLElement>("tbody .plinth-cell");

  expect(pill && getComputedStyle(pill).borderBottomWidth).toBe("0px");
  expect(cell && getComputedStyle(cell).borderBottomWidth).toBe("0px");
});

it("clears them off the card cell too", () => {
  render(Harness, { width: NARROW, withCard: true });

  const card = document.querySelector<HTMLElement>("tbody .plinth-card");

  expect(card && getComputedStyle(card).borderBottomWidth).toBe("0px");
});

it("leaves daisyUI's cell borders alone in table form", () => {
  render(Harness);

  const head = document.querySelector<HTMLElement>("thead .plinth-head");
  // daisyUI draws the rule on every row but the last, so the first one is the one to read.
  const cell = document.querySelector<HTMLElement>("tbody tr:first-child .plinth-cell");

  expect(head && getComputedStyle(head).borderBottomWidth).not.toBe("0px");
  expect(cell && getComputedStyle(cell).borderBottomWidth).not.toBe("0px");
});

// The whole point of the second argument: a rank column cannot be built from the row alone, and
// re-running `sortRows` outside the table to find the position is what it replaces.
it("gives a cell snippet the row's position in the sorted order", async () => {
  render(Harness, { withRank: true });

  const ranks = () =>
    rowElements().map((row) => row.querySelector("[data-label='Rank']")?.textContent?.trim());
  const pairs = () =>
    rowElements().map(
      (row) =>
        `${row.querySelector("[data-label='Rank']")?.textContent?.trim()}:${row
          .querySelector("[data-label='Language']")
          ?.textContent?.trim()}`,
    );

  expect(pairs()).toEqual(["1:Rust", "2:Python", "3:TypeScript"]);

  await page.getByRole("button", { name: "Language" }).click();

  // The positions stayed 1..3 and it is the rows that moved under them.
  expect(ranks()).toEqual(["1", "2", "3"]);
  expect(pairs()).toEqual(["1:Python", "2:Rust", "3:TypeScript"]);
});

it("gives a card snippet the same position", async () => {
  render(Harness, { width: NARROW, withCard: true });

  const cards = () =>
    [...document.querySelectorAll("[data-testid='language-card']")].map((card) =>
      card.textContent?.trim(),
    );

  expect(cards()).toEqual(["1. Rust (2010)", "2. Python (1991)", "3. TypeScript (2012)"]);

  await page.getByRole("button", { name: "Language" }).click();

  expect(cards()).toEqual(["1. Python (1991)", "2. Rust (2010)", "3. TypeScript (2012)"]);
});

// One button serves both forms, so the label reaches the card-form pills for free -- which is the
// half that would otherwise be silently missed, since the pill is the only sort control on a phone.
it("names the sort control from sortLabel in both forms", async () => {
  render(Harness, { withSortLabel: true });

  await expect.element(page.getByRole("button", { name: "Sort by Language" })).toBeInTheDocument();
  await expect.element(page.getByRole("button", { name: "Sort by Year" })).toBeInTheDocument();
});

it("names the card-form sort pills from sortLabel too", async () => {
  render(Harness, { width: NARROW, withSortLabel: true });

  const pill = page.getByRole("button", { name: "Sort by Year" });
  await expect.element(pill).toBeInTheDocument();

  await pill.click();

  expect(names()).toEqual(["TypeScript", "Rust", "Python"]);
});

it("leaves the sort control named by its own label when sortLabel is absent", async () => {
  render(Harness);

  const button = document.querySelector<HTMLElement>(".plinth-sort");

  expect(button?.hasAttribute("aria-label")).toBe(false);
  await expect.element(page.getByRole("button", { name: "Language" })).toBeInTheDocument();
});
