import { expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-svelte";
import Harness from "./SelectHarness.spec.svelte";
import ModalHarness from "./SelectModalHarness.spec.svelte";
import type { SelectOption } from "./select.js";

// The chrome is daisyUI's, and `.modal` is what makes a closed dialog invisible rather than
// undisplayed -- the state the modal harness reads. Without the stylesheet these tests would
// exercise a different element than the one that ships.
import "../../routes/layout.css";

// Three: below the automatic search threshold, so no field appears.
const SHORT: readonly SelectOption[] = [
  { value: "centro", label: "Centro" },
  { value: "itaipava", label: "Itaipava" },
  { value: "sao-goncalo", label: "São Gonçalo" },
];

// Eleven, the size of the filter this component was written for, with one row disabled and enough
// accents that a Portuguese search is the normal case rather than an edge one.
const LONG: readonly SelectOption[] = [
  { value: "araras", label: "Araras" },
  { value: "bingen", label: "Bingen" },
  { value: "castelanea", label: "Castelânea" },
  { value: "centro", label: "Centro" },
  { value: "correas", label: "Corrêas" },
  { value: "itaipava", label: "Itaipava" },
  { value: "mosela", label: "Mosela", disabled: true },
  { value: "nogueira", label: "Nogueira" },
  { value: "otavio-rocha", label: "Otávio Rocha" },
  { value: "quitandinha", label: "Quitandinha" },
  { value: "sao-goncalo", label: "São Gonçalo" },
];

const trigger = () => page.getByRole("combobox", { name: "Local" });
const search = () => page.getByPlaceholder("Search");
const bound = () => page.getByTestId("bound");
const options = () => page.getByRole("option");

/** A row's own label, without the ✓ the component appends to the selected one. */
const rowLabel = (row: Element | null | undefined) => row?.querySelector("span")?.textContent ?? "";

const optionLabels = () => [...document.querySelectorAll('[role="option"]')].map(rowLabel);

/** What a screen reader would read out as active: the row `aria-activedescendant` points at. */
const activeOption = () => {
  const id = document.activeElement?.getAttribute("aria-activedescendant");
  return id === null || id === undefined ? null : rowLabel(document.getElementById(id));
};

it("shows the placeholder and mounts no list until it is opened", async () => {
  render(Harness, { options: SHORT });

  await expect.element(trigger()).toHaveTextContent("Pick a local");
  await expect.element(trigger()).toHaveAttribute("aria-expanded", "false");
  expect(page.getByRole("listbox").query()).toBeNull();
});

it("opens on the trigger and closes on the trigger again", async () => {
  render(Harness, { options: SHORT });

  await trigger().click();
  await expect.element(trigger()).toHaveAttribute("aria-expanded", "true");
  await expect.element(page.getByRole("listbox")).toBeVisible();
  await expect.element(options().nth(1)).toHaveTextContent("Itaipava");

  await trigger().click();
  await expect.element(trigger()).toHaveAttribute("aria-expanded", "false");
});

it("leaves a short list without a search field", async () => {
  render(Harness, { options: SHORT });

  await trigger().click();
  await expect.element(page.getByRole("listbox")).toBeVisible();
  expect(search().query()).toBeNull();
});

it("gives a long list a search field and the focus to go with it", async () => {
  render(Harness, { options: LONG });

  await trigger().click();
  await expect.element(search()).toBeVisible();
  await expect.element(search()).toHaveFocus();
});

it("takes a search field on a short list when it is asked for one", async () => {
  render(Harness, { options: SHORT, searchable: true });

  await trigger().click();
  await expect.element(search()).toBeVisible();
});

it("goes without one on a long list when it is told to", async () => {
  render(Harness, { options: LONG, searchable: false });

  await trigger().click();
  await expect.element(page.getByRole("listbox")).toBeVisible();
  expect(search().query()).toBeNull();
});

it("filters on a substring, past the accents", async () => {
  render(Harness, { options: LONG });

  await trigger().click();
  await search().fill("otavio");

  // Unaccented input, accented label -- the case native type-ahead cannot do at all.
  await expect.poll(optionLabels).toEqual(["Otávio Rocha"]);

  await search().fill("correas");
  await expect.poll(optionLabels).toEqual(["Corrêas"]);

  // And in the middle of the label, which prefix-only type-ahead also cannot do.
  await search().fill("rocha");
  await expect.poll(optionLabels).toEqual(["Otávio Rocha"]);
});

it("shows the empty state when nothing matches", async () => {
  render(Harness, { options: LONG });

  await trigger().click();
  await search().fill("zzz");

  await expect.poll(() => options().elements().length).toBe(0);
  await expect.element(page.getByText("No matches")).toBeVisible();
});

it("takes a custom filter in place of the default matching", async () => {
  // Value-prefix matching: nothing the default would ever do, and the label is ignored entirely.
  const filter = (option: SelectOption, query: string) => option.value.startsWith(query);
  render(Harness, { options: LONG, filter });

  await trigger().click();
  await search().fill("sao");
  await expect.poll(optionLabels).toEqual(["São Gonçalo"]);

  await search().fill("Otávio");
  await expect.poll(optionLabels).toEqual([]);
});

it("moves the highlight with the arrows and jumps with Home and End", async () => {
  render(Harness, { options: LONG });

  await trigger().click();
  await expect.poll(activeOption).toBe("Araras");

  await userEvent.keyboard("{ArrowDown}{ArrowDown}");
  await expect.poll(activeOption).toBe("Castelânea");

  await userEvent.keyboard("{ArrowUp}");
  await expect.poll(activeOption).toBe("Bingen");

  await userEvent.keyboard("{End}");
  await expect.poll(activeOption).toBe("São Gonçalo");

  await userEvent.keyboard("{Home}");
  await expect.poll(activeOption).toBe("Araras");
});

it("steps over a disabled option instead of landing on it", async () => {
  render(Harness, { options: LONG, searchable: false });

  await trigger().click();
  // The trigger keeps the focus when there is no search field, so it is the trigger that has to
  // carry `aria-activedescendant`.
  await expect.element(trigger()).toHaveFocus();
  await expect.poll(activeOption).toBe("Araras");

  // Mosela sits between Itaipava and Nogueira and is disabled.
  await userEvent.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}");
  await expect.poll(activeOption).toBe("Itaipava");

  await userEvent.keyboard("{ArrowDown}");
  await expect.poll(activeOption).toBe("Nogueira");

  await userEvent.keyboard("{ArrowUp}");
  await expect.poll(activeOption).toBe("Itaipava");
});

