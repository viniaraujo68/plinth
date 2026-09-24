/**
 * Resolves CSS colour expressions — `var(--color-primary)`, a `color-mix()` over theme tokens —
 * into the concrete colour strings a canvas needs. A chart library draws on a `<canvas>`, which
 * knows nothing of custom properties, so a chart that follows the theme has to ask the page what
 * its tokens currently compute to, in the right place in the tree.
 */
export interface CssColorReader {
  /**
   * The computed colour of `expression` inside the host, as `rgb(...)` or whatever the browser
   * serialises it to. `fallback` answers for an expression the browser rejects — a typo, or a
   * colour function it does not support yet.
   */
  read: (expression: string, fallback: string) => string;
  /** Removes the probe element. Reads after this answer the fallback. */
  dispose: () => void;
}

/**
 * One hidden probe element, appended inside `host` so custom properties resolve against the host's
 * own cascade — a theme scoped to a subtree, a palette declared on the chart's wrapper — rather
 * than against the document root. The probe is reused for every read, since each one costs a style
 * recalculation and a chart reads a dozen colours per render.
 */
export const createCssColorReader = (host: HTMLElement): CssColorReader => {
  const probe = document.createElement("span");
  probe.style.position = "absolute";
  probe.style.visibility = "hidden";
  probe.style.pointerEvents = "none";
  host.appendChild(probe);
  let disposed = false;

  return {
    read(expression, fallback) {
      if (disposed) return fallback;
      probe.style.color = "";
      probe.style.color = expression;
      // An expression the browser cannot parse leaves the declaration empty, and the computed
      // colour would then be whatever the probe inherits — a colour, just not the one asked for.
      if (probe.style.color === "") return fallback;
      return getComputedStyle(probe).color || fallback;
    },
    dispose() {
      disposed = true;
      probe.remove();
    },
  };
};
