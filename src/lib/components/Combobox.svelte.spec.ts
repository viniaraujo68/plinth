import { expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-svelte";
import Harness from "./ComboboxHarness.spec.svelte";
import ModalHarness from "./ComboboxModalHarness.spec.svelte";
import type { SelectOption } from "./select.js";

// The chrome is daisyUI's, and `.modal` is what makes a closed dialog invisible rather than
// undisplayed -- the state the modal harness reads. Without the stylesheet these tests would
// exercise a different element than the one that ships.
import "../../routes/layout.css";

// Eleven, with one row disabled and enough accents that a Portuguese search is the normal case
// rather than an edge one.
const LOCALS: readonly SelectOption[] = [
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

const bar = () => page.getByRole("combobox", { name: "Local" });
const bound = () => page.getByTestId("bound");
const options = () => page.getByRole("option");

/** The control itself, for the readings no locator exposes: the caret and the text selection. */
const field = () => document.querySelector<HTMLInputElement>('input[role="combobox"]')!;

const text = () => field().value;

/** Whether every character in the field is selected, which is what makes the next keystroke replace it. */
const allSelected = () =>
  field().selectionStart === 0 && field().selectionEnd === field().value.length;

/** A row's own label, without the ✓ the component appends to the selected one. */
const rowLabel = (row: Element | null | undefined) => row?.querySelector("span")?.textContent ?? "";

const optionLabels = () => [...document.querySelectorAll('[role="option"]')].map(rowLabel);

/** What a screen reader would read out as active: the row `aria-activedescendant` points at. */
const activeOption = () => {
  const id = field().getAttribute("aria-activedescendant");
  return id === null ? null : rowLabel(document.getElementById(id));
};

it("is a text field that starts closed, empty and unfiltered", async () => {
  render(Harness, { options: LOCALS });

  await expect.element(bar()).toHaveAttribute("aria-expanded", "false");
  await expect.element(bar()).toHaveAttribute("aria-autocomplete", "list");
  await expect.element(bar()).toHaveAttribute("placeholder", "Pick a local");
  expect(text()).toBe("");
  expect(page.getByRole("listbox").query()).toBeNull();
});

it("shows the selected label in the bar without ever being opened", async () => {
  render(Harness, { options: LOCALS, value: "itaipava" });

  expect(text()).toBe("Itaipava");
  await expect.element(bar()).toHaveAttribute("aria-expanded", "false");
});

it("opens on a click with the whole list, and selects the text that is already there", async () => {
  render(Harness, { options: LOCALS, value: "itaipava" });

  await bar().click();

  await expect.element(bar()).toHaveAttribute("aria-expanded", "true");
  // A selection is not a query: opening on one offers every option, not the single row whose
  // label happens to be sitting in the field.
  await expect.poll(() => options().elements().length).toBe(LOCALS.length);
  expect(allSelected()).toBe(true);
});

it("replaces the selected text with the first thing typed", async () => {
  render(Harness, { options: LOCALS, value: "itaipava" });

  await bar().click();
  await userEvent.keyboard("sao");

  // Appended it would read `Itaipavasao` and match nothing at all.
  expect(text()).toBe("sao");
  await expect.poll(optionLabels).toEqual(["São Gonçalo"]);
});

it("opens on keyboard focus too, with the text selected", async () => {
  render(Harness, { options: LOCALS, value: "centro" });

  field().focus();

  await expect.element(bar()).toHaveAttribute("aria-expanded", "true");
  expect(allSelected()).toBe(true);
});

it("filters on a substring, past the accents", async () => {
  render(Harness, { options: LOCALS });

  await bar().click();
  await bar().fill("otavio");

  // Unaccented input, accented label -- the case native type-ahead cannot do at all.
  await expect.poll(optionLabels).toEqual(["Otávio Rocha"]);

  await bar().fill("correas");
  await expect.poll(optionLabels).toEqual(["Corrêas"]);

  // And in the middle of the label, which prefix-only type-ahead also cannot do.
  await bar().fill("rocha");
  await expect.poll(optionLabels).toEqual(["Otávio Rocha"]);

  // Emptied, it is a blank query again rather than a query nothing matches.
  await bar().fill("");
  await expect.poll(() => options().elements().length).toBe(LOCALS.length);
});

it("shows the empty state when nothing matches", async () => {
  render(Harness, { options: LOCALS });

  await bar().click();
  await bar().fill("zzz");

  await expect.poll(() => options().elements().length).toBe(0);
  await expect.element(page.getByText("No local by that name")).toBeVisible();
});

it("takes a custom filter in place of the default matching", async () => {
  // Value-prefix matching: nothing the default would ever do, and the label is ignored entirely.
  const filter = (option: SelectOption, query: string) => option.value.startsWith(query);
  render(Harness, { options: LOCALS, filter });

  await bar().click();
  await bar().fill("sao");
  await expect.poll(optionLabels).toEqual(["São Gonçalo"]);

  await bar().fill("Otávio");
  await expect.poll(optionLabels).toEqual([]);
});

it("keeps the focus in the field and points at the rows instead", async () => {
  render(Harness, { options: LOCALS });

  await bar().click();

  await expect.element(bar()).toHaveFocus();
  await expect.poll(activeOption).toBe("Araras");
  await expect.element(bar()).toHaveAttribute("aria-controls");
});

it("moves the highlight with the arrows and jumps with Home and End", async () => {
  render(Harness, { options: LOCALS });

  await bar().click();
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
  render(Harness, { options: LOCALS });

  await bar().click();
  // Mosela sits between Itaipava and Nogueira and is disabled.
  await userEvent.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}");
  await expect.poll(activeOption).toBe("Itaipava");

  await userEvent.keyboard("{ArrowDown}");
  await expect.poll(activeOption).toBe("Nogueira");

  await userEvent.keyboard("{ArrowUp}");
  await expect.poll(activeOption).toBe("Itaipava");
});

it("takes the highlight back to the top of what is left as the query narrows", async () => {
  render(Harness, { options: LOCALS });

  await bar().click();
  await userEvent.keyboard("{ArrowDown}{ArrowDown}");
  await expect.poll(activeOption).toBe("Castelânea");

  await bar().fill("o");
  // Castelânea is gone from the list, so the highlight cannot stay on it -- and it lands on the
  // first row that is left rather than on whatever now sits at its old index.
  await expect.poll(activeOption).toBe("Centro");
});

it("opens with the arrows without disturbing the text", async () => {
  render(Harness, { options: LOCALS, value: "centro" });

  field().focus();
  await userEvent.keyboard("{Escape}");
  await expect.element(bar()).toHaveAttribute("aria-expanded", "false");

  await userEvent.keyboard("{ArrowDown}");

  await expect.element(bar()).toHaveAttribute("aria-expanded", "true");
  expect(text()).toBe("Centro");
});

it("picks the highlighted option with Enter and puts its label in the bar", async () => {
  render(Harness, { options: LOCALS });

  await bar().click();
  await bar().fill("goncalo");
  await expect.poll(activeOption).toBe("São Gonçalo");

  await userEvent.keyboard("{Enter}");

  await expect.element(bound()).toHaveTextContent("sao-goncalo");
  await expect.element(page.getByTestId("changes")).toHaveTextContent("1");
  expect(text()).toBe("São Gonçalo");
  await expect.element(bar()).toHaveAttribute("aria-expanded", "false");
  await expect.element(bar()).toHaveFocus();
});

it("picks with the mouse, and follows the mouse while it moves", async () => {
  render(Harness, { options: LOCALS });

  await bar().click();
  await options().nth(3).hover();
  await expect.poll(activeOption).toBe("Centro");

  await options().nth(3).click();

  await expect.element(bound()).toHaveTextContent("centro");
  expect(text()).toBe("Centro");
  await expect.element(bar()).toHaveAttribute("aria-expanded", "false");
  await expect.element(bar()).toHaveFocus();
});

it("marks the selected row and reopens on it", async () => {
  render(Harness, { options: LOCALS, value: "nogueira" });

  await bar().click();

  await expect.poll(activeOption).toBe("Nogueira");
  await expect
    .element(page.getByRole("option", { name: "Nogueira" }))
    .toHaveAttribute("aria-selected", "true");
});

it("puts the selected label back when Escape closes the list on a half-typed query", async () => {
  render(Harness, { options: LOCALS, value: "itaipava" });

  await bar().click();
  await bar().fill("cen");
  await expect.poll(optionLabels).toEqual(["Centro"]);

  await userEvent.keyboard("{Escape}");

  await expect.element(bar()).toHaveAttribute("aria-expanded", "false");
  // A control that claims to hold Itaipava may not be left showing `cen`.
  expect(text()).toBe("Itaipava");
  await expect.element(bound()).toHaveTextContent("itaipava");
  await expect.element(page.getByTestId("changes")).toHaveTextContent("0");
});

it("starts a fresh query on the next keystroke after Escape", async () => {
  render(Harness, { options: LOCALS, value: "itaipava" });

  await bar().click();
  await bar().fill("otav");

  await userEvent.keyboard("{Escape}");
  expect(text()).toBe("Itaipava");
  // The restored label is a label, so it is selected exactly as a click on the bar leaves it.
  expect(allSelected()).toBe(true);

  await userEvent.keyboard("sao");

  // Appended it would read `Itaipavasao` -- and, with the reopen eating the first keystroke,
  // `Itaipavaao` -- matching nothing at all.
  expect(text()).toBe("sao");
  await expect.poll(optionLabels).toEqual(["São Gonçalo"]);
  await expect.element(bar()).toHaveAttribute("aria-expanded", "true");
});

it("still starts a fresh query when Escape is pressed a second time over nothing", async () => {
  render(Harness, { options: LOCALS, value: "itaipava" });

  await bar().click();
  await bar().fill("otav");

  // The second Escape has no list left to close, so it must leave the field exactly as the first
  // one did rather than quietly undoing the restore.
  await userEvent.keyboard("{Escape}{Escape}");
  await userEvent.keyboard("sao");

  expect(text()).toBe("sao");
  await expect.poll(optionLabels).toEqual(["São Gonçalo"]);
});

it("keeps the character that reopens a closed field", async () => {
  render(Harness, { options: LOCALS });

  await bar().click();
  await userEvent.keyboard("{Escape}");
  await expect.element(bar()).toHaveAttribute("aria-expanded", "false");

  await userEvent.keyboard("sao");

  // Nothing is selected here, so there is no label to append to: the only thing the reopen can
  // cost is the keystroke that asked for it.
  expect(text()).toBe("sao");
  await expect.poll(optionLabels).toEqual(["São Gonçalo"]);
});

it("deletes rather than reopens on the first Backspace after Escape", async () => {
  render(Harness, { options: LOCALS, value: "itaipava" });

  await bar().click();
  await bar().fill("otav");
  await userEvent.keyboard("{Escape}");

  await userEvent.keyboard("{Backspace}");

  // The restored label is selected, so one Backspace takes all of it -- and the reopen may not
  // put it back.
  expect(text()).toBe("");
  await expect.poll(() => options().elements().length).toBe(LOCALS.length);
});

it("starts a fresh query after a pick instead of appending to the label it left", async () => {
  render(Harness, { options: LOCALS, value: "itaipava" });

  await bar().click();
  await bar().fill("otav");
  await userEvent.keyboard("{Enter}");
  expect(text()).toBe("Otávio Rocha");

  await userEvent.keyboard("sao");

  // The pick leaves the keyboard in the field, so the very next keystroke is a new search.
  expect(text()).toBe("sao");
  await expect.poll(optionLabels).toEqual(["São Gonçalo"]);
});

it("does the same after a pick made with the mouse", async () => {
  render(Harness, { options: LOCALS, value: "itaipava" });

  await bar().click();
  await options().nth(0).click();
  await expect.poll(text).toBe("Araras");

  await userEvent.keyboard("sao");

  expect(text()).toBe("sao");
  await expect.poll(optionLabels).toEqual(["São Gonçalo"]);
});

it("starts a fresh query after a value arrives from outside a focused field", async () => {
  const harness = render(Harness, { options: LOCALS, value: "itaipava" });

  await bar().click();
  await userEvent.keyboard("{Escape}");

  await harness.rerender({ value: "araras" });
  await expect.poll(text).toBe("Araras");

  await userEvent.keyboard("sao");

  // The outside write put a label in a field someone still has the keyboard in, which is the same
  // situation Escape leaves and has to end the same way.
  expect(text()).toBe("sao");
  await expect.poll(optionLabels).toEqual(["São Gonçalo"]);
});

it("starts a fresh query after Tab takes the focus away and brings it back", async () => {
  render(Harness, { options: LOCALS, value: "itaipava" });

  await bar().click();
  await bar().fill("otav");

  await userEvent.keyboard("{Tab}");
  await expect.element(page.getByTestId("after")).toHaveFocus();

  await userEvent.keyboard("{Shift>}{Tab}{/Shift}");
  await expect.element(bar()).toHaveFocus();
  await userEvent.keyboard("sao");

  expect(text()).toBe("sao");
  await expect.poll(optionLabels).toEqual(["São Gonçalo"]);
});

it("puts it back on a click outside as well", async () => {
  render(Harness, { options: LOCALS, value: "itaipava" });

  await bar().click();
  await bar().fill("cen");

  await page.getByTestId("outside").click();

  await expect.element(bar()).toHaveAttribute("aria-expanded", "false");
  await expect.poll(text).toBe("Itaipava");
  await expect.element(bound()).toHaveTextContent("itaipava");
});

it("puts it back on Tab, and lets the focus carry on past the field", async () => {
  render(Harness, { options: LOCALS, value: "itaipava" });

  await bar().click();
  await bar().fill("cen");

  await userEvent.keyboard("{Tab}");

  await expect.element(bar()).toHaveAttribute("aria-expanded", "false");
  await expect.poll(text).toBe("Itaipava");
  await expect.element(page.getByTestId("after")).toHaveFocus();
});

it("reverts an emptied field instead of taking it for a cleared selection", async () => {
  render(Harness, { options: LOCALS, value: "itaipava" });

  await bar().click();
  await bar().fill("");
  expect(text()).toBe("");

  await page.getByTestId("outside").click();

  // Deleting the text is not a way to clear: the ✕ is, and only the ✕.
  await expect.poll(text).toBe("Itaipava");
  await expect.element(bound()).toHaveTextContent("itaipava");
  await expect.element(page.getByTestId("changes")).toHaveTextContent("0");
});

it("clears the selection through the clear button, and only through it", async () => {
  render(Harness, { options: LOCALS, value: "centro", clearable: true });

  const clear = page.getByRole("button", { name: "Clear selection" });
  await expect.element(clear).toBeVisible();

  await clear.click();

  await expect.element(bound()).toHaveTextContent("none");
  await expect.poll(text).toBe("");
  // The field keeps the keyboard, so clearing and retyping is one uninterrupted move.
  await expect.element(bar()).toHaveFocus();
});

it("offers no clear button while there is nothing to clear", async () => {
  render(Harness, { options: LOCALS, clearable: true });

  expect(page.getByRole("button", { name: "Clear selection" }).query()).toBeNull();
});

it("follows a selection made from outside the control", async () => {
  const harness = render(Harness, { options: LOCALS, value: "centro" });
  expect(text()).toBe("Centro");

  await harness.rerender({ value: "araras" });

  await expect.poll(text).toBe("Araras");
});

it("renders a row through the option snippet", async () => {
  render(Harness, { options: LOCALS, withOptionSnippet: true });

  await bar().click();
  await expect.element(page.getByTestId("custom-row").first()).toHaveTextContent("ARARAS");

  // The bar keeps showing the plain label: the snippet describes a row, not the control.
  await options().nth(0).click();
  await expect.poll(text).toBe("Araras");
});

it("does not open while it is disabled", async () => {
  render(Harness, { options: LOCALS, disabled: true });

  await expect.element(bar()).toBeDisabled();

  // Driven straight at the element: a disabled input swallows the click on its own, and the
  // keydown is the half the browser would still deliver if the field were focusable.
  field().click();
  field().dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));

  await expect.element(bar()).toHaveAttribute("aria-expanded", "false");
  expect(page.getByRole("listbox").query()).toBeNull();
});