it("selects with Enter and writes through the binding", async () => {
  render(Harness, { options: LONG });

  await trigger().click();
  await search().fill("itaipava");
  await expect.poll(activeOption).toBe("Itaipava");

  await userEvent.keyboard("{Enter}");

  await expect.element(bound()).toHaveTextContent("itaipava");
  await expect.element(page.getByTestId("changes")).toHaveTextContent("1");
  await expect.element(trigger()).toHaveTextContent("Itaipava");
  await expect.element(trigger()).toHaveAttribute("aria-expanded", "false");
  await expect.element(trigger()).toHaveFocus();
});

it("selects with the mouse, and follows the mouse while it moves", async () => {
  render(Harness, { options: SHORT });

  await trigger().click();
  await options().nth(2).hover();
  await expect.poll(activeOption).toBe("São Gonçalo");

  await options().nth(2).click();
  await expect.element(bound()).toHaveTextContent("sao-goncalo");
  await expect.element(trigger()).toHaveAttribute("aria-expanded", "false");
  await expect.element(trigger()).toHaveFocus();
});

it("marks the selected row and reopens on it", async () => {
  render(Harness, { options: LONG, value: "nogueira" });

  await expect.element(trigger()).toHaveTextContent("Nogueira");

  await trigger().click();
  await expect.poll(activeOption).toBe("Nogueira");
  await expect
    .element(page.getByRole("option", { name: "Nogueira" }))
    .toHaveAttribute("aria-selected", "true");
});

it("closes on Escape and gives the focus back to the trigger", async () => {
  render(Harness, { options: LONG });

  await trigger().click();
  await expect.element(search()).toHaveFocus();

  await userEvent.keyboard("{Escape}");

  await expect.element(trigger()).toHaveAttribute("aria-expanded", "false");
  await expect.element(trigger()).toHaveFocus();
  await expect.element(bound()).toHaveTextContent("none");
});

