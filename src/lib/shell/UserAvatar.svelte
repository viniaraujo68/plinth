<script lang="ts">
  import type { ClassValue } from "svelte/elements";
  import { initials } from "./initials.js";

  interface Props {
    /** Whose avatar this is. Only the initials are drawn; the name itself is the caller's to show. */
    name: string;
    class?: ClassValue;
  }

  let { name, class: className }: Props = $props();
</script>

<!--
@component
A signed-in user's initials on a disc. Hidden from assistive technology: every place that draws it
also shows the name next to it, or labels the control it sits in, and initials read aloud as
letters would only repeat that.
-->
<span class={["avatar-initials", className]} aria-hidden="true"
  ><span class="avatar-initials-text">{initials(name)}</span></span
>

<style>
  .avatar-initials {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border-radius: 9999px;
    /* Solid rather than a wash: on the tinted bars this sits on, a 15% disc all but disappears.
       `--color-primary-content` is the pair the theme guarantees against it in both modes. */
    background-color: var(--color-primary);
    color: var(--color-primary-content);
    font-size: 0.75rem;
    font-weight: 500;
    line-height: 1;
  }

  /* Centring the line box centres the font's ascent and descent, not the letters: capitals sit
     above the baseline with nothing hanging below, so in a font like Segoe UI Variable they land a
     pixel low on a 2rem disc. Trimmed to cap height and baseline, the box is the letters, and the
     disc centres them whatever the font. The inner element is what gets trimmed, because the
     property applies to block containers and the disc is a flex container. */
  .avatar-initials-text {
    text-box: trim-both cap alphabetic;
  }
</style>
