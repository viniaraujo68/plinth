import { expect, it } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-svelte";
import Harness from "./SortableHarness.spec.svelte";

const order = () => document.querySelector('[data-testid="order"]')?.textContent;
const items = () => [...document.querySelectorAll<HTMLElement>("[data-sortable-item]")];
const handle = (name: string) => page.getByRole("button", { name: `Move ${name}` }).element();

const pointer = (target: EventTarget, type: string, x: number, y: number) =>
  target.dispatchEvent(
    new PointerEvent(type, { bubbles: true, button: 0, pointerId: 7, clientX: x, clientY: y }),
  );

const middleOf = (element: Element) => {
  const box = element.getBoundingClientRect();
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
};

const dragCenterTo = (name: string, x: number, y: number) => {
  const grip = middleOf(handle(name));
  const center = middleOf(handle(name).closest("[data-sortable-item]")!);
  pointer(handle(name), "pointerdown", grip.x, grip.y);
  const move = (cx: number, cy: number) =>
    pointer(window, "pointermove", grip.x + cx - center.x, grip.y + cy - center.y);
  move(x, y);
  return { move, drop: () => pointer(window, "pointerup", 0, 0) };
};

it("moves right once the dragged item's center passes the next item's middle", async () => {
  render(Harness);
  const beta = middleOf(items()[1]);

  const drag = dragCenterTo("alpha", beta.x - 10, beta.y);
  expect(order()).toBe("alpha,beta,gamma");

  drag.move(beta.x + 10, beta.y);
  await expect.poll(order).toBe("beta,alpha,gamma");
  drag.drop();
});

it("moves left at the same point, so both directions feel alike", async () => {
  render(Harness);
  const beta = middleOf(items()[1]);

  const drag = dragCenterTo("gamma", beta.x + 10, beta.y);
  expect(order()).toBe("alpha,beta,gamma");

  drag.move(beta.x - 10, beta.y);
  await expect.poll(order).toBe("alpha,gamma,beta");
  drag.drop();
});

it("reorders a vertical list by the middle of each item's height", async () => {
  render(Harness, { vertical: true });
  const beta = middleOf(items()[1]);

  const drag = dragCenterTo("alpha", beta.x, beta.y - 6);
  expect(order()).toBe("alpha,beta,gamma");

  drag.move(beta.x, beta.y + 6);
  await expect.poll(order).toBe("beta,alpha,gamma");
  drag.drop();
});

it("keeps reordering by position when the drag drifts above or below the row", async () => {
  render(Harness);
  const beta = middleOf(items()[1]);

  const drag = dragCenterTo("alpha", beta.x - 10, beta.y - 60);
  expect(order()).toBe("alpha,beta,gamma");

  drag.move(beta.x + 10, beta.y + 60);
  await expect.poll(order).toBe("beta,alpha,gamma");

  await new Promise((resolve) => setTimeout(resolve, 300));
  const back = middleOf(items()[0]);
  drag.move(back.x - 10, back.y - 60);
  await expect.poll(order).toBe("alpha,beta,gamma");
  drag.drop();
});

it("settles instead of swapping back and forth when the dragged center sits on a neighbour's middle", async () => {
  render(Harness);
  const beta = middleOf(items()[1]);

  const drag = dragCenterTo("alpha", beta.x + 0.5, beta.y - 30);
  await expect.poll(order).toBe("beta,alpha,gamma");
  await new Promise((resolve) => setTimeout(resolve, 300));
  expect(order()).toBe("beta,alpha,gamma");

  drag.move(beta.x - 0.5, beta.y - 30);
  await new Promise((resolve) => setTimeout(resolve, 300));
  expect(order()).toBe("beta,alpha,gamma");
  drag.drop();
});

it("sends an item dragged into the empty space past the last one to the end", async () => {
  render(Harness);
  const gamma = items()[2].getBoundingClientRect();

  const drag = dragCenterTo("alpha", gamma.right + 40, gamma.top + gamma.height / 2);
  await expect.poll(order).toBe("beta,gamma,alpha");
  drag.drop();
});

it("marks the item being dragged and clears the mark on release", async () => {
  render(Harness);
  const start = middleOf(handle("beta"));

  pointer(handle("beta"), "pointerdown", start.x, start.y);
  expect(items()[1].hasAttribute("data-sortable-dragging")).toBe(true);

  const last = items()[2].getBoundingClientRect();
  pointer(window, "pointermove", last.right - 5, start.y);
  await expect.poll(order).toBe("alpha,gamma,beta");
  await expect.poll(() => items()[2].hasAttribute("data-sortable-dragging")).toBe(true);
  expect(items()[1].hasAttribute("data-sortable-dragging")).toBe(false);

  pointer(window, "pointerup", last.right - 5, start.y);
  expect(items().some((item) => item.hasAttribute("data-sortable-dragging"))).toBe(false);
});

it("carries the dragged item with the pointer and lets it go on release", () => {
  render(Harness);
  const start = middleOf(handle("alpha"));
  const alpha = items()[0];

  pointer(handle("alpha"), "pointerdown", start.x, start.y);
  pointer(window, "pointermove", start.x + 30, start.y + 4);
  expect(alpha.style.translate).toBe("30px 4px");
  expect(order()).toBe("alpha,beta,gamma");

  pointer(window, "pointerup", start.x + 30, start.y + 4);
  expect(alpha.style.translate).toBe("");
});

it("ignores a press that does not start on a handle", () => {
  render(Harness);
  const label = items()[0].querySelector("span")!;
  const start = middleOf(label);
  const last = items()[2].getBoundingClientRect();

  pointer(label, "pointerdown", start.x, start.y);
  pointer(window, "pointermove", last.right - 5, start.y);
  pointer(window, "pointerup", last.right - 5, start.y);

  expect(order()).toBe("alpha,beta,gamma");
});

it("moves with the arrow keys and keeps the focus on the moved item", async () => {
  render(Harness);
  handle("alpha").focus();

  handle("alpha").dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
  await expect.poll(order).toBe("beta,alpha,gamma");
  await expect.poll(() => document.activeElement?.getAttribute("aria-label")).toBe("Move alpha");

  handle("alpha").dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true }));
  await expect.poll(order).toBe("beta,gamma,alpha");

  handle("alpha").dispatchEvent(new KeyboardEvent("keydown", { key: "Home", bubbles: true }));
  await expect.poll(order).toBe("alpha,beta,gamma");

  handle("alpha").dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
  expect(order()).toBe("alpha,beta,gamma");
});

it("does nothing while disabled", () => {
  render(Harness, { disabled: true });
  const start = middleOf(handle("alpha"));
  const last = items()[2].getBoundingClientRect();

  pointer(handle("alpha"), "pointerdown", start.x, start.y);
  pointer(window, "pointermove", last.right - 5, start.y);
  pointer(window, "pointerup", last.right - 5, start.y);
  handle("alpha").dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));

  expect(order()).toBe("alpha,beta,gamma");
});
