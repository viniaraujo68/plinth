import { expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-svelte";
import Harness from "./JsonInputHarness.spec.svelte";

const field = () => page.getByRole("textbox", { name: "Settings" });
const fieldElement = () => field().element() as HTMLTextAreaElement;
const invalid = () => page.getByTestId("invalid").element().textContent;
const form = () => page.getByTestId("form").element() as HTMLFormElement;
const blur = () =>
  (page.getByRole("button", { name: "Elsewhere" }).element() as HTMLElement).focus();

it("reports whether the text parses while it is typed", async () => {
  render(Harness, { value: '{"a": 1}' });

  await expect.poll(invalid).toBe("false");

  await field().fill('{"a": 1,');
  await expect.poll(invalid).toBe("true");

  await field().fill('{"a": 1}');
  await expect.poll(invalid).toBe("false");
});

it("waits for a blur before showing the parser's message", async () => {
  render(Harness);

  await field().fill('{"a": 1,}');
  expect(document.querySelector(".text-error")).toBeNull();
  await expect.element(field()).toHaveAttribute("aria-invalid", "false");

  blur();

  const error = page.getByText(/^Invalid JSON: /);
  await expect.element(error).toBeVisible();
  await expect.element(field()).toHaveAttribute("aria-invalid", "true");
  expect(fieldElement().getAttribute("aria-describedby")).toBe(error.element().id);
});

it("reformats a document that parses on blur, and leaves one that does not as typed", async () => {
  render(Harness, { formatOnBlur: true });

  await field().fill('{"a":[1,2]}');
  blur();
  await expect.element(field()).toHaveValue('{\n  "a": [\n    1,\n    2\n  ]\n}');

  await field().fill('{"a":[1,2]');
  blur();
  await expect.element(field()).toHaveValue('{"a":[1,2]');
});

it("holds a surrounding form back while the text does not parse", async () => {
  render(Harness, { value: "{}" });

  expect(form().checkValidity()).toBe(true);

  await field().fill("{");
  expect(form().checkValidity()).toBe(false);
  expect(fieldElement().validationMessage).toMatch(/^Invalid JSON: /);
});

it("treats blank text as valid unless it is required", async () => {
  const screen = render(Harness);

  await expect.poll(invalid).toBe("false");
  expect(form().checkValidity()).toBe(true);

  await screen.rerender({ required: true });
  await expect.poll(invalid).toBe("true");
  expect(form().checkValidity()).toBe(false);

  await field().click();
  await userEvent.keyboard("{Tab}");
  await expect.element(page.getByText("Invalid JSON: Required")).toBeVisible();
});

it("submits the text under its name", async () => {
  render(Harness, { value: '{"a": 1}' });

  expect(new FormData(form()).get("settings")).toBe('{"a": 1}');
});
