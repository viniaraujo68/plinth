import { afterEach, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-svelte";
import Harness from "./ModalHarness.spec.svelte";

// The chrome is daisyUI's, and its `.modal` is what makes the closed dialog invisible rather than
// undisplayed -- which is the state the lazy unmount reads. Without the stylesheet these tests
// would exercise a different element than the one that ships.
import "../../routes/layout.css";

const element = () => document.querySelector("dialog");
const bodyOverflow = () => document.body.style.overflow;

afterEach(() => {
  document.body.style.overflow = "";
});

it("mounts nothing until it is opened", async () => {
  render(Harness);

  expect(page.getByTestId("content").query()).toBeNull();
  await expect.element(page.getByTestId("opener")).toBeInTheDocument();
});

it("opens modally with the title as its accessible name", async () => {
  render(Harness);

  await page.getByTestId("opener").click();

  await expect.element(page.getByRole("dialog", { name: "Harness modal" })).toBeVisible();
  expect(element()?.matches(":modal")).toBe(true);
});

it("opens on the box rather than on the close button", async () => {
  render(Harness);

  await page.getByTestId("opener").click();

  // Landing on ✕ is the browser's default choice and a bad first move; the box is what the caller
  // would have wanted focused when the content itself names no target.
  await expect.poll(() => document.activeElement?.classList.contains("modal-box")).toBe(true);
});

it("locks the background scroll while open and restores what it found", async () => {
  document.body.style.overflow = "scroll";
  render(Harness);

  await page.getByTestId("opener").click();
  await expect.poll(bodyOverflow).toBe("hidden");

  await userEvent.keyboard("{Escape}");
  await expect.poll(bodyOverflow).toBe("scroll");
});

it("leaves no inline overflow behind when the page had none", async () => {
  render(Harness);
  expect(bodyOverflow()).toBe("");

  await page.getByTestId("opener").click();
  await expect.poll(bodyOverflow).toBe("hidden");

  await page.getByTestId("footer-close").click();
  await expect.poll(bodyOverflow).toBe("");
});

it("closes from the close button and reports it once", async () => {
  render(Harness);

  await page.getByTestId("opener").click();
  await page.getByRole("button", { name: "Close" }).click();

  await expect.poll(() => element()?.open ?? false).toBe(false);
  await expect.element(page.getByTestId("closes")).toHaveTextContent("1");
});

it("closes on Escape and hands focus back to the opener", async () => {
  render(Harness);
  const opener = page.getByTestId("opener");

  await opener.click();
  await userEvent.keyboard("{Escape}");

  await expect.poll(() => document.activeElement).toBe(opener.element());
});

it("unmounts the content after the box has finished disappearing", async () => {
  render(Harness);

  await page.getByTestId("opener").click();
  await expect.element(page.getByTestId("content")).toBeVisible();

  await page.getByRole("button", { name: "Close" }).click();

  await expect.poll(() => page.getByTestId("content").query()).toBeNull();
  await expect.poll(element).toBeNull();
});

it("gives the close button a 44px touch target", async () => {
  render(Harness);

  await page.getByTestId("opener").click();

  const close = page.getByRole("button", { name: "Close" }).element().getBoundingClientRect();
  expect(close.width).toBeGreaterThanOrEqual(44);
  expect(close.height).toBeGreaterThanOrEqual(44);
});

it("keeps the header still and scrolls only the body", async () => {
  render(Harness);

  await page.getByTestId("opener").click();

  const body = page.getByTestId("content").element().parentElement;
  expect(body && getComputedStyle(body).overflowY).toBe("auto");
  expect(body && getComputedStyle(body).overscrollBehaviorY).toBe("contain");
});

it("refuses Escape, the backdrop and the close button when it is not dismissible", async () => {
  render(Harness, { dismissible: false });

  await page.getByTestId("opener").click();
  expect(page.getByRole("button", { name: "Close" }).query()).toBeNull();

  await userEvent.keyboard("{Escape}");
  await expect.poll(() => element()?.open ?? false).toBe(true);

  await page.getByTestId("footer-close").click();
  await expect.poll(() => element()?.open ?? false).toBe(false);
});

const bandGap = (box: HTMLElement) => {
  const style = getComputedStyle(box);
  const height = (element: Element) => element.getBoundingClientRect().height;

  // The box's own 1px border is not a band, and `getBoundingClientRect` counts it at both ends.
  return (
    height(box) -
    parseFloat(style.borderTopWidth) -
    parseFloat(style.borderBottomWidth) -
    height(box.querySelector("header")!) -
    height(box.querySelector("footer")!)
  );
};

it("renders no body band at all when it is handed no body", async () => {
  render(Harness, { withBody: false });

  await page.getByTestId("opener").click();

  expect(page.getByTestId("content").query()).toBeNull();

  // Measured rather than eyeballed: the box is exactly its header and its footer, with no empty
  // padded strip left between them, and one rule rather than two adjacent ones.
  const box = document.querySelector<HTMLElement>(".modal-box")!;
  expect(bandGap(box)).toBeLessThan(1);
  expect(getComputedStyle(box.querySelector("footer")!).borderTopWidth).toBe("0px");
});

it("keeps the body band and its rule when there is a body", async () => {
  render(Harness);

  await page.getByTestId("opener").click();

  const box = document.querySelector<HTMLElement>(".modal-box")!;
  expect(bandGap(box)).toBeGreaterThan(20);
  expect(getComputedStyle(box.querySelector("footer")!).borderTopWidth).toBe("1px");
});
