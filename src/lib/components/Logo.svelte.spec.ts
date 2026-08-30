import { expect, it } from "vitest";
import { render } from "vitest-browser-svelte";
import Logo from "./Logo.svelte";

const mark = () => document.querySelector<HTMLElement>(".plinth-logo")!;
const bars = () => [...mark().children] as HTMLElement[];

it("renders exactly three bars", () => {
  render(Logo);

  expect(bars()).toHaveLength(3);
});

it("stays still unless it is told to animate", () => {
  render(Logo);

  // The regression this guards is the `data-animated={false}` trap: a boolean false serialises to
  // the string "false", which an attribute selector still matches. Absence is the only reading
  // that means off.
  expect(mark().hasAttribute("data-animated")).toBe(false);
  expect(getComputedStyle(bars()[0]).animationName).toBe("none");
});

it("runs the stretch cycle out of phase when animated", () => {
  render(Logo, { animated: true });

  const [first, middle, last] = bars().map((bar) => getComputedStyle(bar));

  expect(first.animationName).not.toBe("none");
  expect(middle.animationName).toBe(first.animationName);
  // The offsets are the whole effect: three bars in phase would read as one blinking block.
  expect(new Set([first.animationDelay, middle.animationDelay, last.animationDelay]).size).toBe(3);
});

it("derives every dimension from the inherited font size", () => {
  render(Logo, { barHeight: "40px" });

  const bar = getComputedStyle(bars()[0]);
  expect(bar.height).toBe("40px");
  expect(bar.width).toBe("10px");
});

it("takes an explicit color over the wash of the theme's ink", () => {
  render(Logo, { color: "rgb(1, 2, 3)" });

  expect(getComputedStyle(bars()[0]).backgroundColor).toBe("rgb(1, 2, 3)");
});
