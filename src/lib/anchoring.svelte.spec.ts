import { afterEach, expect, it, vi } from "vitest";
import {
  overrideAnchorPositioningSupport,
  positionUnder,
  supportsAnchorPositioning,
} from "./anchoring.js";

// Named `*.svelte.spec.ts` so it lands in the browser project: every reading here is a layout
// reading, and there is no anchor positioning, popover or `ResizeObserver` in the node one.

const ANCHOR_WIDTH = 120;
const ANCHOR_HEIGHT = 32;

const viewport = () => ({
  width: document.documentElement.clientWidth,
  height: document.documentElement.clientHeight,
});

const created: HTMLElement[] = [];
const release: (() => void)[] = [];

const anchorAt = (top: number, left: number, width = ANCHOR_WIDTH) => {
  const anchor = document.createElement("div");
  Object.assign(anchor.style, {
    position: "fixed",
    top: `${top}px`,
    left: `${left}px`,
    width: `${width}px`,
    height: `${ANCHOR_HEIGHT}px`,
  });
  document.body.appendChild(anchor);
  created.push(anchor);
  return anchor;
};

/** A shown popover of a known size, which is what the routine expects to be handed. */
const panelOf = (width: number, height: number) => {
  const panel = document.createElement("div");
  panel.popover = "manual";
  // The UA popover rules carry a medium border and a padding, and the library's panels are under
  // Tailwind's preflight, which strips both and makes every box a border box. Standing in for
  // that here is what makes the sizes asked for below the sizes measured.
  Object.assign(panel.style, {
    boxSizing: "border-box",
    border: "0",
    padding: "0",
    width: `${width}px`,
    height: `${height}px`,
  });
  document.body.appendChild(panel);
  created.push(panel);
  panel.showPopover();
  return panel;
};

