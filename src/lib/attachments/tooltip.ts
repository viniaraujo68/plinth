import type { Attachment } from "svelte/attachments";
import { positionUnder, supportsAnchorPositioning } from "../anchoring.js";

export interface TooltipOptions {
  /** Keeps the wiring attached but suppresses the panel, so a caller can gate a tooltip on
      state — a rail label that is only worth showing while the rail is collapsed, say — without
      conditionally applying the attachment and losing the listeners on every toggle. */
  disabled?: boolean;
}

/* Anchor positioning links a panel to its trigger through a document-wide custom ident, so every
   binding needs an ident nothing else uses. A module-level counter is enough: the pair is created
   and torn down together, and the value never leaves this module. */
let bindingCount = 0;

/** The panel's `margin` below, in pixels: `0.375rem` at the default root size. The script
    fallback needs the number, since it places the panel from `getBoundingClientRect()` readings. */
const GAP = 6;

/* The panel is styled imperatively rather than through utility classes because the panel of the
   string variant is created by this module, outside any component — a consumer's Tailwind build
   has no source file to scan for those classes and would emit nothing. Reading the daisyUI custom
   properties keeps it themed anyway, including inside a `data-theme` subtree. */
const applyPanelStyle = (panel: HTMLElement, anchorName: string) => {
  panel.popover = "manual";
  panel.role = "tooltip";
  panel.style.setProperty("position-anchor", anchorName);
  panel.style.setProperty("position-area", "top");
  panel.style.setProperty("position-try-fallbacks", "flip-block, flip-inline");
  Object.assign(panel.style, {
    // A tooltip that swallows the pointer is a flicker loop: content taller than a small trigger
    // ends up covering it, the host sees mouseleave, the panel hides, the host sees mouseenter
    // again. Staying transparent to hit-testing is what breaks the cycle.
    pointerEvents: "none",
    margin: "0.375rem",
    width: "max-content",
    maxWidth: "20rem",
    padding: "0.25rem 0.5rem",
    fontSize: "0.8125rem",
    lineHeight: "1.25",
    color: "var(--color-base-content)",
    background: "var(--color-base-100)",
    border: "1px solid color-mix(in oklch, var(--color-base-content) 15%, transparent)",
    borderRadius: "var(--radius-field)",
    boxShadow: "0 8px 24px rgb(0 0 0 / 0.2)",
  } satisfies Partial<CSSStyleDeclaration>);
};

