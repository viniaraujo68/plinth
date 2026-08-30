import { createContext } from "svelte";
import { MediaQuery } from "svelte/reactivity";

/** Theme name the stylesheet pins to `color-scheme: light`. */
export const LIGHT_THEME = "plinth-light";

/** Theme name the stylesheet pins to `color-scheme: dark`. */
export const DARK_THEME = "plinth-dark";

/**
 * Name of the cookie carrying the theme preference.
 *
 * A cookie rather than localStorage because it is the only client-side store a server can read:
 * an SSR consumer picks it up in its root layout load and renders the controller already in the
 * right state, which is what makes the first paint flash-free.
 */
export const THEME_COOKIE = "theme";

export type ThemePreference = "light" | "dark" | "system";

const isPreference = (value: string | undefined): value is ThemePreference =>
  value === "light" || value === "dark" || value === "system";

/**
 * Narrow an untrusted string — a cookie, a query param, `data` handed down by a layout load — to
 * a preference, falling back to "system". This is the seed for `ThemeContext` on whichever side
 * happened to read the value.
 */
export const parseThemePreference = (value: string | undefined): ThemePreference =>
  isPreference(value) ? value : "system";

/**
 * Read the stored preference from `document.cookie`, defaulting to "system".
 *
 * A client-rendered app seeds `ThemeContext` straight from this. An app that renders on the
 * server reads the same cookie in its root layout load and seeds from `data` instead — same
 * flow, different side of the wire.
 *
 * ```ts
 * setThemeContext(new ThemeContext(readThemePreference()));
 * ```
 */
export const readThemePreference = (): ThemePreference =>
  parseThemePreference(new RegExp(`(?:^|;\\s*)${THEME_COOKIE}=(\\w+)`).exec(document.cookie)?.[1]);

/** Serialise a preference into a `Set-Cookie`-shaped string, for whoever is doing the writing. */
export const themeCookie = (preference: ThemePreference): string =>
  `${THEME_COOKIE}=${preference}; path=/; max-age=31536000; samesite=lax`;

/**
 * The reactive theme preference. `preference` is what the user picked, and the only thing that
 * gets persisted; `dark` is that preference resolved against the OS, kept current by a reactive
 * media query.
 *
 * Painting never goes through `dark`. The daisyUI theme-controller checkbox rendered by
 * `ThemeController` carries `preference` itself, and CSS resolves the "system" case through
 * `color-scheme: light dark` — so the correct colors are on screen before any of this runs.
 * `dark` exists for the JS that genuinely needs the resolved value, such as choosing a chart
 * palette that CSS cannot express.
 *
 * `ThemeController` must be mounted exactly once, unconditionally, near the app root. Any other
 * picker in the app just writes `preference` here.
 */
export class ThemeContext {
  preference = $state<ThemePreference>("system");
  private system = new MediaQuery("(prefers-color-scheme: dark)");
  dark = $derived(this.preference === "system" ? this.system.current : this.preference === "dark");

  constructor(initial: ThemePreference) {
    this.preference = initial;
  }
}

export const [getThemeContext, setThemeContext] = createContext<ThemeContext>();
