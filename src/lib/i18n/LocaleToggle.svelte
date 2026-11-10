<script lang="ts" generics="L extends string">
  import type { ClassValue } from "svelte/elements";
  import SegmentedControl from "../components/SegmentedControl.svelte";
  import type { I18n } from "./i18n.svelte.js";

  interface Props {
    /** The app's `I18n`. The toggle reads its locale and switches it; there is nothing to bind. */
    i18n: I18n<L>;
    /** Accessible name of the group — "Language". A prop because the library ships no translations. */
    label: string;
    /**
     * What each button says. Defaults to the locale's id upper-cased, `PT` / `EN`, which is what a
     * reader looking for their language scans for — a name in the current language would hide it
     * from exactly the reader who cannot read that language.
     */
    labels?: Partial<Record<L, string>>;
    /** `sm` fits a top bar or a sidebar footer; `md` is the size of the other segmented controls. */
    size?: "sm" | "md";
    class?: ClassValue;
  }

  let { i18n, label, labels = {}, size = "sm", class: className }: Props = $props();

  const options = $derived(
    i18n.locales.map((locale) => ({ id: locale, label: labels[locale] ?? locale.toUpperCase() })),
  );
</script>

<!--
@component
The language switch: one button per locale the app's `I18n` offers, the current one pressed. It is a
`SegmentedControl` underneath, so it looks and behaves like every other few-way choice in the app.

```svelte
<LocaleToggle {i18n} label={i18n.t("nav.language")} />
```
-->
<SegmentedControl
  {options}
  value={i18n.locale}
  {label}
  {size}
  class={className}
  onchange={(locale) => i18n.setLocale(locale)}
/>
