import { expect, it } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-svelte";
import Harness from "./FilterTableHarness.spec.svelte";
import "../theme/theme.css";

const rowElements = () => [...document.querySelectorAll<HTMLTableRowElement>("tbody tr")];
const players = () =>
  rowElements().map((row) => row.querySelectorAll("td")[1]?.textContent?.trim());
const ranks = () => rowElements().map((row) => row.querySelectorAll("td")[0]?.textContent?.trim());
const output = (id: string) => document.querySelector(`[data-testid='${id}']`)?.textContent;
const filters = () => JSON.parse(output("filters") ?? "null") as unknown;
const field = (name: string) =>
  page.getByRole("list", { name: "Fields" }).getByRole("button", { name });
const addFilter = () => page.getByRole("button", { name: "Filter", exact: true }).last();
const apply = () => page.getByRole("button", { name: "Apply", exact: true });

const addNumberRule = async (name: string, operator: string, value: string) => {
  await field(name).click();
  await page
    .getByRole("group", { name: `${name} comparison` })
    .getByRole("button", { name: operator })
    .click();
  await page.getByRole("spinbutton", { name: "Value" }).fill(value);
  await apply().click();
};

it("adds a numeric rule from the chip bar and filters the rows", async () => {
  render(Harness);

  await addFilter().click();
  await addNumberRule("Goals", "≥", "6");

  expect(players()).toEqual(["Duda", "Ana", "Edu"]);
  await expect.element(page.getByRole("button", { name: "Edit filter Goals ≥ 6" })).toBeVisible();
  expect(filters()).toEqual({
    combinator: "and",
    children: [{ key: "goals", operator: "gte", value: 6 }],
  });
});

it("filters by a set of picked players", async () => {
  render(Harness);

  await addFilter().click();
  await field("Player").click();
  await page.getByRole("option", { name: "Bia" }).click();
  await page.getByRole("option", { name: "Caio" }).click();
  await apply().click();

  expect(players()).toEqual(["Caio", "Bia"]);
  await expect
    .element(page.getByRole("button", { name: "Edit filter Player is Bia, Caio" }))
    .toBeVisible();
});

it("switches the root between and and or from the connector", async () => {
  render(Harness, {
    initialFilters: {
      combinator: "and",
      children: [
        { key: "goals", operator: "gte", value: 10 },
        { key: "assists", operator: "gte", value: 10 },
      ],
    },
  });
  expect(document.querySelector("tbody")?.textContent).toContain("No data");

  await page.getByRole("button", { name: "Match any of these" }).click();

  expect(players()).toEqual(["Duda", "Bia"]);
  await expect.element(page.getByRole("button", { name: "Match all of these" })).toBeVisible();
});

it("builds an or-group next to an and-rule", async () => {
  render(Harness);

  await addFilter().click();
  await addNumberRule("Matches", "≥", "5");

  await page.getByRole("button", { name: "Group", exact: true }).click();
  await addNumberRule("Goals", "≥", "10");

  const group = page.getByRole("group", { name: "Filter group" });
  await group.getByRole("button", { name: "Filter", exact: true }).click();
  await addNumberRule("Assists", "≥", "4");

  expect(filters()).toEqual({
    combinator: "and",
    children: [
      { key: "matches", operator: "gte", value: 5 },
      {
        combinator: "or",
        children: [
          { key: "goals", operator: "gte", value: 10 },
          { key: "assists", operator: "gte", value: 4 },
        ],
      },
    ],
  });
  expect(players()).toEqual(["Duda", "Caio"]);
  await expect
    .element(group.getByRole("button", { name: "Edit filter Assists ≥ 4 ast" }))
    .toBeVisible();
});

it("removes a whole group", async () => {
  render(Harness, {
    initialFilters: {
      combinator: "and",
      children: [
        { key: "matches", operator: "gte", value: 10 },
        {
          combinator: "or",
          children: [
            { key: "goals", operator: "gte", value: 15 },
            { key: "assists", operator: "gte", value: 4 },
          ],
        },
      ],
    },
  });
  expect(players()).toEqual(["Duda", "Caio"]);

  await page.getByRole("button", { name: "Remove group" }).click();

  expect(players()).toEqual(["Duda", "Ana", "Caio"]);
});

