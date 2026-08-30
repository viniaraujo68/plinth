<script lang="ts">
  import { fly, scale } from "svelte/transition";
  import type { ClassValue } from "svelte/elements";
  import {
    getDefaultToastManager,
    type ToastManager,
    type ToastPosition,
    type ToastVariant,
  } from "./toast-manager.svelte.js";

  interface Props {
    class?: ClassValue;
    /** Queue to render. Defaults to the one behind the module-level `toast` helper. */
    manager?: ToastManager;
    position?: ToastPosition;
    /** Stack newest first. The default puts the newest at the bottom of the stack. */
    reverseOrder?: boolean;
    /** Accessible name of the live region, for apps that are not in English. */
    label?: string;
    /** Accessible name of every toast's dismiss button. */
    dismissLabel?: string;
  }

  let {
    class: cls,
    manager,
    position = "bottom-end",
    reverseOrder = false,
    label = "Notifications",
    dismissLabel = "Dismiss notification",
  }: Props = $props();

  const resolvedManager = $derived(manager ?? getDefaultToastManager());
  const toasts = $derived(
    reverseOrder ? resolvedManager.toasts.toReversed() : resolvedManager.toasts,
  );

  const POSITION_CLASSES: Record<ToastPosition, string> = {
    "top-start": "toast-top toast-start",
    "top-center": "toast-top toast-center",
    "top-end": "toast-top toast-end",
    "middle-start": "toast-middle toast-start",
    "middle-center": "toast-middle toast-center",
    "middle-end": "toast-middle toast-end",
    "bottom-start": "toast-bottom toast-start",
    "bottom-center": "toast-bottom toast-center",
    "bottom-end": "toast-bottom toast-end",
  };

  const VARIANT_CLASSES: Record<ToastVariant, string> = {
    info: "alert-info",
    success: "alert-success",
    warning: "alert-warning",
    error: "alert-error",
  };

  // Inline paths rather than an icon font or an iconify plugin: the library must render correctly
  // in a consumer that installed nothing but the package. Variant is never signalled by color
  // alone, which is what makes the four alerts distinguishable to a colorblind reader.
  const VARIANT_ICONS: Record<ToastVariant, string[]> = {
    info: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18", "M12 16v-5", "M12 8h.01"],
    success: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18", "m8.5 12.4 2.4 2.4 4.6-5.2"],
    warning: [
      "M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0",
      "M12 9v4",
      "M12 17h.01",
    ],
    error: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18", "m14.5 9.5-5 5", "m9.5 9.5 5 5"],
  };

  const edgeOf = (value: ToastPosition) => {
    if (value.startsWith("top")) return "top";
    if (value.startsWith("middle")) return "middle";
    return "bottom";
  };

  const edge = $derived(edgeOf(position));

  // A toast that enters from off-stage would fly past the viewport edge it is anchored to, so the
  // offset points back towards the middle of the screen.
  const flyOffset = $derived(edge === "top" ? -8 : 8);

  const containsNode = (element: HTMLElement, node: EventTarget | null) =>
    node instanceof Node && element.contains(node);

  const resumeUnlessStillHeld = (id: string, event: MouseEvent | FocusEvent) => {
    const toastElement = event.currentTarget;
    if (!(toastElement instanceof HTMLElement)) return;

    // A pointer leaving for a child, or focus moving between the toast's own controls, is not a
    // reader letting go of the toast — the countdown has to stay frozen.
    if (containsNode(toastElement, event.relatedTarget)) return;
    if (containsNode(toastElement, document.activeElement)) return;
    if (toastElement.matches(":hover")) return;

    resolvedManager.resume(id);
  };

  // Toasts have to outrank a modal `<dialog>`, and z-index cannot do it: a modal dialog lives in
  // the browser's top layer, above every positioned element in the document. A popover reaches
  // the top layer too, but a modal dialog still paints over a popover anchored in <body> — the
  // only popover that wins is one nested inside that dialog. So the stack is hosted inside the
  // topmost open modal when there is one, and in <body> otherwise.
  let host = $state<HTMLElement>();

  $effect(() => {
    const pickHost = () => {
      const modals = document.querySelectorAll<HTMLDialogElement>("dialog:modal");
      host = modals[modals.length - 1] ?? document.body;
    };

    pickHost();
    // `:modal` flips with the `open` attribute that showModal()/close() write, so watching that
    // one attribute re-parents live toasts as dialogs come and go.
    const observer = new MutationObserver(pickHost);
    observer.observe(document.documentElement, {
      subtree: true,
      attributes: true,
      attributeFilter: ["open"],
    });
    return () => {
      observer.disconnect();
    };
  });

  const hostInTopLayer = (target: HTMLElement | undefined) => (element: HTMLElement) => {
    const parent = target ?? document.body;
    if (element.parentElement !== parent) {
      if (element.matches(":popover-open")) element.hidePopover();
      parent.appendChild(element);
    }
    if (!element.matches(":popover-open")) element.showPopover();
  };
