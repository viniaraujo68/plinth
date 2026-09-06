<script lang="ts">
  import { flushSync, onDestroy, type Snippet } from "svelte";
  import type { ClassValue } from "svelte/elements";
  import { positionUnder, supportsAnchorPositioning } from "../anchoring.js";
  import type { SelectOption } from "./select.js";

  /** `margin-block: 0.25rem` below, in pixels: the gap the anchored path puts under the control. */
  const GAP = 4;

  interface Props {
    /** Document-unique id of the popover. `Select` names it from the trigger's `popovertarget`. */
    id: string;
    /** The `anchor-name` the control declares, which is what the panel hangs itself under. */
    anchorName: string;
    /**
     * The control itself. Read only where the browser has no anchor positioning and the panel has
     * to be placed by script — measuring it is the one thing {@link Props.anchorName} cannot do.
     */
    anchor?: HTMLElement;
    listboxId: string;
    /** Id of the control the listbox borrows its accessible name from. */
    labelledBy: string;
    /** The rows to render — already filtered, in the order they are shown. */
    options: readonly SelectOption[];
    /** The selected value, marked with a ✓ and `aria-selected`. */
    value: string | null;
    /** Index into `options`, or `-1`. The control owns it: the arrows move it, Enter reads it. */
    highlighted: number;
    /** Row ids, so the control can point `aria-activedescendant` at the same element. */
    optionId: (index: number) => string;
    option?: Snippet<[SelectOption]>;
    /** Shown in place of the list when `options` is empty. Nothing is rendered without one. */
    emptyLabel?: string;
    class?: ClassValue;
    /**
     * Open and close, reported from `beforetoggle` rather than from `toggle`: it is synchronous,
     * so a control can settle its own state — the highlight, the text a `Combobox` puts back —
     * in the same task the panel changes state, with no frame in between showing the other one.
     */
    onopenchange: (open: boolean) => void;
    onhighlight: (value: string) => void;
    onchoose: (option: SelectOption) => void;
  }

  let {
    id,
    anchorName,
    anchor,
    listboxId,
    labelledBy,
    options,
    value,
    highlighted,
    optionId,
    option,
    emptyLabel,
    class: className,
    onopenchange,
    onhighlight,
    onchoose,
  }: Props = $props();

  let panel = $state<HTMLDivElement>();
  let isMounted = $state(false);

  let stopPositioning: (() => void) | undefined;

  /* Without anchor positioning the placement rules at the bottom of this file are dropped and
     the UA popover ones are all that is left -- which, with the `margin-block` below overriding
     half of their `margin: auto`, pins the panel to the top of the screen at an intrinsic width.
     Script places it instead, to the same geometry: under the control, as wide as it, a hair
     below it, and above it when there is no room. */
  const reposition = () => {
    stopPositioning?.();
    stopPositioning = undefined;
    if (!panel || !anchor || supportsAnchorPositioning()) return;

    stopPositioning = positionUnder(panel, anchor, { gap: GAP, matchWidth: true });
  };

  const releasePositioning = () => {
    stopPositioning?.();
    stopPositioning = undefined;
  };

  // A panel left open when its control is destroyed would otherwise leave the reposition
  // listeners on the window, holding a detached element.
  onDestroy(releasePositioning);

  /** Shows the panel. For a control that is not a `popovertarget` invoker — a `Combobox` input. */
  export function show() {
    isMounted = true;
    if (panel && !panel.matches(":popover-open")) panel.showPopover();
    // Ahead of the `toggle` event, which arrives a task later: the panel is on screen from this
    // line onwards, so anything but a synchronous placement is a painted frame in the wrong place.
    reposition();
  }

  export function hide() {
    panel?.hidePopover();
  }

  export function isShown() {
    return panel?.matches(":popover-open") ?? false;
  }

  // The highlight is an attribute on the control, not a focus ring the browser scrolls to on its
  // own, so keeping it on screen is ours to do. `nearest` is what makes it a nudge of the list
  // rather than a jump of the page.
  $effect(() => {
    if (!isMounted || highlighted < 0) return;

    document.getElementById(optionId(highlighted))?.scrollIntoView({
      block: "nearest",
      inline: "nearest",
    });
  });

  /* A hidden popover stops rendering entirely, which freezes any exit transition mid-flight and
     means its `transitionend` never arrives. Asking the element whether it is actually visible is
     the only reading that holds for both an animated and an instant close. */
  const unmountWhenHidden = () => {
    if (panel && !panel.checkVisibility({ opacityProperty: true, visibilityProperty: true }))
      isMounted = false;
  };

  const onBeforeToggle = (event: ToggleEvent) => {
    const open = event.newState === "open";
    onopenchange(open);
    if (!open) return;

    isMounted = true;
    // The browser shows the popover in this same task, so the rows have to exist before the
    // handler returns -- otherwise the first painted frame is an empty panel.
    flushSync();
  };

  const onToggle = (event: ToggleEvent) => {
    if (event.newState === "open") {
      isMounted = true;
      reposition();
    } else {
      releasePositioning();
      unmountWhenHidden();
    }
  };
