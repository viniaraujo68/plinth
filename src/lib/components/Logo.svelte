<script lang="ts">
  import type { HTMLAttributes } from "svelte/elements";

  type Props = HTMLAttributes<HTMLDivElement> & {
    /** Runs the orbit. Leave it off for a static placeholder mark. */
    animated?: boolean;
    /** Stroke color. Defaults to the current theme's ink. */
    color?: string;
  };

  let { class: className, animated = false, color, ...rest }: Props = $props();
</script>

<!--
@component
A guitar pick drawn as a single outline stroke — the library's loading indicator, and the mark it
falls back to when there is nothing to show yet. Animated, a lit third of the outline orbits the
perimeter; standing still, the outline is unbroken.

It sizes itself from the inherited font size, so `class="text-4xl"` is the whole API for making it
bigger, and it colors itself from `--color-base-content`, so it stays legible in either theme and
inside a `data-theme` subtree.

It renders no text and carries no role, which makes it silent to assistive technology on purpose:
whatever it is standing in for is what should be announced, so wrap it in the live region or
`aria-busy` container that owns the loading state.

```svelte
<div class="grid place-items-center" role="status" aria-label="Loading releases">
  <Logo class="text-4xl" animated />
</div>
```
-->

<div
  {...rest}
  class={["plinth-logo", className]}
  data-animated={animated ? "" : undefined}
  style:--logo-color={color}
>
  <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
    <path
      d="M16 3.6 C17.8 3.6 19 5 20 7 L25.1 17.2 C26.6 20 27 22 26.3 23.7 C24.7 27 20.9 28.6 16 28.6 C11.1 28.6 7.3 27 5.7 23.7 C5 22 5.4 20 6.9 17.2 L12 7 C13 5 14.2 3.6 16 3.6 Z"
    />
  </svg>
</div>

<style>
  @keyframes orbit {
    from {
      stroke-dashoffset: 0px;
    }
    to {
      stroke-dashoffset: -71.648px;
    }
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.35;
    }
  }

  .plinth-logo {
    /* Full ink rather than the faint wash a solid mark could afford: a 3.5-wide stroke in a 32 box
       covers little area, and the animated state lights only a third of that perimeter at a time,
       so a single-digit-percent wash would leave the running dash invisible. The outline stays
       quiet at full strength because it is hollow — the surface reads through the middle, which is
       what keeps it from being mistaken for content. */
    --logo-color: var(--color-base-content);

    display: inline-flex;
    align-items: center;
    justify-content: center;

    svg {
      display: block;
      width: 1em;
      height: 1em;
    }

    path {
      fill: none;
      stroke: var(--logo-color);
      stroke-width: 3.5;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    /* Presence, not value: `data-animated={false}` would still serialise to the string "false"
       and match an attribute selector, so the attribute is omitted entirely when it is off. */
    &[data-animated] path {
      /* 23.883 + 47.765 = 71.648, the path's measured length via `getTotalLength` in chromium,
         which is also the distance the keyframes travel. The three numbers are one fact stated
         three times and have to move together: a dash period that is not exactly the path length
         makes the pattern restart at the path's start point — the tip — so the dash visibly snaps
         there once per cycle. Change the `d` and all three are wrong until re-measured. */
      stroke-dasharray: 23.883px 47.765px;
      animation: orbit 1.7s linear infinite;

      /* A fully static mark would remove the only feedback that something is loading, so the
         orbit degrades to a pulse rather than to nothing. */
      @media (prefers-reduced-motion: reduce) {
        stroke-dasharray: none;
        animation: pulse 1.7s ease-in-out infinite;
      }
    }
  }
</style>
