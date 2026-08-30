<script lang="ts">
  import { flushSync, type Snippet } from "svelte";
  import type { Attachment } from "svelte/attachments";
  import type { HTMLDialogAttributes } from "svelte/elements";

  interface Props extends HTMLDialogAttributes {
    /** Rendered only while the dialog is on screen. */
    children: Snippet;
  }

  let { children, ...rest }: Props = $props();

  let mounted = $state(false);
  let element = $state<HTMLDialogElement>();

  /**
   * Mount the content and raise the dialog into the top layer as a modal.
   *
   * Safe to call on an already open dialog, which `showModal()` itself is not.
   */
  export function show() {
    mounted = true;
    // The element does not exist until the block below has been applied to the DOM. Flushing here
    // is what keeps `show()` a plain synchronous call: without it the caller would have to await a
    // tick before the dialog it just asked for exists.
    flushSync();
    if (element && !element.open) element.showModal();
  }

  /** Close the dialog. The content stays mounted until the element has finished disappearing. */
  export function close(returnValue?: string) {
    element?.close(returnValue);
  }

  const unmountWhenHidden: Attachment<HTMLDialogElement> = (dialog) => {
    const listener = (event: Event) => {
      // Opening transitions too, and the `toggle` that announces the open state arrives while the
      // element is still being raised. Only an end state that is actually invisible may unmount.
      if (event instanceof ToggleEvent && event.newState === "open") return;

      // Being closed and being gone are not the same thing. A stylesheet that keeps the element
      // displayed while fading it out -- daisyUI's `.modal` is `display: grid` at all times and
      // animates `visibility` -- would otherwise have the content ripped out mid-animation, so the
      // question asked here is "has it finished disappearing", not "is the open attribute gone".
      if (mounted && !dialog.checkVisibility({ opacityProperty: true, visibilityProperty: true }))
        mounted = false;
    };

    // `toggle` covers an instant hide (no transition, or reduced motion); the two transition events
    // cover a fade, including one cut short by a reopen.
    dialog.addEventListener("toggle", listener);
    dialog.addEventListener("transitionend", listener);
    dialog.addEventListener("transitioncancel", listener);

    return () => {
      dialog.removeEventListener("toggle", listener);
      dialog.removeEventListener("transitionend", listener);
      dialog.removeEventListener("transitioncancel", listener);
    };
  };

  // The element's own `open` attribute is the other way in, and it shows the dialog NON-modally:
  // no top layer, no inert background, no Escape. Seeding the mount from it keeps that path from
  // rendering an empty shell.
  $effect(() => {
    if (rest.open) mounted = true;
  });
</script>

<!--
@component
A native `<dialog>` that only exists while it is on screen.

The point of the wrapper is what it does NOT do. Modality, the focus trap, Escape, returning focus
to whatever opened it and stacking above the rest of the page without a z-index fight are all the
browser's, delivered by `showModal()` and correct in a way a hand-rolled overlay rarely is. This
component adds one thing on top: the content is mounted on `show()` and unmounted once the element
has finished disappearing, so a page can declare a dozen dialogs -- each with its own form, fetch
or chart inside -- and pay for none of them until one is opened.

There is no chrome here: no title, no close button, no padding. Use `Modal` for that, or style the
element yourself through `class` and any other `<dialog>` attribute, which are forwarded.

```svelte
<script lang="ts">
  let confirmation = $state<Dialog>();
</script>

<button onclick={() => confirmation?.show()}>Delete</button>

<Dialog bind:this={confirmation} class="rounded-box bg-base-100 p-6">
  <p>This cannot be undone.</p>
  <button onclick={() => confirmation?.close()}>Cancel</button>
</Dialog>
```
-->

{#if mounted}
  <dialog bind:this={element} {@attach unmountWhenHidden} {...rest}>
    {@render children()}
  </dialog>
{/if}
