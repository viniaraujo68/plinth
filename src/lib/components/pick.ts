/**
 * The brand mark's outline, stated once. `Logo` strokes it; anything that wants the pick as a
 * silhouette — the shell's avatar, a placeholder cut to the same shape — clips to it. Three
 * copies of the same curve would drift the moment one of them is nudged.
 *
 * Drawn in a 32-unit square, and the curve is the mark's centre line: stroked at 3.5 it reaches
 * 1.75 units past this on every side, so a fill of the same path is the smaller of the two shapes.
 */
export const PICK_PATH =
  "M16 3.6 C17.8 3.6 19 5 20 7 L25.1 17.2 C26.6 20 27 22 26.3 23.7 C24.7 27 20.9 28.6 16 28.6 C11.1 28.6 7.3 27 5.7 23.7 C5 22 5.4 20 6.9 17.2 L12 7 C13 5 14.2 3.6 16 3.6 Z";

/**
 * The same outline in the 0..1 space a `<clipPath clipPathUnits="objectBoundingBox">` wants, which
 * is what makes one declaration fit an avatar of any size. CSS `clip-path: path()` cannot: its
 * coordinates are user units and never scale with the box.
 *
 * Scaling every number in the string is only sound because the outline is `M`/`L`/`C` with
 * absolute coordinates — an arc would carry sweep flags in the same stream and come out mangled.
 */
export const PICK_CLIP_PATH = PICK_PATH.replace(/[\d.]+/g, (value) => String(Number(value) / 32));