const boxOf = (element: HTMLElement) => {
  const rect = element.getBoundingClientRect();
  return { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
};

const position = (...args: Parameters<typeof positionUnder>) => {
  const cleanup = positionUnder(...args);
  release.push(cleanup);
  return cleanup;
};

afterEach(() => {
  for (const cleanup of release.splice(0)) cleanup();
  for (const element of created.splice(0)) element.remove();
  overrideAnchorPositioningSupport(undefined);
  vi.restoreAllMocks();
});

it("reports anchor positioning as supported only when both halves are", () => {
  const supports = vi.spyOn(CSS, "supports").mockReturnValue(true);

  overrideAnchorPositioningSupport(undefined);
  expect(supportsAnchorPositioning()).toBe(true);
  expect(supports).toHaveBeenCalledWith("anchor-name: --x");
  expect(supports).toHaveBeenCalledWith("position-area: bottom");

  // An engine can ship the naming half without the areas, and every stylesheet in the library is
  // written in terms of the areas.
  overrideAnchorPositioningSupport(undefined);
  supports.mockImplementation((property: string) => !property.startsWith("position-area"));
  expect(supportsAnchorPositioning()).toBe(false);
});

it("asks the browser once and remembers the answer", () => {
  const supports = vi.spyOn(CSS, "supports").mockReturnValue(true);

  overrideAnchorPositioningSupport(undefined);
  expect(supportsAnchorPositioning()).toBe(true);
  const asked = supports.mock.calls.length;

  supports.mockReturnValue(false);
  expect(supportsAnchorPositioning()).toBe(true);
  expect(supports.mock.calls.length).toBe(asked);
});

it("hangs the panel under the anchor, centred on it", () => {
  const anchor = anchorAt(200, 100);
  const panel = panelOf(60, 40);

  position(panel, anchor, { gap: 4 });

  expect(boxOf(panel)).toEqual({ top: 200 + ANCHOR_HEIGHT + 4, left: 130, width: 60, height: 40 });
  expect(panel.style.position).toBe("absolute");
  expect(panel.style.margin).toBe("0px");
});

it("lines the panel up with the start of the anchor when asked", () => {
  const anchor = anchorAt(200, 100);
  const panel = panelOf(60, 40);

  position(panel, anchor, { gap: 4, align: "start" });

  expect(boxOf(panel).left).toBe(100);
});

it("takes the anchor's width where the stylesheet would have said anchor-size(width)", () => {
  const anchor = anchorAt(200, 40, 260);
  const panel = panelOf(60, 40);

  position(panel, anchor, { gap: 4, matchWidth: true });

  expect(boxOf(panel)).toEqual({ top: 236, left: 40, width: 260, height: 40 });
});

it("flips above the anchor when there is no room below", () => {
  const { height } = viewport();
  const anchor = anchorAt(height - ANCHOR_HEIGHT - 20, 100);
  const panel = panelOf(60, 200);

  position(panel, anchor, { gap: 4 });

  expect(boxOf(panel).top).toBe(height - ANCHOR_HEIGHT - 20 - 4 - 200);
});

it("prefers the side it is given, and gives it up only when that side has no room", () => {
  const above = anchorAt(400, 100);
  const abovePanel = panelOf(60, 100);
  position(abovePanel, above, { gap: 6, side: "top" });
  expect(boxOf(abovePanel).top).toBe(400 - 6 - 100);

  // Pinned to the top of the screen, which is exactly the case a tooltip on a toolbar hits.
  const below = anchorAt(0, 100);
  const belowPanel = panelOf(60, 100);
  position(belowPanel, below, { gap: 6, side: "top" });
  expect(boxOf(belowPanel).top).toBe(ANCHOR_HEIGHT + 6);
});

it("clamps the panel inside the viewport instead of letting it run off the side", () => {
  const { width } = viewport();
  const anchor = anchorAt(200, width - 30, 20);
  const panel = panelOf(200, 40);

  position(panel, anchor, { gap: 4, inset: 4 });

  expect(boxOf(panel).left).toBe(width - 4 - 200);

  const nearStart = anchorAt(400, 0, 20);
  const startPanel = panelOf(200, 40);
  position(startPanel, nearStart, { gap: 4, inset: 4 });

  expect(boxOf(startPanel).left).toBe(4);
});

it("leaves a panel as wide as a full-width control flush with the edge", () => {
  const { width } = viewport();
  const anchor = anchorAt(200, 0, width);
  const panel = panelOf(60, 40);

  // No inset asked for, which is the anchored path's `margin-inline: auto`: there is nowhere to
  // pull a panel that already spans the screen, and pulling it anyway is what would take it off
  // the other side.
  position(panel, anchor, { gap: 4, matchWidth: true });

  expect(boxOf(panel)).toEqual({ top: 236, left: 0, width, height: 40 });
});

it("keeps the panel with the anchor while it is open", () => {
  const anchor = anchorAt(200, 100);
  const panel = panelOf(60, 40);

  position(panel, anchor, { gap: 4 });

  anchor.style.top = "500px";
  window.dispatchEvent(new Event("resize"));
  expect(boxOf(panel).top).toBe(500 + ANCHOR_HEIGHT + 4);

  // Capture phase: a scroll inside a container never bubbles to the window, and that container is
  // the normal case -- a modal's body, a scrolling table.
  anchor.style.top = "300px";
  document.body.dispatchEvent(new Event("scroll"));
  expect(boxOf(panel).top).toBe(300 + ANCHOR_HEIGHT + 4);
});

it("follows the panel's own size, so a filtering list stays put", async () => {
  const anchor = anchorAt(200, 100);
  const panel = panelOf(60, 40);

  position(panel, anchor, { gap: 4, side: "top" });
  expect(boxOf(panel).top).toBe(200 - 4 - 40);

  panel.style.height = "90px";
  await expect.poll(() => boxOf(panel).top).toBe(200 - 4 - 90);
});

it("stops listening and puts the inline styles back on cleanup", () => {
  const anchor = anchorAt(200, 100);
  const panel = panelOf(60, 40);
  const before = panel.getAttribute("style");

  const cleanup = position(panel, anchor, { gap: 4, matchWidth: true });
  expect(panel.style.top).not.toBe("");

  cleanup();

  expect(panel.getAttribute("style")).toBe(before);

  anchor.style.top = "600px";
  window.dispatchEvent(new Event("resize"));
  document.body.dispatchEvent(new Event("scroll"));
  expect(panel.style.top).toBe("");
});
