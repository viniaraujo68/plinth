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

const SHORT: readonly SelectOption[] = [
  { value: "centro", label: "Centro" },
  { value: "itaipava", label: "Itaipava" },
  { value: "sao-goncalo", label: "São Gonçalo" },
];

// Eleven, with one row disabled: long enough for the arrows to have somewhere to go, and the
// longest list this control is still the right one for.
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

it("carries no search field of its own, at any length", async () => {
  render(Harness, { options: LONG });

  await trigger().click();
  await expect.element(page.getByRole("listbox")).toBeVisible();

  // The whole list, every time: filtering is `Combobox`'s job, and this control does not have a
  // second control hidden inside its panel.
  await expect.poll(() => options().elements().length).toBe(LONG.length);
  expect(page.getByRole("textbox").query()).toBeNull();
});

it("keeps the focus on the trigger while the list is open", async () => {
  render(Harness, { options: LONG });

  await trigger().click();
  await expect.element(trigger()).toHaveFocus();
  // The rows are pointed at rather than focused, which is what lets the trigger stay the one
  // element carrying the keyboard.
  await expect.poll(activeOption).toBe("Araras");
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
  render(Harness, { options: LONG });

  await trigger().click();
  await expect.poll(activeOption).toBe("Araras");

  // Mosela sits between Itaipava and Nogueira and is disabled.
  await userEvent.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}");
  await expect.poll(activeOption).toBe("Itaipava");

  await userEvent.keyboard("{ArrowDown}");
  await expect.poll(activeOption).toBe("Nogueira");

  await userEvent.keyboard("{ArrowUp}");
  await expect.poll(activeOption).toBe("Itaipava");
});

it("opens with the arrows from the closed trigger", async () => {
  render(Harness, { options: SHORT });

  await trigger().click();
  await trigger().click();
  await expect.element(trigger()).toHaveAttribute("aria-expanded", "false");

  await userEvent.keyboard("{ArrowDown}");
  await expect.element(trigger()).toHaveAttribute("aria-expanded", "true");
});

it("selects with Enter and writes through the binding", async () => {
  render(Harness, { options: LONG });

  await trigger().click();
  await userEvent.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}");
  await expect.poll(activeOption).toBe("Itaipava");

  await userEvent.keyboard("{Enter}");

  await expect.element(bound()).toHaveTextContent("itaipava");
  await expect.element(page.getByTestId("changes")).toHaveTextContent("1");
  await expect.element(trigger()).toHaveTextContent("Itaipava");
  await expect.element(trigger()).toHaveAttribute("aria-expanded", "false");
  await expect.element(trigger()).toHaveFocus();
});

it("selects with Space, which is the trigger's own key and not a search field's", async () => {
  render(Harness, { options: SHORT });

  await trigger().click();
  await userEvent.keyboard("{ArrowDown}");
  await userEvent.keyboard(" ");

  await expect.element(bound()).toHaveTextContent("itaipava");
  await expect.element(trigger()).toHaveAttribute("aria-expanded", "false");
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

it("closes on Escape and leaves the focus on the trigger", async () => {
  render(Harness, { options: LONG });

  await trigger().click();
  await expect.element(trigger()).toHaveFocus();

  await userEvent.keyboard("{Escape}");

  await expect.element(trigger()).toHaveAttribute("aria-expanded", "false");
  await expect.element(trigger()).toHaveFocus();
  await expect.element(bound()).toHaveTextContent("none");
});

it("closes on Tab and lets the focus carry on past the trigger", async () => {
  render(Harness, { options: LONG });

  await trigger().click();
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

  // A modal dialog makes everything outside it inert; the trigger is inside the dialog's subtree,
  // so it keeps the keyboard.
  await expect.element(trigger()).toHaveFocus();

  await userEvent.keyboard("{End}{Enter}");

  await expect.element(page.getByTestId("bound")).toHaveTextContent("sao-goncalo");
  await expect.element(trigger()).toHaveFocus();
  await expect.element(page.getByRole("dialog", { name: "Filters" })).toBeVisible();
});

it("lets Escape close the panel without taking the modal with it", async () => {
  render(ModalHarness, { options: LONG });

  await page.getByTestId("opener").click();
  await trigger().click();
  await expect.element(page.getByRole("listbox")).toBeVisible();

  await userEvent.keyboard("{Escape}");

  await expect.element(trigger()).toHaveAttribute("aria-expanded", "false");
  // One Escape, one thing closed: the browser's close-watcher stack, not a listener of ours.
  await expect.element(page.getByRole("dialog", { name: "Filters" })).toBeVisible();

  await userEvent.keyboard("{Escape}");
  await expect.poll(() => page.getByRole("dialog").query()).toBeNull();
});