it("submits the value and never the text on screen", async () => {
  render(Harness, { options: LOCALS, value: "sao-goncalo", name: "local" });

  const form = document.querySelector<HTMLFormElement>('[data-testid="form"]')!;
  // The label is `São Gonçalo`; what a form gets is the identifier behind it.
  expect(text()).toBe("São Gonçalo");
  expect(new FormData(form).get("local")).toBe("sao-goncalo");

  await bar().click();
  await bar().fill("cen");
  // Mid-query the field reads `cen`, which is not a value and not even a label.
  expect(new FormData(form).get("local")).toBe("sao-goncalo");

  await userEvent.keyboard("{Enter}");
  await expect.poll(() => new FormData(form).get("local")).toBe("centro");
});

it("opens above a modal, keeps the focus and writes through from inside it", async () => {
  render(ModalHarness, { options: LOCALS });

  await page.getByTestId("opener").click();
  await expect.element(page.getByRole("dialog", { name: "Filters" })).toBeVisible();

  await bar().click();
  // The panel is a popover, so it joins the top layer ABOVE the modal that is already in it --
  // the whole reason there is no z-index anywhere in this component.
  const panel = document.querySelector<HTMLElement>(".plinth-combobox-panel")!;
  expect(panel.matches(":popover-open")).toBe(true);

  // A modal dialog makes everything outside it inert; the field is inside the dialog's subtree,
  // so it still has the keyboard.
  await expect.element(bar()).toHaveFocus();

  await bar().fill("goncalo");
  await userEvent.keyboard("{Enter}");

  await expect.element(page.getByTestId("bound")).toHaveTextContent("sao-goncalo");
  await expect.poll(text).toBe("São Gonçalo");
  await expect.element(page.getByRole("dialog", { name: "Filters" })).toBeVisible();
});

it("lets Escape close the list without taking the modal with it", async () => {
  render(ModalHarness, { options: LOCALS });

  await page.getByTestId("opener").click();
  await bar().click();
  await expect.element(page.getByRole("listbox")).toBeVisible();

  await userEvent.keyboard("{Escape}");

  await expect.element(bar()).toHaveAttribute("aria-expanded", "false");
  // One Escape, one thing closed: the browser's close-watcher stack, not a listener of ours.
  await expect.element(page.getByRole("dialog", { name: "Filters" })).toBeVisible();

  await userEvent.keyboard("{Escape}");
  await expect.poll(() => page.getByRole("dialog").query()).toBeNull();
});
