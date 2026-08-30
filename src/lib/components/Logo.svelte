<script lang="ts">
  import type { HTMLAttributes } from "svelte/elements";

  type Props = HTMLAttributes<HTMLDivElement> & {
    /** Runs the stretch cycle. Leave it off for a static placeholder mark. */
    animated?: boolean;
    /** Bar color. Defaults to a faint wash of the current theme's ink. */
    color?: string;
    /** Height of the bars, in any CSS length. Defaults to a multiple of the inherited font size,
        which is why sizing this from the outside is a matter of `text-4xl` and nothing else. */
    barHeight?: string;
  };

  let { class: className, animated = false, color, barHeight, ...rest }: Props = $props();
</script>

<!--
@component
Three bars that stretch in and out of phase — the library's loading indicator, and the mark it
falls back to when there is nothing to show yet.

It sizes itself from the inherited font size, so `class="text-4xl"` is the whole API for making it
bigger, and it colors itself from `--color-base-content`, so it stays legible in either theme and
inside a `data-theme` subtree.

It renders no text and carries no role, which makes it silent to assistive technology on purpose:
whatever it is standing in for is what should be announced, so wrap it in the live region or
`aria-busy` container that owns the loading state.

```svelte
<div class="grid place-items-center" role="status" aria-label="Loading orders">
  <Logo class="text-4xl" animated />
</div>
```
-->

<div
  {...rest}
  class={["plinth-logo", className]}
  data-animated={animated ? "" : undefined}
  style:--logo-color={color}
  style:--logo-bar-height={barHeight}
>
  <div></div>
  <div></div>
  <div></div>
</div>

<style>
  @keyframes stretch {
    0%,
    100% {
      transform: scaleY(100%);
    }
    50% {
      transform: scaleY(50%);
    }
  }

  .plinth-logo {
    --logo-color: color-mix(in oklch, var(--color-base-content) 7%, transparent);
    --logo-bar-height: calc(10em / 9);

    display: flex;
    align-items: center;
    justify-content: center;
    gap: calc(var(--logo-bar-height) / 8);

    div {
      width: calc(var(--logo-bar-height) / 4);
      height: var(--logo-bar-height);
      background-color: var(--logo-color);
      /* Scaling from the baseline keeps the bars sitting on one line while they stretch; the
         default centre origin would make them breathe symmetrically and read as a pulse. */
      transform-origin: bottom;

      &:nth-child(2) {
        transform: scaleY(75%);
      }
    }

    /* Presence, not value: `data-animated={false}` would still serialise to the string "false"
       and match an attribute selector, so the attribute is omitted entirely when it is off. */
    &[data-animated] > div {
      animation: stretch cubic-bezier(0.4, 0, 0.2, 1) 1.75s infinite;

      &:first-child {
        animation-delay: -0.25s;
      }

      &:last-child {
        animation-delay: 0.25s;
      }
    }
  }
</style>
