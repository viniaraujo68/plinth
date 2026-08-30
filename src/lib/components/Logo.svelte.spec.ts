import { expect, it } from "vitest";
import { render } from "vitest-browser-svelte";
import Logo from "./Logo.svelte";

const mark = () => document.querySelector<HTMLElement>(".plinth-logo")!;
const outline = () => mark().querySelector<SVGPathElement>("path")!;

const keyframeDistance = (animationName: string) => {
  for (const sheet of document.styleSheets) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    for (const rule of rules) {
      if (!(rule instanceof CSSKeyframesRule) || rule.name !== animationName) continue;
      const last = rule.cssRules[rule.cssRules.length - 1] as CSSKeyframeRule;
      return Math.abs(Number.parseFloat(last.style.strokeDashoffset));
    }
  }
  throw new Error(`no @keyframes named ${animationName}`);
};

it("draws the mark as a single stroked outline", () => {
  render(Logo);

  expect(mark().querySelectorAll("path")).toHaveLength(1);

  const style = getComputedStyle(outline());
  expect(style.fill).toBe("none");
  expect(style.strokeLinecap).toBe("round");
  expect(style.strokeLinejoin).toBe("round");
});

it("stays still unless it is told to animate", () => {
  render(Logo);

  // The regression this guards is the `data-animated={false}` trap: a boolean false serialises to
  // the string "false", which an attribute selector still matches. Absence is the only reading
  // that means off.
  expect(mark().hasAttribute("data-animated")).toBe(false);
  expect(getComputedStyle(outline()).animationName).toBe("none");
  // Standing still means an unbroken perimeter, not a frozen dash.
  expect(getComputedStyle(outline()).strokeDasharray).toBe("none");
});

it("orbits the perimeter when animated", () => {
  render(Logo, { animated: true });

  expect(mark().getAttribute("data-animated")).toBe("");
  expect(getComputedStyle(outline()).animationName).not.toBe("none");
  expect(getComputedStyle(outline()).strokeDasharray).not.toBe("none");
});

it("keeps the dash period equal to the length it travels", () => {
  render(Logo, { animated: true });

  const style = getComputedStyle(outline());
  const [lit, gap] = style.strokeDasharray.split(" ").map(Number.parseFloat);

  // The invariant behind the animation: a dash period that is not exactly the path length makes
  // the pattern restart at the path's start point, so the dash snaps at the tip once per cycle.
  // Lit + gap, the distance the keyframes travel, and the measured path length are one number.
  expect(lit + gap).toBeCloseTo(keyframeDistance(style.animationName), 3);
  expect(lit + gap).toBeCloseTo(outline().getTotalLength(), 2);
});

it("derives its size from the inherited font size", () => {
  render(Logo, { style: "font-size: 40px" });

  const svg = getComputedStyle(mark().querySelector("svg")!);
  expect(svg.width).toBe("40px");
  expect(svg.height).toBe("40px");
});

it("takes an explicit color over the theme's ink", () => {
  render(Logo, { color: "rgb(1, 2, 3)" });

  expect(getComputedStyle(outline()).stroke).toBe("rgb(1, 2, 3)");
});