it("keeps Apply disabled until the draft is a rule", async () => {
  render(Harness);

  await addFilter().click();
  await field("Matches").click();

  await expect.element(apply()).toBeDisabled();
  await page.getByRole("spinbutton", { name: "Value" }).fill("10");
  await expect.element(apply()).toBeEnabled();
});

it("edits a chip in place and removes it", async () => {
  render(Harness, {
    initialFilters: {
      combinator: "and",
      children: [{ key: "matches", operator: "gte", value: 10 }],
    },
  });
  expect(players()).toEqual(["Duda", "Ana", "Caio"]);

  await page.getByRole("button", { name: "Edit filter Matches ≥ 10" }).click();
  await page.getByRole("spinbutton", { name: "Value" }).fill("15");
  await apply().click();
  expect(players()).toEqual(["Duda", "Caio"]);

  await page.getByRole("button", { name: "Remove filter Matches ≥ 15" }).click();
  expect(players()).toHaveLength(5);
});

it("clears every rule at once", async () => {
  render(Harness, {
    initialFilters: {
      combinator: "and",
      children: [
        { key: "matches", operator: "gte", value: 10 },
        { key: "goals", operator: "gte", value: 5 },
      ],
    },
  });
  expect(players()).toEqual(["Duda", "Ana"]);

  await page.getByRole("button", { name: "Clear", exact: true }).click();

  expect(players()).toHaveLength(5);
});

it("hides the chip bar on request but still applies bound rules", async () => {
  render(Harness, {
    filterBar: false,
    initialFilters: {
      combinator: "and",
      children: [{ key: "name", operator: "in", value: ["1"] }],
    },
  });

  expect(players()).toEqual(["Ana"]);
  await expect
    .element(page.getByRole("button", { name: "Filter", exact: true }))
    .not.toBeInTheDocument();
});

it("pages the sorted rows and keeps the rank running across pages", async () => {
  render(Harness, { pageSize: 2 });

  expect(players()).toEqual(["Duda", "Ana"]);
  expect(ranks()).toEqual(["1", "2"]);

  await page.getByRole("button", { name: "Página 2" }).click();

  expect(players()).toEqual(["Edu", "Caio"]);
  expect(ranks()).toEqual(["3", "4"]);
  expect(output("page")).toBe("2");
});

it("goes back to the first page when the chip bar changes the rules", async () => {
  render(Harness, { pageSize: 2, initialPage: 3 });
  expect(players()).toEqual(["Bia"]);

  await addFilter().click();
  await addNumberRule("Matches", "≥", "5");

  expect(output("page")).toBe("1");
  expect(players()).toEqual(["Duda", "Ana"]);
});

it("clamps a page past the end instead of showing nothing", async () => {
  render(Harness, {
    pageSize: 2,
    initialPage: 9,
    initialFilters: { combinator: "and", children: [{ key: "goals", operator: "gte", value: 6 }] },
  });

  expect(players()).toEqual(["Edu"]);
});

it("shows placeholder rows while the first load is in flight", async () => {
  render(Harness, { loading: true, rows: [] });

  await expect.element(page.getByRole("table")).toHaveAttribute("aria-busy", "true");
  await expect.element(page.getByRole("progressbar", { name: "Loading…" })).toBeInTheDocument();
  expect(document.querySelectorAll("tbody tr.plinth-placeholder")).toHaveLength(5);
});

it("keeps the rows on screen while a refresh is in flight", async () => {
  render(Harness, { loading: true });

  expect(players()).toHaveLength(5);
  await expect.element(page.getByRole("progressbar", { name: "Loading…" })).toBeInTheDocument();
});

it("replaces the rows with the error and offers the retry", async () => {
  render(Harness, { error: new Error("boom"), pageSize: 2 });

  await expect.element(page.getByRole("alert")).toHaveTextContent("The rows could not be loaded.");
  await expect
    .element(page.getByRole("navigation", { name: "Pagination" }))
    .not.toBeInTheDocument();

  await page.getByRole("button", { name: "Try again" }).click();

  expect(output("retries")).toBe("1");
});
