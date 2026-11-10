<script lang="ts">
  interface Props {
    /** Whether a navigation is under way — `navigating.to !== null` from `$app/state`, typically. */
    active: boolean;
    /**
     * How long a navigation has to take before the line shows, in milliseconds. Most client-side
     * navigations finish well inside it, and a line that flashes for every one of them reads as
     * flicker, not as progress.
     */
    delay?: number;
  }

  let { active, delay = 150 }: Props = $props();

  let shown = $state(false);

  $effect(() => {
    if (!active) {
      shown = false;
      return;
    }
    const timer = setTimeout(() => (shown = true), delay);
    return () => clearTimeout(timer);
  });
</script>

<!--
@component
A thin line sweeping across the very top of the window while a navigation is taking a while — the
only feedback a client-side navigation gives that something is happening between the click and the
next page. It shows only once the navigation has taken longer than `delay`.

The library imports nothing from SvelteKit, so the app says when a navigation is under way:

```svelte
<script>
  import { navigating } from "$app/state";
</script>

<NavigationProgress active={navigating.to !== null} />
```

It is decoration — the page that is loading says so where it matters — so it stays hidden from
assistive technology, and stops sweeping for a reader who asked for less motion.
-->
{#if shown}
  <div class="plinth-navigation-progress" aria-hidden="true"><span></span></div>
{/if}

<style>
  .plinth-navigation-progress {
    position: fixed;
    inset: 0 0 auto;
    z-index: 60;
    height: 2px;
    overflow: hidden;
    pointer-events: none;
  }

  .plinth-navigation-progress span {
    display: block;
    width: 40%;
    height: 100%;
    border-radius: 0 2px 2px 0;
    background: linear-gradient(90deg, transparent, var(--color-primary));
    animation: plinth-navigation-sweep 1.1s ease-in-out infinite;
  }

  @keyframes plinth-navigation-sweep {
    from {
      transform: translateX(-100%);
    }
    to {
      transform: translateX(250%);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .plinth-navigation-progress span {
      width: 100%;
      background: var(--color-primary);
      animation: none;
    }
  }
</style>
