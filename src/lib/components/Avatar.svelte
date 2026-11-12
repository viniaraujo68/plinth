<script lang="ts">
  import type { ClassValue } from "svelte/elements";
  import { initials } from "./initials.js";

  interface Props {
    /** Whose avatar this is. Drawn as initials when there is no photo; never shown in full. */
    name: string;
    /** The photo's URL. Without one, or when it fails to load, the initials stand in for it. */
    src?: string | null;
    /**
     * The disc's diameter, as any CSS length. A prop and not a class because an unlayered
     * component rule beats a Tailwind utility whatever the source order, so `size-10` from the
     * outside could never win. The initials scale with it.
     */
    size?: string;
    class?: ClassValue;
  }

  let { name, src, size = "2rem", class: className }: Props = $props();

  // Remembering which URL failed, rather than a flag, is what lets a new photo be tried again:
  // a changed `src` no longer matches the failed one, with no effect to reset anything.
  let failedSrc = $state<string | null>(null);
</script>

<!--
@component
A person on a disc: their photo when there is one, the first letter of their first and last name
when there is not, and the initials again when the photo fails to load.

Hidden from assistive technology: every place that draws it also shows the name next to it, or
labels the control it sits in, and initials read aloud as letters would only repeat that.

```svelte
<Avatar name="Ada Lovelace" />
<Avatar name="Ada Lovelace" src={photoUrl} size="6rem" />
```
-->

<span class={["plinth-avatar", className]} style:--plinth-avatar-size={size} aria-hidden="true">
  {#if src && src !== failedSrc}
    <img {src} alt="" onerror={() => (failedSrc = src)} />
  {:else}
    <span class="plinth-avatar-initials">{initials(name)}</span>
  {/if}
</span>

<style>
  .plinth-avatar {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: var(--plinth-avatar-size);
    height: var(--plinth-avatar-size);
    overflow: hidden;
    border-radius: 9999px;
    /* Solid rather than a wash: on the tinted bars this sits on, a 15% disc all but disappears.
       `--color-primary-content` is the pair the theme guarantees against it in both modes. */
    background-color: var(--color-primary);
    color: var(--color-primary-content);
    font-size: calc(var(--plinth-avatar-size) * 0.375);
    font-weight: 500;
    line-height: 1;
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  /* Centring the line box centres the font's ascent and descent, not the letters: capitals sit
     above the baseline with nothing hanging below, so in a font like Segoe UI Variable they land a
     pixel low on a 2rem disc. Trimmed to cap height and baseline, the box is the letters, and the
     disc centres them whatever the font. The inner element is what gets trimmed, because the
     property applies to block containers and the disc is a flex container. */
  .plinth-avatar-initials {
    text-box: trim-both cap alphabetic;
  }
</style>
