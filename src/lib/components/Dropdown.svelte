<script lang="ts">
  import { onDestroy, type Snippet } from "svelte";
  import type { ClassValue, HTMLButtonAttributes } from "svelte/elements";
  import { positionUnder, supportsAnchorPositioning } from "../anchoring.js";

  type Props = HTMLButtonAttributes & {
    children: Snippet;
    content: Snippet;
    /** Classes for the panel — the only part of this component the trigger's `class` cannot
        reach, since the trigger is the root. */
    panelClass?: ClassValue | null;
  };

  let { children, content, panelClass, type, ...rest }: Props = $props();

  // `popovertarget` needs a document-unique id, and `$props.id()` is the only source of one that
  // is stable across server render and hydration.
  const uid = $props.id();
  const panelId = `plinth-dropdown-${uid}`;
  const anchorName = `--${panelId}`;

  let isOpen = $state(false);
  let isMounted = $state(false);
  let trigger = $state<HTMLButtonElement>();
  let panel = $state<HTMLElement>();

  let stopPositioning: (() => void) | undefined;

  /* Without anchor positioning the placement rules at the bottom of this file are dropped and
     the UA popover ones -- `position: fixed; inset: 0; margin: auto` -- are all that is left,
     which floats the panel in the middle of the screen with no relation to the trigger. Script
     places it instead, to the geometry `position-area: bottom` gives: centred on the trigger,
     right under it, and above it when there is no room below. */
  const reposition = () => {
    stopPositioning?.();
    stopPositioning = undefined;
    if (!panel || !trigger || supportsAnchorPositioning()) return;

    stopPositioning = positionUnder(panel, trigger);
  };

  const releasePositioning = () => {
    stopPositioning?.();
    stopPositioning = undefined;
  };

  // A panel left open when the dropdown is destroyed would otherwise leave the reposition
  // listeners on the window, holding a detached element.
  onDestroy(releasePositioning);

  /**
   * Opens the panel.
   *
   * The content is mounted before the popover is shown. The `toggle` event that normally does
   * that fires asynchronously, which would paint one frame of empty panel; the trigger button
   * never hits this because it pre-mounts on pointer-down, well before the click lands.
   */
  export function open() {
    isMounted = true;
    if (panel && !panel.matches(":popover-open")) panel.showPopover();
    reposition();
  }

  /** Closes the panel — for dismissing it once an action inside `content` has finished. */
  export function close() {
    panel?.hidePopover();
  }

  /* A hidden popover stops rendering entirely, which freezes any exit transition mid-flight and
     means its `transitionend` never arrives. Asking the element whether it is actually visible is
     the only reading that holds for both an animated and an instant close. */
  const unmountWhenHidden = () => {
    if (panel && !panel.checkVisibility({ opacityProperty: true, visibilityProperty: true }))
      isMounted = false;
  };
  /* See OptionPanel: a descendant's transition must not be mistaken for the panel's exit. */
  const onTransitionSettled = (event: TransitionEvent) => {
    if (event.target === event.currentTarget) unmountWhenHidden();
  };

  const onToggle = (event: ToggleEvent) => {
    isOpen = event.newState === "open";
    if (isOpen) {
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
A button that toggles a panel through the native popover API, so clicking the trigger again,
clicking outside, and pressing Escape all dismiss it without a single listener of our own. The
button is the root: class, handlers and aria go straight onto it, and `panelClass` styles the
panel.

The popover itself — not a local flag — is the source of truth for open/closed; `aria-expanded`
and the mounted content are read back from its `toggle` event. Content mounts on first open and
unmounts once the panel is really hidden, so an expensive menu costs nothing until it is used.

`open()` and `close()` are exposed for `bind:this`, which is what a form inside the panel needs to
dismiss itself after submitting.

```svelte
<Dropdown bind:this={menu} class="btn" panelClass="dropdown menu w-56 rounded-box bg-base-200 p-2">
  Actions
  {#snippet content()}
    <li><button onclick={() => menu.close()}>Archive</button></li>
  {/snippet}
</Dropdown>
```
-->

<button
  {...rest}
  bind:this={trigger}
  type={type ?? "button"}
  popovertarget={panelId}
  aria-expanded={isOpen}
  style:anchor-name={anchorName}
  onpointerdown={() => (isMounted = true)}
>
  {@render children()}
</button>
<div
  bind:this={panel}
  class={panelClass}
  popover
  id={panelId}
  style:position-anchor={anchorName}
  ontoggle={onToggle}
  ontransitionend={onTransitionSettled}
  ontransitioncancel={onTransitionSettled}
>
  {#if isMounted}
    {@render content()}
  {/if}
</div>

<style>
  [popover] {
    position-area: bottom;
    position-try: top, left, right;
  }

  /* A closed popover is hidden by a rule in the UA stylesheet, which every author rule outranks --
     including the `display: flex` that daisyUI's `menu` and friends carry. Passing one of those
     through `panelClass` would otherwise pin the panel open with no error anywhere. Restating the
     rule here puts it at a specificity a utility class cannot reach, while leaving an exit
     transition possible for a caller who asks for one with `transition-behavior: allow-discrete`. */
  [popover]:not(:popover-open) {
    display: none;
  }
</style>