it("closes on Tab and lets the focus carry on past the trigger", async () => {
  render(Harness, { options: LONG });

  await trigger().click();
  await expect.element(search()).toHaveFocus();

  await userEvent.keyboard("{Tab}");

  await expect.element(trigger()).toHaveAttribute("aria-expanded", "false");
  await expect.element(page.getByTestId("after")).toHaveFocus();
});

it("clears the selection through the clear button", async () => {
  render(Harness, { options: SHORT, value: "centro", clearable: true });

  const clear = page.getByRole("button", { name: "Clear selection" });
  await expect.element(clear).toBeVisible();

  await clear.click();

  await expect.element(bound()).toHaveTextContent("none");
  await expect.element(trigger()).toHaveTextContent("Pick a local");
  // No blank row was ever offered in its place -- clearing is the ✕ and nothing else.
  await trigger().click();
  await expect.poll(optionLabels).toEqual(["Centro", "Itaipava", "São Gonçalo"]);
});

it("offers no clear button while there is nothing to clear", async () => {
  render(Harness, { options: SHORT, clearable: true });

  expect(page.getByRole("button", { name: "Clear selection" }).query()).toBeNull();
});

it("renders a row through the option snippet", async () => {
  render(Harness, { options: SHORT, withOptionSnippet: true });

  await trigger().click();
  await expect.element(page.getByTestId("custom-row").first()).toHaveTextContent("CENTRO");

  // The trigger keeps showing the plain label: the snippet describes a row, not the control.
  await options().nth(0).click();
  await expect.element(trigger()).toHaveTextContent("Centro");
});

it("does not open while it is disabled", async () => {
  render(Harness, { options: SHORT, disabled: true });

  await expect.element(trigger()).toBeDisabled();

  // Driven straight at the element: a disabled button swallows the click on its own, and the
  // keydown is the half the browser would still deliver if the trigger were focusable.
  const element = document.querySelector<HTMLButtonElement>('[role="combobox"]')!;
  element.click();
  element.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));

  await expect.element(trigger()).toHaveAttribute("aria-expanded", "false");
  expect(page.getByRole("listbox").query()).toBeNull();
});

it("submits the selection with the form when it is given a name", async () => {
  render(Harness, { options: SHORT, value: "itaipava", name: "local" });

  const form = document.querySelector<HTMLFormElement>('[data-testid="form"]')!;
  expect(new FormData(form).get("local")).toBe("itaipava");

  await page.getByRole("combobox").click();
  await options().nth(0).click();
  await expect.poll(() => new FormData(form).get("local")).toBe("centro");
});

it("opens above a modal, keeps the focus and writes through from inside it", async () => {
  render(ModalHarness, { options: LONG });

  await page.getByTestId("opener").click();
  await expect.element(page.getByRole("dialog", { name: "Filters" })).toBeVisible();

  await trigger().click();
  // The panel is a popover, so it joins the top layer ABOVE the modal that is already in it --
  // the whole reason there is no z-index anywhere in this component.
  const panel = document.querySelector<HTMLElement>(".plinth-select-panel")!;
  expect(panel.matches(":popover-open")).toBe(true);

  // A modal dialog makes everything outside it inert; the panel is inside the dialog's subtree,
  // so its search field is still reachable.
  await expect.element(search()).toHaveFocus();

  await search().fill("goncalo");
  await userEvent.keyboard("{Enter}");

  await expect.element(page.getByTestId("bound")).toHaveTextContent("sao-goncalo");
  await expect.element(trigger()).toHaveFocus();
  await expect.element(page.getByRole("dialog", { name: "Filters" })).toBeVisible();
});

it("lets Escape close the panel without taking the modal with it", async () => {
  render(ModalHarness, { options: LONG });

  await page.getByTestId("opener").click();
  await trigger().click();
  await expect.element(search()).toBeVisible();

  await userEvent.keyboard("{Escape}");

  await expect.element(trigger()).toHaveAttribute("aria-expanded", "false");
  // One Escape, one thing closed: the browser's close-watcher stack, not a listener of ours.
  await expect.element(page.getByRole("dialog", { name: "Filters" })).toBeVisible();

  await userEvent.keyboard("{Escape}");
  await expect.poll(() => page.getByRole("dialog").query()).toBeNull();
});
