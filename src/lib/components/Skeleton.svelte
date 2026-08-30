<script lang="ts">
  import type { HTMLAttributes } from "svelte/elements";

  type Props = HTMLAttributes<HTMLDivElement> & {
    /**
     * Corner shape. A prop and not a class because an unlayered component rule beats a Tailwind
     * utility whatever the source order, so `rounded-full` from the outside could never win.
     * `"none"` is for a caller clipping the block to a silhouette of its own.
     */
    rounded?: "field" | "full" | "none";
  };

  let { class: className, rounded = "field", ...rest }: Props = $props();
</script>

<!--
@component
The block that stands in for content that has not arrived: a resting wash with a band of the brand
colour sweeping across it, left to right, on the same calm 1.7s linear cycle the `Logo` orbits on.

It sets no width and no height, so **give it a size** — `class="h-4 w-40"` — and it takes any shape
you clip it to, because the sweep is painted on the element itself rather than on a pseudo-element.
Corner shape is the one piece of geometry it does own, as the `rounded` prop; everything else is
yours.

Like the logo it renders no text and carries no role, which keeps it silent to assistive
technology: the container that knows what is loading is the one that should say so.

```svelte
<div role="status" aria-label="Loading releases" class="flex flex-col gap-2">
  <Skeleton class="h-4 w-48" />
  <Skeleton class="h-4 w-64" />
  <Skeleton class="size-10" rounded="full" />
</div>
```
-->

<div {...rest} class={["plinth-skeleton", className]} data-rounded={rounded}></div>

<style>
  @keyframes sweep {
    /* Past both edges at either end: at 200% background-size the lit band is half a box wide, and
       these two stops are what carry it fully off screen instead of parking it at the rim. */
    from {
      background-position: 150% 0;
    }
    to {
      background-position: -50% 0;
    }
  }

  .plinth-skeleton {
    /* Tinted, not grey: the sweep is the brand's, mixed into the same ink wash the library uses
       for a resting surface everywhere else. Both stay transparent mixes so the block reads on
       whatever surface it is dropped onto, in either theme. */
    --skeleton-base: color-mix(in oklch, var(--color-base-content) 11%, transparent);
    --skeleton-sheen: color-mix(in oklch, var(--color-primary) 26%, transparent);

    display: block;
    background-color: var(--skeleton-base);

    /* On the element rather than on an `::after`: a pseudo-element would need its own overflow
       clip and would ignore a `clip-path` the caller hands the block, which is exactly how the
       pick-shaped placeholder in the showcase is built. */
    background-image: linear-gradient(
      90deg,
      transparent 20%,
      var(--skeleton-sheen) 50%,
      transparent 80%
    );
    background-repeat: no-repeat;
    background-size: 200% 100%;

    /* The logo's tempo, deliberately: two loading states on one screen beating at different
       speeds is what makes a page look nervous. */
    animation: sweep 1.7s linear infinite;

    &[data-rounded="field"] {
      border-radius: var(--radius-field, 0.5rem);
    }

    &[data-rounded="full"] {
      border-radius: 9999px;
    }

    @media (prefers-reduced-motion: reduce) {
      /* Where `Logo` degrades its orbit to a pulse rather than to nothing — an outline that stops
         moving has stopped saying anything at all — this one stops outright. A skeleton's
         affordance is that it holds the space its content will take, and that survives standing
         still, so all the motion is doing here is decorating. It settles on the tone the sweep
         averages to, which is what it looks like mid-pass. */
      background-image: none;
      background-color: color-mix(in oklch, var(--skeleton-sheen) 45%, var(--skeleton-base));
      animation: none;
    }
  }
</style>
