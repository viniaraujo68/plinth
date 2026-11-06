import { expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-svelte";
import Harness from "./ListboxHarness.spec.svelte";
import "../../routes/layout.css";

const MONTHS = [
  { value: "jan", label: "January" },
  { value: "feb", label: "February", disabled: true },
  { value: "mar", label: "March" },
  { value: "apr", label: "April" },
  { value: "may", label: "May" },
];

const list = () => page.getByRole("listbox", { name: "Months" });
const listElement = () => list().element() as HTMLElement;
const picked = () => JSON.parse(page.getByTestId("picked").element().textContent ?? "null");
const activeLabel = () => {
  const id = document
    .querySelector("[aria-activedescendant]")
    ?.getAttribute("aria-activedescendant");
  return id ? document.getElementById(id)?.textContent?.replace("✓", "").trim() : undefined;
};
const checkedLabels = () =>
  [...document.querySelectorAll('[role="option"][aria-selected="true"]')].map(
    (row) => row.textContent?.replace("✓", "").trim() ?? "",
  );

it("checks the selected row and starts the highlight on it", async () => {
  render(Harness, { options: MONTHS, value: "mar" });

  expect(checkedLabels()).toEqual(["March"]);
  expect(activeLabel()).toBe("March");
  expect(listElement().getAttribute("aria-multiselectable")).toBeNull();
});

it("walks the rows from the keyboard, over disabled ones, and picks with Enter", async () => {
  render(Harness, { options: MONTHS });

  listElement().focus();
  expect(activeLabel()).toBe("January");

  await userEvent.keyboard("{ArrowDown}");
  expect(activeLabel()).toBe("March");
  await userEvent.keyboard("{ArrowUp}");
  expect(activeLabel()).toBe("January");
  await userEvent.keyboard("{End}");
  expect(activeLabel()).toBe("May");
  await userEvent.keyboard("{Home}");
  expect(activeLabel()).toBe("January");

  await userEvent.keyboard("{ArrowDown}{Enter}");
  expect(picked()).toBe("mar");
  expect(checkedLabels()).toEqual(["March"]);
});

it("picks with Space when no prefix is being typed", async () => {
  render(Harness, { options: MONTHS });

  listElement().focus();
  await userEvent.keyboard("{ArrowDown} ");

  expect(picked()).toBe("mar");
});

it("jumps to a typed prefix and cycles on a repeated letter", async () => {
  render(Harness, { options: MONTHS });

  listElement().focus();
  await userEvent.keyboard("m");
  expect(activeLabel()).toBe("March");
  await userEvent.keyboard("m");
  expect(activeLabel()).toBe("May");
  await userEvent.keyboard("f");
  expect(activeLabel()).toBe("May");
});

it("picks on a click and ignores a click on a disabled row", async () => {
  render(Harness, { options: MONTHS });

  await page.getByRole("option", { name: "April" }).click();
  expect(picked()).toBe("apr");

  await page.getByRole("option", { name: "February" }).click({ force: true });
  expect(picked()).toBe("apr");
});

it("filters by every word typed in the search box, which keeps the focus", async () => {
  render(Harness, {
    options: [
      { value: "1", label: "Otávio Rocha" },
      { value: "2", label: "Otávio Lima" },
      { value: "3", label: "Ana Rocha" },
    ],
    searchable: true,
  });

  const search = page.getByRole("combobox", { name: "Search…" });
  await search.fill("rocha ota");

  await expect.poll(() => page.getByRole("option").all()).toHaveLength(1);
  expect(activeLabel()).toBe("Otávio Rocha");

  await userEvent.keyboard("{Enter}");
  expect(picked()).toBe("1");
  await expect.element(search).toHaveFocus();
});

it("finds a row by the text searchText hands it", async () => {
  render(Harness, {
    options: [
      { value: "12345678000199", label: "Acme — 12.345.678/0001-99" },
      { value: "98765432000155", label: "Globex — 98.765.432/0001-55" },
    ],
    searchable: true,
    searchText: (option: { value: string; label: string }) => `${option.label} ${option.value}`,
  });

  await page.getByRole("combobox").fill("98765");

  await expect.poll(() => page.getByRole("option").all()).toHaveLength(1);
  await expect.element(page.getByRole("option")).toHaveTextContent("Globex");
});

it("says so when nothing matches, and while it is loading", async () => {
  const screen = render(Harness, { options: MONTHS, searchable: true });

  await page.getByRole("combobox").fill("zzz");
  await expect.element(page.getByRole("status")).toHaveTextContent("No matches");

  await screen.rerender({ options: [], loading: true });
  await expect.element(page.getByRole("status")).toHaveTextContent("Loading…");
  expect(listElement().getAttribute("aria-busy")).toBe("true");
});

it("checks several rows for an array value, and keeps the highlight across picks", async () => {
  render(Harness, { options: MONTHS, value: ["jan", "may"] });

  expect(listElement().getAttribute("aria-multiselectable")).toBe("true");
  expect(checkedLabels()).toEqual(["January", "May"]);

  listElement().focus();
  await userEvent.keyboard("{ArrowDown}{ArrowDown}{Enter}");
  expect(picked()).toEqual(["jan", "may", "apr"]);
  expect(activeLabel()).toBe("April");

  await userEvent.keyboard("{Enter}");
  expect(picked()).toEqual(["jan", "may"]);
  expect(activeLabel()).toBe("April");
});

it("drops the check marks for a list of actions", async () => {
  render(Harness, { options: MONTHS, value: "mar", checkmarks: false });

  expect(listElement().textContent).not.toContain("✓");
});
