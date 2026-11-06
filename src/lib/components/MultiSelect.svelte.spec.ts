import { expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-svelte";
import Harness from "./MultiSelectHarness.spec.svelte";
import "../../routes/layout.css";

const PEOPLE = [
  { value: "ada", label: "Ada Lovelace" },
  { value: "alan", label: "Alan Turing" },
  { value: "grace", label: "Grace Hopper" },
  { value: "edsger", label: "Edsger Dijkstra", disabled: true },
  { value: "barbara", label: "Barbara Liskov" },
];

const field = () => page.getByRole("combobox", { name: "People" });
const search = () => page.getByRole("combobox", { name: "Search…" });
const panelOpen = () => document.querySelector("[popover]")?.matches(":popover-open") ?? false;
const chips = () =>
  [...document.querySelectorAll<HTMLElement>(".plinth-multiselect > span.z-1")].map(
    (chip) => chip.textContent?.trim() ?? "",
  );
const checked = () =>
  [...document.querySelectorAll('[role="option"][aria-selected="true"]')].map(
    (row) => row.textContent?.replace("✓", "").trim() ?? "",
  );
const form = () => page.getByTestId("form").element() as HTMLFormElement;

it("shows the placeholder until something is picked", async () => {
  render(Harness, { options: PEOPLE });

  await expect.element(page.getByText("Select…")).toBeVisible();
  expect(chips()).toEqual([]);
});

it("opens onto a search box that has the focus, with the picks checked", async () => {
  render(Harness, { options: PEOPLE, value: ["grace", "ada"] });

  await field().click();

  await expect.poll(panelOpen).toBe(true);
  await expect.element(search()).toHaveFocus();
  expect(checked()).toEqual(["Ada Lovelace", "Grace Hopper"]);
  expect(chips()).toEqual(["Grace Hopper", "Ada Lovelace"]);
});

it("checks and unchecks rows without closing the list", async () => {
  const onchange = vi.fn();
  render(Harness, { options: PEOPLE, onchange });

  await field().click();
  await expect.element(search()).toHaveFocus();

  await userEvent.keyboard("{ArrowDown}{Enter}");
  await page.getByRole("option", { name: "Barbara Liskov" }).click();
  expect(chips()).toEqual(["Alan Turing", "Barbara Liskov"]);
  expect(panelOpen()).toBe(true);

  await page.getByRole("option", { name: "Alan Turing" }).click();
  expect(chips()).toEqual(["Barbara Liskov"]);
  expect(onchange).toHaveBeenLastCalledWith(["barbara"]);
  expect(panelOpen()).toBe(true);
});

it("filters by every word typed", async () => {
  render(Harness, { options: PEOPLE });

  await field().click();
  await search().fill("hop gra");

  await expect.poll(() => page.getByRole("option").all()).toHaveLength(1);
  await userEvent.keyboard("{Enter}");
  expect(chips()).toEqual(["Grace Hopper"]);
});

it("removes a pick from its chip and gives the focus back to the field", async () => {
  render(Harness, { options: PEOPLE, value: ["ada", "alan"] });

  await page.getByRole("button", { name: "Remove Ada Lovelace" }).click();

  expect(chips()).toEqual(["Alan Turing"]);
  await expect.element(field()).toHaveFocus();
});

it("locks a picked disabled option: no remove button, and no unchecking it", async () => {
  render(Harness, { options: PEOPLE, value: ["edsger", "ada"] });

  expect(document.querySelector('[aria-label="Remove Edsger Dijkstra"]')).toBeNull();

  await field().click();
  await page.getByRole("option", { name: "Edsger Dijkstra" }).click({ force: true });
  expect(chips()).toEqual(["Edsger Dijkstra", "Ada Lovelace"]);
});

it("removes the last pick that is not locked on Backspace", async () => {
  render(Harness, { options: PEOPLE, value: ["ada", "edsger"] });

  (field().element() as HTMLElement).focus();
  await userEvent.keyboard("{Backspace}");
  expect(chips()).toEqual(["Edsger Dijkstra"]);

  await userEvent.keyboard("{Backspace}");
  expect(chips()).toEqual(["Edsger Dijkstra"]);
});

it("opens from the arrows on the field, and Escape hands the focus back", async () => {
  render(Harness, { options: PEOPLE });

  (field().element() as HTMLElement).focus();
  await userEvent.keyboard("{ArrowDown}");
  await expect.element(search()).toHaveFocus();
  await expect.element(field()).toHaveAttribute("aria-expanded", "true");

  await userEvent.keyboard("{Escape}");
  await expect.poll(panelOpen).toBe(false);
  await expect.element(field()).toHaveFocus();
});

it("closes once the focus leaves the field", async () => {
  render(Harness, { options: PEOPLE });

  await field().click();
  await expect.element(search()).toHaveFocus();

  (page.getByRole("button", { name: "Elsewhere" }).element() as HTMLElement).focus();
  await expect.poll(panelOpen).toBe(false);
});

it("submits one entry per pick under its name", async () => {
  render(Harness, { options: PEOPLE, value: ["grace", "ada"] });

  expect(new FormData(form()).getAll("people")).toEqual(["grace", "ada"]);
});

it("blocks the form while nothing is picked when required", async () => {
  const screen = render(Harness, { options: PEOPLE, required: true });

  expect(form().checkValidity()).toBe(false);

  await screen.rerender({ value: ["alan"] });
  expect(form().checkValidity()).toBe(true);
});

it("holds a place for picks whose options have not arrived while loading", async () => {
  render(Harness, { options: [], value: ["ada"], loading: true });

  expect(chips()).toEqual([]);
  expect(document.querySelectorAll(".plinth-multiselect .skeleton")).toHaveLength(1);
  expect(document.querySelector(".plinth-multiselect .loading")).not.toBeNull();
});

it("leaves the picks alone while disabled", async () => {
  render(Harness, { options: PEOPLE, value: ["ada"], disabled: true });

  await expect.element(field()).toBeDisabled();
  expect(document.querySelector('[aria-label="Remove Ada Lovelace"]')).toBeNull();
});
