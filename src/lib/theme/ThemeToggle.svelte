<script lang="ts">
  import { getThemeContext, type ThemePreference } from "./theme.svelte.js";

  interface Props {
    /** Extra classes for the button, so a caller can size or place it. */
    class?: string;
    /** Hide the written preference and keep only the icon. The accessible name is unaffected. */
    iconOnly?: boolean;
  }

  const { class: className = "", iconOnly = false }: Props = $props();

  const theme = getThemeContext();

  // Cycling through "system" rather than flipping between the two explicit themes is the point:
  // "follow the OS" is a real choice a user can get back to, and a two-state toggle strands it.
  const NEXT: Record<ThemePreference, ThemePreference> = {
    system: "light",
    light: "dark",
    dark: "system",
  };

  const LABELS: Record<ThemePreference, string> = {
    system: "System",
    light: "Light",
    dark: "Dark",
  };
</script>

<!--
@component
A visible control cycling the theme preference System → Light → Dark → System.

It only writes `preference` on the theme context; the actual repaint is done by the
`ThemeController` checkbox, which has to be mounted once near the app root. That split is what
lets an app place any number of pickers wherever it likes without ever duplicating the
`theme-controller` element, whose presence is what CSS keys on.
-->

<button
  type="button"
  class="btn gap-2 btn-ghost btn-sm {className}"
  aria-label="Theme: {LABELS[theme.preference]}. Switch to {LABELS[NEXT[theme.preference]]}."
  data-preference={theme.preference}
  onclick={() => (theme.preference = NEXT[theme.preference])}
>
  <!-- aria-hidden because the button already carries the whole meaning in its accessible name. -->
  <svg
    class="size-4"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    {#if theme.preference === "light"}
      <circle cx="12" cy="12" r="4" />
      <path
        d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
      />
    {:else if theme.preference === "dark"}
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    {:else}
      <rect x="2" y="4" width="20" height="13" rx="2" />
      <path d="M8 21h8M12 17v4" />
    {/if}
  </svg>
  {#if !iconOnly}
    <span aria-hidden="true">{LABELS[theme.preference]}</span>
  {/if}
</button>
