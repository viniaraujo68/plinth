<script lang="ts">
  import { DARK_THEME, getThemeContext, LIGHT_THEME, themeCookie } from "./theme.svelte.js";

  const theme = getThemeContext();

  // A consumer that stamps `data-theme` on <html> before hydration is seeding the FIRST PAINT
  // from a cookie no checkbox has read yet. CSS already makes a checked controller outrank that
  // seed, but "system" checks nothing, so a stale seed would go on painting a theme the user has
  // just left. Releasing it once, on mount, hands the root over to this checkbox for good; the
  // effect reads nothing reactive, so it runs exactly once.
  $effect(() => {
    const root = document.documentElement;
    const seed = root.getAttribute("data-theme");
    if (seed === LIGHT_THEME || seed === DARK_THEME) root.removeAttribute("data-theme");
  });

  $effect(() => {
    document.cookie = themeCookie(theme.preference);
  });
</script>

<!--
@component
The daisyUI theme-controller checkbox, plus persistence of whatever it is holding.

The checkbox encodes the PREFERENCE, not the resolved theme: unchecked means "system", which the
stylesheet answers with `color-scheme: light dark` so the OS decides at first paint with no JS
involved; checked pins the theme named by `value`. All three states are therefore fully
determined by the cookie, which is what makes a server-rendered first paint flash-free.

A `data-theme` stamped on <html> before hydration — the head-script trick a client-rendered app
uses to avoid a flash — is a seed for that first paint and nothing more. This checkbox outranks
it as soon as it is checked, and drops the seed altogether on mount, so from then on the
preference is the only thing painting the page. A `data-theme` on any element BELOW the root is
untouched by all of this and keeps re-theming its own subtree.

Mount it exactly once and unconditionally, near the app root — unmounting it drops the app back
to "system". Nothing else in an app should carry the `theme-controller` class; a picker elsewhere
writes `preference` on the theme context and lets this component follow.

```svelte
setThemeContext(new ThemeContext(readThemePreference()));
...
<ThemeController />
```
-->

<input
  type="checkbox"
  class="theme-controller"
  value={theme.preference === "light" ? LIGHT_THEME : DARK_THEME}
  hidden
  checked={theme.preference !== "system"}
/>
