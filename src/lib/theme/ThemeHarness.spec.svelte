<script lang="ts">
  import ThemeController from "./ThemeController.svelte";
  import ThemeToggle from "./ThemeToggle.svelte";
  import { setThemeContext, ThemeContext, type ThemePreference } from "./theme.svelte.js";
  import { untrack } from "svelte";

  interface Props {
    initial?: ThemePreference;
    preferenceLabel?: (preference: ThemePreference) => string;
    label?: (current: ThemePreference, next: ThemePreference) => string;
  }

  const { initial = "system", preferenceLabel, label }: Props = $props();

  // The seed is read once by design; untrack says so, and keeps the compiler from warning that a
  // later change to the prop would go unnoticed.
  setThemeContext(new ThemeContext(untrack(() => initial)));
</script>

<!--
@component
Test-only wiring: the theme context has to be established by an ancestor component, so the browser
spec renders this instead of the controller directly. Named `*.spec.svelte` so packaging drops it.
-->

<ThemeController />
<ThemeToggle {preferenceLabel} {label} />