const bind = (
  host: HTMLElement,
  resolvePanel: () => HTMLElement | undefined,
  options: TooltipOptions,
  /* A panel the caller rendered is already in the document and visible; only `popover` takes it
     out of the flow, so it has to be prepared immediately. A panel this module owns is created on
     demand and can stay unprepared until the first show. */
  prepareImmediately: boolean,
) => {
  const panelId = `plinth-tooltip-${bindingCount++}`;
  const anchorName = `--${panelId}`;
  let panel: HTMLElement | undefined;

  // The host may already carry either of these from the caller's own markup; both are restored
  // verbatim on teardown so an attachment that re-runs leaves nothing behind.
  const inheritedDescribedBy = host.getAttribute("aria-describedby");
  const inheritedAnchorName = host.style.getPropertyValue("anchor-name");
  host.style.setProperty("anchor-name", anchorName);

  const prepare = () => {
    if (panel) return panel;
    panel = resolvePanel();
    if (!panel) return undefined;
    panel.id = panelId;
    applyPanelStyle(panel, anchorName);
    host.setAttribute(
      "aria-describedby",
      [inheritedDescribedBy, panelId].filter(Boolean).join(" "),
    );
    return panel;
  };

  if (prepareImmediately) prepare();

  let stopPositioning: (() => void) | undefined;

  const show = () => {
    // Read through `options` at show time, not at bind time: a caller passing a plain object that
    // it mutates would otherwise be stuck with whatever the flag was when the pair was created.
    if (options.disabled) return;

    const shown = prepare();
    if (!shown) return;
    shown.showPopover();

    /* Without anchor positioning the `position-area` above is dropped and the UA popover rules
       are all that is left, which -- with the `margin` overriding their `margin: auto` -- pins the
       panel to the top corner of the screen. Script places it instead, to the same geometry:
       centred on the host, above it, and below it when there is no room, which is `flip-block`. */
    stopPositioning?.();
    stopPositioning = supportsAnchorPositioning()
      ? undefined
      : positionUnder(shown, host, { side: "top", gap: GAP, inset: GAP });
  };

  const hide = () => {
    stopPositioning?.();
    stopPositioning = undefined;
    panel?.hidePopover();
  };

  // A manual popover has no light dismiss, and the pointer never enters the panel, so Escape on
  // the host is the only way out for someone reading the tooltip from the keyboard.
  const onKeydown = (event: KeyboardEvent) => {
    if (event.key === "Escape") hide();
  };

  host.addEventListener("mouseenter", show);
  host.addEventListener("mouseleave", hide);
  host.addEventListener("focusin", show);
  host.addEventListener("focusout", hide);
  host.addEventListener("keydown", onKeydown);

  return () => {
    host.removeEventListener("mouseenter", show);
    host.removeEventListener("mouseleave", hide);
    host.removeEventListener("focusin", show);
    host.removeEventListener("focusout", hide);
    host.removeEventListener("keydown", onKeydown);
    hide();

    host.style.removeProperty("anchor-name");
    if (inheritedAnchorName) host.style.setProperty("anchor-name", inheritedAnchorName);
    if (inheritedDescribedBy) host.setAttribute("aria-describedby", inheritedDescribedBy);
    else host.removeAttribute("aria-describedby");
  };
};

/**
 * Attaches a plain-text tooltip to the host, shown on hover and on keyboard focus.
 *
 * The host stays the root of whatever the caller renders, so layout that depends on the element's
 * own position — `join-item`, a grid cell, a flex child — keeps working untouched.
 *
 * ```svelte
 * <button class="btn" {@attach tooltip("Archive")}>…</button>
 * ```
 *
 * The panel is created lazily and owned by this attachment, which is what makes it cheap enough
 * for one per row of a long list. Rich content belongs in markup instead — see `tooltipPanel`.
 */
export function tooltip(text: string, options: TooltipOptions = {}): Attachment<HTMLElement> {
  return (host) => {
    let ownedPanel: HTMLDivElement | undefined;

    const unbind = bind(
      host,
      () => {
        if (!ownedPanel) {
          ownedPanel = document.createElement("div");
          ownedPanel.textContent = text;
          // Appended to the body rather than next to the host: an anchored popover escapes
          // `overflow: hidden` and stacking contexts only from the top layer, and the top layer
          // is only reachable from an element the host does not clip.
          document.body.appendChild(ownedPanel);
        }
        return ownedPanel;
      },
      options,
      false,
    );

    return () => {
      unbind();
      ownedPanel?.remove();
    };
  };
}

/**
 * Wires the same hover and focus behavior between the host and a panel the caller renders itself,
 * which is what rich content needs: a snippet rendered in the caller's markup keeps its component
 * context, its scoped styles and its reactivity, none of which survive `createElement`.
 *
 * The panel is given the sanctioned tooltip styling when the attachment runs.
 *
 * Reactivity is `{@attach}`'s own: the expression re-runs whenever `panel` changes, tearing the
 * old binding down and building a new one.
 *
 * ```svelte
 * <span {@attach tooltipPanel(panel)}>…</span>
 * <div bind:this={panel} popover="manual" role="tooltip">rich <strong>content</strong></div>
 * ```
 */
export function tooltipPanel(
  panel: HTMLElement | undefined | null,
  options: TooltipOptions = {},
): Attachment<HTMLElement> {
  return (host) => bind(host, () => panel ?? undefined, options, true);
}