</script>

<!--
@component
Renders a `ToastManager`'s queue. Mount exactly one, unconditionally, in the app's root layout —
it has to outlive navigation so a toast fired just before a `goto()` survives to the next page.

With no `manager` prop it renders the queue behind the module-level `toast` helper, which is what
lets any module in the app call `toast.error(...)` with nothing plumbed through.

```svelte
<Toaster position="top-end" />
```

The stack is a top-layer popover, re-parented into the topmost open modal `<dialog>` while one is
open, so toasts stay visible and clickable above a modal.

Its live region stays mounted even with nothing to show: a screen reader announces additions
reliably only into a region that was already in the accessibility tree when the content arrived.
It is `pointer-events: none` for that reason — an empty region must never swallow a tap.
-->

<div
  class={["pointer-events-none toast gap-2", POSITION_CLASSES[position], cls]}
  data-edge={edge}
  popover="manual"
  role="region"
  aria-label={label}
  aria-live="polite"
  aria-relevant="additions text"
  {@attach hostInTopLayer(host)}
>
  {#each toasts as toast (toast.id)}
    <div
      class={[
        "pointer-events-auto alert w-80 max-w-full shadow-lg",
        VARIANT_CLASSES[toast.variant],
      ]}
      data-testid="toast"
      data-variant={toast.variant}
      role={toast.variant === "info" || toast.variant === "success" ? "status" : "alert"}
      aria-atomic="true"
      onmouseenter={() => resolvedManager.pause(toast.id)}
      onmouseleave={(event) => resumeUnlessStillHeld(toast.id, event)}
      onfocusin={() => resolvedManager.pause(toast.id)}
      onfocusout={(event) => resumeUnlessStillHeld(toast.id, event)}
      in:fly|global={{ y: flyOffset, duration: 140 }}
      out:scale|global={{ start: 0.96, duration: 160 }}
    >
      <svg
        class="size-5 shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        {#each VARIANT_ICONS[toast.variant] as d (d)}
          <path {d} />
        {/each}
      </svg>

      <div class="flex min-w-0 flex-col">
        <span class="break-words whitespace-pre-line">{toast.message}</span>
        {#if toast.description}
          <span class="text-xs opacity-80">{toast.description}</span>
        {/if}
      </div>

      {#if toast.dismissible}
        <button
          type="button"
          class="btn btn-square btn-ghost btn-sm"
          aria-label={dismissLabel}
          onclick={() => resolvedManager.dismiss(toast.id)}
        >
          <svg
            class="size-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      {/if}
    </div>
  {/each}
</div>

<style>
  /* The stack is a popover, so the UA popover styles apply on top of daisyUI's `.toast`: they add
     a border, padding, a Canvas background and `overflow: auto`. daisyUI resets none of those
     because it never expected the element to be in the top layer. */
  .toast {
    margin: 0;
    border: 0;
    padding: 0;
    overflow: visible;
    background: transparent;
  }

  /* Phone chrome: the home indicator and the notch overlap a viewport-edge stack. daisyUI's flat
     1rem does not know about either. */
  .toast[data-edge="bottom"] {
    bottom: calc(1rem + env(safe-area-inset-bottom));
  }
  .toast[data-edge="top"] {
    top: calc(1rem + env(safe-area-inset-top));
  }

  /* Svelte's in:/out: transitions own the toast lifecycle. daisyUI's own entry keyframe would
     replay on every re-parent between hosts (each modal open and close), flashing the whole
     stack back in. */
  .toast > :global(*) {
    animation: none;
  }
</style>
