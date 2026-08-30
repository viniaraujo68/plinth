<script lang="ts">
  import type { Snippet } from "svelte";
  import type { ClassValue } from "svelte/elements";
  import Dialog from "./Dialog.svelte";

  interface Props {
    /** Names the dialog for assistive technology, and heads it visually. */
    title: string;
    /** The scrollable body. */
    children: Snippet;
    /** Actions, laid out end-aligned under a divider. Nothing is rendered when it is omitted. */
    footer?: Snippet;
    /** Extra classes for the box -- width, max-width, a taller cap. Not for the backdrop. */
    class?: ClassValue;
    /** Accessible name of the close button. A prop because the library ships no translations. */
    closeLabel?: string;
    /**
     * Whether the modal can be dismissed without a decision. `false` removes the close button and
     * blocks both Escape and the click outside, which makes the footer the only way out -- so a
     * modal that sets it owes the user an explicit action there.
     */
    dismissible?: boolean;
    /** Called once the modal has actually closed, whichever way it was closed. */
    onclose?: () => void;
  }

  let {
    title,
    children,
    footer,
    class: className,
    closeLabel = "Close",
    dismissible = true,
    onclose,
  }: Props = $props();

  const titleId = $props.id();

  let dialog = $state<Dialog>();
  let box = $state<HTMLDivElement>();
  let closeButton = $state<HTMLButtonElement>();
  let open = $state(false);
  let pressedOutside = false;

  /** Open the modal. The content is mounted by this call, not before it. */
  export function show() {
    open = true;
    dialog?.show();

    // The browser's initial focus lands on the first focusable descendant, which is the ✕ --
    // opening a dialog on "close" is a poor first move, and it tells a screen reader nothing about
    // what was opened. Anything the content marks `autofocus` is chosen ahead of the button, so
    // only this fallback needs correcting, and the box is the target the dialog pattern names.
    if (closeButton && document.activeElement === closeButton) box?.focus();
  }

  /** Close the modal. `onclose` fires after the element reports itself closed. */
  export function close() {
    dialog?.close();
  }

  $effect(() => {
    if (!open) return;

    // A native modal makes the rest of the document inert, but it does not stop it from SCROLLING
    // behind the backdrop. Saving the inline value instead of toggling a class is what lets a
    // modal opened over another modal put back exactly what it found. Compensating for the
    // scrollbar that disappears with it is the app's call, through `scrollbar-gutter: stable`.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  });
</script>

<!--
@component
A dialog with chrome: a title, a close button, a scrollable body and an optional footer.

Composition over `Dialog`, so modality, the focus trap, Escape and returning focus to the opener
stay the browser's job. What is added on top is everything a native modal leaves to the page, and
all of it shows up first on a phone: the background is kept from scrolling behind the backdrop,
the box is capped in `dvh` so the on-screen keyboard cannot push the submit button out of reach,
the close button is a full 44px touch target, and the body scrolls under a header that does not.

The content is mounted on `show()` and unmounted after it closes, so an expensive form inside a
rarely opened modal costs nothing until it is opened.

```svelte
<script lang="ts">
  let editor = $state<Modal>();
</script>

<button onclick={() => editor?.show()}>Edit</button>

<Modal bind:this={editor} title="Edit profile" class="max-w-lg">
  <form id="profile">...</form>

  {#snippet footer()}
    <button class="btn" onclick={() => editor?.close()}>Cancel</button>
    <button class="btn btn-primary" form="profile">Save</button>
  {/snippet}
</Modal>
```
-->

<Dialog
  bind:this={dialog}
  class="modal motion-reduce:transition-none"
  aria-labelledby={titleId}
  onclose={() => {
    open = false;
    onclose?.();
  }}
  oncancel={(event) => {
    if (!dismissible) event.preventDefault();
  }}
  onpointerdown={(event) => {
    // A press that starts inside the box and ends outside it still produces a click on the dialog,
    // because the click target is the common ancestor of the two. Selecting text and dragging past
    // the edge would close the modal and lose the form, so the press has to have started outside.
    pressedOutside = event.target === event.currentTarget;
  }}
  onclick={(event) => {
    if (dismissible && pressedOutside && event.target === event.currentTarget) close();
  }}
>
  <div
    bind:this={box}
    tabindex="-1"
    class={[
      // dvh, not vh: the visible viewport shrinks when the on-screen keyboard opens, and a `vh`
      // cap would leave the footer under it.
      "modal-box flex max-h-[calc(100dvh-40px)] flex-col overflow-hidden p-0 motion-reduce:transition-none",
      className,
    ]}
  >
    <header
      class="flex flex-none items-start justify-between gap-3 border-b border-base-content/10 px-6 py-4"
    >
      <h2 id={titleId} class="text-lg leading-7 font-semibold">{title}</h2>
      {#if dismissible}
        <button
          bind:this={closeButton}
          type="button"
          class="btn -my-2 -mr-3 size-11 shrink-0 btn-ghost text-base"
          aria-label={closeLabel}
          onclick={close}
        >
          <!-- The negative margins let the 44px target eat into the header padding instead of
               growing the header by the difference. -->
          ✕
        </button>
      {/if}
    </header>

    <!-- `min-h-0` is load-bearing: a flex child defaults to `min-height: auto` and refuses to
         shrink below its content, which would push the box past its own max-height and take the
         scrolling with it. `overscroll-contain` keeps a flick at the end of a long form from
         scrolling the page underneath. -->
    <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5">
      {@render children()}
    </div>

    {#if footer}
      <footer
        class="flex flex-none flex-wrap justify-end gap-2 border-t border-base-content/10 px-6 py-4"
      >
        {@render footer()}
      </footer>
    {/if}
  </div>
</Dialog>