</script>

<!--
@component
Internal. The top-layer list `Select` and `Combobox` both drop under their control: the popover
element, the rows, the highlight's scrolling and the mount bookkeeping. Neither the query nor the
selection lives here — the control owns both and hands down what to draw.

Not exported from the package: it is the shared half of two components, not a third one.
-->

<div
  bind:this={panel}
  popover
  {id}
  class={[
    "flex flex-col overflow-hidden rounded-box border border-base-content/10 bg-base-100 shadow-lg",
    className,
  ]}
  style:position-anchor={anchorName}
  onbeforetoggle={onBeforeToggle}
  ontoggle={onToggle}
  ontransitionend={unmountWhenHidden}
  ontransitioncancel={unmountWhenHidden}
>
  {#if isMounted}
    <div
      id={listboxId}
      role="listbox"
      aria-labelledby={labelledBy}
      class="max-h-64 min-h-0 flex-1 overflow-y-auto overscroll-contain p-1"
    >
      {#each options as candidate, index (candidate.value)}
        <button
          type="button"
          id={optionId(index)}
          role="option"
          tabindex="-1"
          disabled={candidate.disabled}
          aria-selected={candidate.value === value}
          aria-disabled={candidate.disabled}
          class={[
            "flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-field px-3 py-2 text-start text-sm",
            // A tint of the foreground rather than a step of the surface: base-200 is lighter than
            // base-100 in a light theme and darker in a dark one, so a surface step reads as
            // "raised" in one and "recessed" in the other.
            index === highlighted && "bg-base-content/10",
            candidate.disabled && "cursor-not-allowed opacity-40",
          ]}
          onmousedown={(event) => event.preventDefault()}
          onpointermove={() => onhighlight(candidate.value)}
          onclick={() => onchoose(candidate)}
        >
          <span class="min-w-0 flex-1 truncate">
            {#if option}{@render option(candidate)}{:else}{candidate.label}{/if}
          </span>
          <span class="flex-none text-xs" aria-hidden="true">
            {candidate.value === value ? "✓" : ""}
          </span>
        </button>
      {/each}

      {#if options.length === 0 && emptyLabel !== undefined}
        <p class="px-3 py-4 text-center text-sm text-base-content/60">{emptyLabel}</p>
      {/if}
    </div>
  {/if}
</div>

<style>
  [popover] {
    position-area: bottom;
    position-try: top;
    /* The panel is the control's list, so it is the control's width -- an option that fits the
       closed control fits the open one. */
    width: anchor-size(width);
    /* Overriding the UA's `margin: auto`, which would otherwise centre the panel in the whole
       region below the anchor instead of hanging it just under the control. The inline margins
       stay auto so the panel keeps sitting over the anchor. */
    margin-block: 0.25rem;
  }

  /* A closed popover is hidden by a rule in the UA stylesheet, which every author rule outranks --
     including any `display` a utility class on the panel might carry. Restating the rule here puts
     it at a specificity a utility cannot reach, while leaving an exit transition possible for a
     caller who asks for one with `transition-behavior: allow-discrete`. */
  [popover]:not(:popover-open) {
    display: none;
  }
</style>
