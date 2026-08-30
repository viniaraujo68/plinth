import { afterEach, beforeEach, expect, it } from "vitest";
import { render } from "vitest-browser-svelte";
import Skeleton from "./Skeleton.svelte";

const block = () => document.querySelector<HTMLElement>(".plinth-skeleton")!;

/**
 * Both the wash and the sweep are `color-mix`es of theme tokens, and a `color-mix` over an
 * undefined custom property is invalid at computed-value time — the gradient would simply not be
 * there to assert. Nothing loads the theme stylesheet in here, so the two tokens it would have
 * supplied are stood up by hand.
 */
const TOKENS = { "--color-base-content": "rgb(0, 0, 0)", "--color-primary": "rgb(90, 60, 200)" };

beforeEach(() => {
  for (const [token, value] of Object.entries(TOKENS))
    document.documentElement.style.setProperty(token, value);
});

afterEach(() => {
  for (const token of Object.keys(TOKENS)) document.documentElement.style.removeProperty(token);
});

/** Rules nest, so a flat walk over `styleSheets` would miss the `@media` block inside the
 * component's own rule — which is precisely the one worth reading. */
function* everyRule(rules: Iterable<CSSRule>): Generator<CSSRule> {
  for (const rule of rules) {
    yield rule;
    if ("cssRules" in rule) yield* everyRule((rule as CSSGroupingRule).cssRules);
  }
}

function* documentRules(): Generator<CSSRule> {
  for (const sheet of document.styleSheets)
    try {
      yield* everyRule(sheet.cssRules);
    } catch {
      // A cross-origin sheet refuses to be read at all; none of ours are.
      continue;
    }
}

const keyframes = (animationName: string) => {
  for (const rule of documentRules())
    if (rule instanceof CSSKeyframesRule && rule.name === animationName) return rule;

  throw new Error(`no @keyframes named ${animationName}`);
};

/**
 * The vitest browser runner exposes no hook for `prefers-reduced-motion` — Playwright's
 * `emulateMedia` is only reachable from the end-to-end run, which asserts the rendered result
 * instead. What is checkable from here is the rule itself: that it exists, and that it says what
 * the component claims it says.
 */
const reducedMotionStyle = () => {
  const skeleton = [...documentRules()].find(
    (rule): rule is CSSStyleRule =>
      rule instanceof CSSStyleRule && rule.selectorText.includes("plinth-skeleton"),
  );

  for (const rule of everyRule(skeleton ? [skeleton] : [])) {
    if (!(rule instanceof CSSMediaRule)) continue;
    if (!rule.conditionText.includes("prefers-reduced-motion")) continue;
    for (const inner of everyRule(rule.cssRules)) {
      // Nested declarations arrive as a rule of their own, with no selector to match on; the
      // property being set is what identifies the block.
      const style = (inner as { style?: CSSStyleDeclaration }).style;
      if (style?.animationName) return style;
    }
  }
  throw new Error("no prefers-reduced-motion rule inside .plinth-skeleton");
};

it("rests on a wash and sweeps a tinted band across it", () => {
  render(Skeleton);

  const style = getComputedStyle(block());
  expect(style.backgroundImage).toContain("linear-gradient");
  expect(style.backgroundRepeat).toBe("no-repeat");
  // Twice the box, so the lit band covers half of it and the keyframes have somewhere to travel.
  expect(style.backgroundSize).toBe("200% 100%");
});

it("keeps the logo's tempo, so two loading states never beat against each other", () => {
  render(Skeleton);

  const style = getComputedStyle(block());
  expect(style.animationName).not.toBe("none");
  expect(style.animationDuration).toBe("1.7s");
  expect(style.animationTimingFunction).toBe("linear");
  expect(style.animationIterationCount).toBe("infinite");
});

it("carries the band clear off both ends of the box", () => {
  render(Skeleton);

  const rule = keyframes(getComputedStyle(block()).animationName);
  const stops = [...rule.cssRules].map((frame) =>
    Number.parseFloat((frame as CSSKeyframeRule).style.backgroundPosition),
  );

  // A sweep that starts and ends at the rim parks a half-lit edge there twice per cycle; the two
  // stops have to sit outside the box, one on each side, and in that order.
  expect(stops[0]).toBeGreaterThan(100);
  expect(stops[stops.length - 1]).toBeLessThan(0);
});

it("sets no size of its own, so a utility class is never overridden", () => {
  render(Skeleton, { class: "some-app-class" });

  // An unlayered component rule beats a Tailwind utility whatever the source order, so anything
  // this component declared here would be the last word on it. It declares nothing.
  expect(getComputedStyle(block()).height).toBe("0px");
  expect(block().classList.contains("some-app-class")).toBe(true);
});

it("owns the corner shape instead, because a class could not have won", () => {
  render(Skeleton);

  // The theme's `--radius-field` is not loaded here, so this is the fallback the library ships.
  expect(getComputedStyle(block()).borderRadius).toBe("8px");
});

it("rounds to a disc for an avatar", () => {
  render(Skeleton, { rounded: "full" });

  expect(getComputedStyle(block()).borderRadius).toBe("9999px");
});

it("squares off for a caller cutting its own silhouette", () => {
  render(Skeleton, { rounded: "none" });

  expect(getComputedStyle(block()).borderRadius).toBe("0px");
});

it("forwards the attributes a caller hands it", () => {
  render(Skeleton, { "data-testid": "placeholder", style: "clip-path: url(#pick)" });

  expect(block().dataset.testid).toBe("placeholder");
  // The sweep is painted on the element, so a silhouette the caller cuts applies to it too.
  expect(getComputedStyle(block()).clipPath).toContain("url(");
});

it("stops moving outright under prefers-reduced-motion", () => {
  render(Skeleton);

  const style = reducedMotionStyle();

  // The asymmetry with `Logo`, stated as an assertion: the mark degrades its orbit to a pulse
  // because an outline standing still indicates nothing, while a skeleton still holds the space
  // its content will take.
  expect(style.animationName).toBe("none");
  expect(style.backgroundImage).toBe("none");
  expect(style.backgroundColor).toContain("color-mix");
});
