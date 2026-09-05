import { expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-svelte";
import DateRangePicker from "./DateRangePicker.svelte";
import Harness from "./DateRangePickerHarness.spec.svelte";
import { isoToLocalInput, type DateRange } from "./date-range.js";

const button = (name: string) => page.getByRole("button", { name, exact: true });
const fromField = () => page.getByLabelText("From");
const toField = () => page.getByLabelText("To");

const spanOf = ({ from, to }: DateRange) => Date.parse(to) - Date.parse(from);
const lastEmit = (onchange: ReturnType<typeof vi.fn>): DateRange =>
  onchange.mock.lastCall?.[0] as DateRange;

const emitted = async () => {
  const onchange = vi.fn();
  render(DateRangePicker, { onchange, reAnchorMs: 0 });
  await vi.waitFor(() => expect(onchange).toHaveBeenCalled());

  return onchange;
};

it("anchors the first preset as soon as it mounts", async () => {
  const onchange = await emitted();

  expect(spanOf(lastEmit(onchange))).toBe(3_600_000);
  await expect.element(button("1h")).toHaveAttribute("aria-pressed", "true");
});

it("emits the window the clicked preset names", async () => {
  const onchange = await emitted();

  await button("7d").click();

  await vi.waitFor(() => expect(spanOf(lastEmit(onchange))).toBe(604_800_000));
  await expect.element(button("7d")).toHaveAttribute("aria-pressed", "true");
  await expect.element(button("1h")).toHaveAttribute("aria-pressed", "false");
});

it("starts on the preset it was told to", async () => {
  const onchange = vi.fn();
  render(DateRangePicker, { onchange, preset: "30d", reAnchorMs: 0 });

  await vi.waitFor(() => expect(spanOf(lastEmit(onchange))).toBe(2_592_000_000));
});

it("takes the preset list it is given", async () => {
  const onchange = vi.fn();
  render(DateRangePicker, {
    onchange,
    reAnchorMs: 0,
    presets: [{ id: "15m", label: "15 minutes", durationMs: 900_000 }],
  });

  await vi.waitFor(() => expect(spanOf(lastEmit(onchange))).toBe(900_000));
  await expect.element(button("15 minutes")).toBeVisible();
});

it("writes the pair back through bind:value", async () => {
  render(Harness, { reAnchorMs: 0 });

  await expect.element(page.getByTestId("bound")).not.toHaveTextContent("none");
});

it("shows no custom fields until custom is picked", async () => {
  await emitted();

  expect(document.querySelector('input[type="datetime-local"]')).toBeNull();
});

it("prefills the custom fields from the range on screen", async () => {
  const onchange = await emitted();
  const relative = lastEmit(onchange);

  await button("Custom").click();

  await expect.element(fromField()).toHaveValue(isoToLocalInput(relative.from));
  await expect.element(toField()).toHaveValue(isoToLocalInput(relative.to));
});

// The fields hold whole minutes, so entering custom mode re-emits what they show rather than
// leaving the value a few seconds away from the two inputs the user is about to edit.
it("re-emits the truncated pair when custom is entered", async () => {
  const onchange = await emitted();

  await button("Custom").click();

  await vi.waitFor(() => {
    const custom = lastEmit(onchange);
    expect(custom.from.endsWith(":00.000Z")).toBe(true);
    expect(custom.to.endsWith(":00.000Z")).toBe(true);
  });
});

it("emits the local field values converted to UTC", async () => {
  const onchange = await emitted();
  await button("Custom").click();

  await fromField().fill("2026-01-02T03:04");
  await toField().fill("2026-01-02T04:05");

  await vi.waitFor(() =>
    expect(lastEmit(onchange)).toEqual({
      from: new Date(2026, 0, 2, 3, 4).toISOString(),
      to: new Date(2026, 0, 2, 4, 5).toISOString(),
    }),
  );
});

it("flags a reversed pair and emits nothing for it", async () => {
  const onchange = await emitted();
  await button("Custom").click();

  await fromField().fill("2026-01-02T03:04");
  await toField().fill("2026-01-02T04:05");
  await vi.waitFor(() =>
    expect(lastEmit(onchange).to).toBe(new Date(2026, 0, 2, 4, 5).toISOString()),
  );

  const before = onchange.mock.calls.length;
  await toField().fill("2026-01-02T02:00");

  await expect.element(page.getByRole("alert")).toBeVisible();
  await expect.element(toField()).toHaveAttribute("aria-invalid", "true");
  expect(onchange.mock.calls.length).toBe(before);
});

it("says nothing about a half-typed field", async () => {
  await emitted();
  await button("Custom").click();

  await fromField().fill("");

  expect(page.getByRole("alert").elements()).toHaveLength(0);
});

it("keeps a relative range sliding forward", async () => {
  const onchange = vi.fn();
  render(DateRangePicker, { onchange, reAnchorMs: 50 });

  await vi.waitFor(() => expect(onchange.mock.calls.length).toBeGreaterThan(2), { timeout: 2000 });
  expect(spanOf(lastEmit(onchange))).toBe(3_600_000);
});

// The point of the whole re-anchor mechanism: a window the user typed is theirs, and a timer that
// moved it would throw away what they asked for.
it("never re-anchors a custom range", async () => {
  const onchange = vi.fn();
  render(DateRangePicker, { onchange, reAnchorMs: 50 });
  await vi.waitFor(() => expect(onchange).toHaveBeenCalled());

  await button("Custom").click();
  const settled = lastEmit(onchange);
  await new Promise((resolve) => setTimeout(resolve, 400));

  expect(lastEmit(onchange)).toEqual(settled);
});

it("does not re-anchor at all when the interval is zero", async () => {
  const onchange = vi.fn();
  render(DateRangePicker, { onchange, reAnchorMs: 0 });
  await vi.waitFor(() => expect(onchange).toHaveBeenCalled());

  const settled = lastEmit(onchange);
  await new Promise((resolve) => setTimeout(resolve, 400));

  expect(lastEmit(onchange)).toEqual(settled);
});

it("names the preset group for assistive technology", async () => {
  render(DateRangePicker, { reAnchorMs: 0, label: "Reporting window" });

  await expect.element(page.getByRole("group", { name: "Reporting window" })).toBeVisible();
});

it("labels the custom button as it was told, keeping the reserved id", async () => {
  render(DateRangePicker, { reAnchorMs: 0, preset: "custom", customLabel: "Pick your own" });

  await expect.element(button("Pick your own")).toHaveAttribute("aria-pressed", "true");
  expect(button("Custom").elements()).toHaveLength(0);
});

it("labels the start field as it was told", async () => {
  render(DateRangePicker, { reAnchorMs: 0, fromLabel: "Start" });

  await button("Custom").click();

  await expect.element(page.getByLabelText("Start")).toBeVisible();
  await expect.element(toField()).toBeVisible();
});

it("labels the end field as it was told", async () => {
  render(DateRangePicker, { reAnchorMs: 0, toLabel: "End" });

  await button("Custom").click();

  await expect.element(page.getByLabelText("End")).toBeVisible();
  await expect.element(fromField()).toBeVisible();
});

it("words the out-of-order alert as it was told", async () => {
  render(DateRangePicker, {
    reAnchorMs: 0,
    invalidRangeLabel: "The start has to come first.",
  });

  await button("Custom").click();
  await fromField().fill("2026-01-02T03:04");
  await toField().fill("2026-01-02T02:00");

  await expect.element(page.getByRole("alert")).toHaveTextContent("The start has to come first.");
});
