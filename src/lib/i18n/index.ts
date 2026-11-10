// The app's own strings in more than one language: the current locale as state, a `t()` that reads
// it, and the toggle that switches it. The library still ships no translations of its own — its
// components take every word through props — so this is for the app's text, and those props are
// where its `t()` calls go. `@viniaraujo68/plinth/i18n`.
export { createI18n, I18n, type I18nOptions } from "./i18n.svelte.js";
export { default as LocaleToggle } from "./LocaleToggle.svelte";
export {
  interpolate,
  matchLocale,
  pickPhrase,
  type Dictionary,
  type Phrase,
  type TranslationParams,
} from "./translate.js";
