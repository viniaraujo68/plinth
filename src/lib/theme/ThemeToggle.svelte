<script lang="ts">
  import { getThemeContext, type ThemePreference } from "./theme.svelte.js";

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

  interface Props {
    /** Extra classes for the button, so a caller can size or place it. */
    class?: string;
    /** Hide the written preference and keep only the icon. The accessible name is unaffected. */
    iconOnly?: boolean;
    /**
     * Names one preference — the visible text, and the words the default accessible name is built
     * from. A function of the preference, and not three strings, because it is the same wording in
     * both places; overriding it localizes both at once.
     */
    preferenceLabel?: (preference: ThemePreference) => string;
    /**
     * Accessible name of the button, given the preference on screen and the one a click moves to.
     * Defaults to the English sentence around `preferenceLabel`, so a caller who only needs the
     * three words translated can leave this alone; supply it to phrase the whole sentence.
     */
    label?: (current: ThemePreference, next: ThemePreference) => string;
  }

  const {
    class: className = "",
    iconOnly = false,
    preferenceLabel = (preference: ThemePreference) => LABELS[preference],
    label,
  }: Props = $props();

  const theme = getThemeContext();

  const next = $derived(NEXT[theme.preference]);

  const accessibleName = $derived(
    label?.(theme.preference, next) ??
      `Theme: ${preferenceLabel(theme.preference)}. Switch to ${preferenceLabel(next)}.`,
  );
</script>

<!--
@component
A visible control cycling the theme preference System → Light → Dark → System.

It only writes `preference` on the theme context; the actual repaint is done by the
`ThemeController` checkbox, which has to be mounted once near the app root. That split is what
lets an app place any number of pickers wherever it likes without ever duplicating the
`theme-controller` element, whose presence is what CSS keys on.

The wording is English by default and both halves of it are props, because the library ships no
translations. `preferenceLabel` names a single preference — the visible text and the words inside
the accessible name — and is usually the only one an app needs. `label` replaces the sentence those
words sit in, for a language the "Theme: X. Switch to Y." shape does not fit.

```svelte
<script lang="ts">
  import { ThemeToggle, type ThemePreference } from "@viniaraujo68/plinth/theme";

  const PREFERENCES: Record<ThemePreference, string> = {
    system: "Sistema",
    light: "Claro",
    dark: "Escuro",
  };
</script>

<ThemeToggle
  preferenceLabel={(preference) => PREFERENCES[preference]}
  label={(current, next) => `Tema: ${PREFERENCES[current]}. Mudar para ${PREFERENCES[next]}.`}
/>
```
-->

<button
  type="button"
  class="btn gap-2 btn-ghost btn-sm {className}"
  aria-label={accessibleName}
  data-preference={theme.preference}
  onclick={() => (theme.preference = next)}
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
    <span aria-hidden="true">{preferenceLabel(theme.preference)}</span>
  {/if}
</button>
