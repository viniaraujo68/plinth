<script lang="ts">
  import { DARK_THEME, getThemeContext, LIGHT_THEME, themeCookie } from "./theme.svelte.js";

  const theme = getThemeContext();

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
