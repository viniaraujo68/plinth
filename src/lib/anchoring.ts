/* Every popover in this library is placed with CSS anchor positioning -- `anchor-name`,
   `position-area`, `position-try`, `anchor-size()` -- which is the right tool and also a very
   recent one: Chromium 125, Safari only with iOS/macOS 26, and nothing stable in Firefox. A
   browser without it does not degrade to something reasonable. The anchored declarations are
   dropped, the UA popover rules (`position: fixed; inset: 0; margin: auto`) are what is left, and
   the panel lands in the middle of the screen at an intrinsic width -- or, once an author margin
   overrides part of that `auto`, pinned to the top edge, which is the shape the bug was reported
   in from a real phone.

   This module is the other half of the enhancement: where the CSS works nothing here runs, and
   where it does not, script writes the same geometry the stylesheet would have produced. */

let support: boolean | undefined;

const detect = () =>
  typeof CSS !== "undefined" &&
  CSS.supports("anchor-name: --x") &&
  CSS.supports("position-area: bottom");

/**
 * Whether the browser can place a popover against an anchor on its own.
 *
 * Both halves are asked for: an engine can ship the `anchor-name`/`anchor()` pair without
 * `position-area`, and the library's stylesheets are written in terms of the areas.
 *
 * Memoised — the answer cannot change for the life of a document — and safe on the server, where
 * there is no `CSS` object and the reply is `false`.
 */
export function supportsAnchorPositioning(): boolean {
  support ??= detect();
  return support;
}

/**
 * @internal Forces what {@link supportsAnchorPositioning} reports, or hands the question back to
 * feature detection with `undefined`. A test seam and nothing else: the detection is memoised, so
 * a spec that only stubs `CSS.supports` may find the answer already cached. Not exported from the
 * package.
 */
export function overrideAnchorPositioningSupport(value: boolean | undefined): void {
  support = value;
}

export interface AnchoredPlacement {
  /**
   * Which side of the anchor the panel prefers. It flips to the other one when the preferred side
   * has no room for it, which is the `position-try: top` / `flip-block` parity. Defaults to
   * `"bottom"`.
   */
  side?: "bottom" | "top";
  /**
   * How the panel lines up with the anchor across the inline axis. `position-area` centres a panel
   * on its anchor, so `"center"` is the parity and the default; `"start"` only differs for a panel
   * that is not as wide as the anchor.
   */
  align?: "center" | "start";
  /** Pixels kept between the anchor and the panel — the margin the anchored path carries across
      that axis. */
  gap?: number;
  /**
   * Pixels kept between the panel and the edges of the screen when it has to be pulled back onto
   * it — the margin the anchored path carries across the other axis, which is what a supporting
   * browser keeps when it clamps an anchored panel in. Defaults to none, which is right for a
   * panel whose anchored margin is `auto`: one as wide as a full-width control has nowhere to be
   * pulled to.
   */
  inset?: number;
  /** Whether the panel takes the anchor's width: the `width: anchor-size(width)` parity. */
  matchWidth?: boolean;
}

const clamp = (value: number, lowest: number, highest: number) =>
  highest < lowest ? lowest : Math.min(Math.max(value, lowest), highest);

/**
 * Places `panel` against `anchor` from script, for a browser that cannot do it in CSS.
 *
 * Under the anchor by default, above it when asked for or when there is no room below, as wide as
 * the anchor when the caller's stylesheet says `anchor-size(width)`, and never off the side of the
 * screen. The panel is expected to be a shown popover: it is measured, so it has to have a box.
 *
 * The placement is kept up to date for as long as the panel is open — scrolling, resizing, a
 * phone's on-screen keyboard, and a change of size at either end all move it — and the returned
 * function is what ends that: it drops every listener and puts the inline styles back the way it
 * found them. Call it on close, and call it again on the next open.
 *
 * `position-try: left, right` has no counterpart here: a panel that fits on neither side of the
 * anchor is clamped into the viewport instead of moved beside it. It stays reachable, which is the
 * whole point of the fallback, and no supporting browser takes this path.
 */
export function positionUnder(
  panel: HTMLElement,
  anchor: HTMLElement,
  placement: AnchoredPlacement = {},
): () => void {
  const { side = "bottom", align = "center", gap = 0, inset = 0, matchWidth = false } = placement;

  const original = new Map<string, string>();
  const write = (property: string, value: string) => {
    if (!original.has(property)) original.set(property, panel.style.getPropertyValue(property));
    panel.style.setProperty(property, value);
  };

  const place = () => {
    const target = anchor.getBoundingClientRect();

    write("position", "fixed");
    write("margin", "0");
    /* Both of these are the initial values, so writing them costs nothing in the browser this
       exists for -- it does not know the properties and drops the declarations. What they buy is
       that nothing else can be positioning the panel at the same time: an engine that took
       `anchor-name` but not `position-area`, and a supporting engine a test has forced down this
       path, would otherwise resolve the `top` below against the anchored containing block. */
    write("position-area", "none");
    write("position-try-fallbacks", "none");
    /* The UA popover rules leave `inset: 0` behind, and a box with both `left` and `right` set
       stretches to fill its containing block instead of taking its own width. Zeroing `left`
       before measuring also gives a panel with no width of its own the whole viewport to
       shrink-to-fit against, so the reading below is the widest it can be -- and the clamp keeps
       it there, so moving it cannot narrow it again. */
    write("right", "auto");
    write("bottom", "auto");
    write("left", "0");
    if (matchWidth) write("width", `${target.width}px`);

    const { width, height } = panel.getBoundingClientRect();
    // A panel with no box is a panel that is not being shown -- a size observation that arrived
    // after the close, most likely. Nothing to place, and nothing worth writing a stale top for.
    if (width === 0 && height === 0) return;

    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = document.documentElement.clientHeight;

    // The gap goes between the anchor and the panel and the inset between the panel and the edge
    // of the screen, which is what makes "it fits" the same question the clamp below answers.
    const fitsBelow = height <= viewportHeight - target.bottom - gap - inset;
    const fitsAbove = height <= target.top - gap - inset;
    const above = side === "top" ? fitsAbove || !fitsBelow : !fitsBelow && fitsAbove;

    const top = above ? target.top - gap - height : target.bottom + gap;
    const left = align === "start" ? target.left : target.left + (target.width - width) / 2;

    write("top", `${clamp(top, inset, viewportHeight - inset - height)}px`);
    write("left", `${clamp(left, inset, viewportWidth - inset - width)}px`);
  };

  place();

  /* Capture, because a scroll that moves the anchor is very often a scroll inside something --
     a modal's body, a scrolling table -- and a `scroll` event from an element never reaches the
     window by bubbling. */
  window.addEventListener("scroll", place, { capture: true, passive: true });
  window.addEventListener("resize", place);
  /* The visual viewport is the one a phone's on-screen keyboard and pinch-zoom change, and
     neither of those fires `resize` on the window. */
  window.visualViewport?.addEventListener("resize", place);

  /* Either box changing size changes the placement: the flip and both clamps are measurements. It
     is also what keeps a `Combobox` panel under its field while the query filters rows away, with
     no reactive plumbing in the component. */
  const observer = new ResizeObserver(place);
  observer.observe(panel);
  observer.observe(anchor);

  return () => {
    observer.disconnect();
    window.removeEventListener("scroll", place, { capture: true });
    window.removeEventListener("resize", place);
    window.visualViewport?.removeEventListener("resize", place);

    for (const [property, value] of original)
      if (value) panel.style.setProperty(property, value);
      else panel.style.removeProperty(property);
  };
}
