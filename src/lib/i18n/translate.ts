/**
 * A dictionary value: plain text, or a pair picked by the `count` parameter.
 *
 * Two forms only, `one` for a count of exactly 1 and `other` for everything else. That is
 * deliberately not CLDR: `Intl.PluralRules` files 0 under "one" in Portuguese, which would print
 * "0 dia" where a Brazilian reader expects "0 dias". A language that needs more forms than two is
 * the point at which a real i18n library earns its weight.
 */
export type Phrase = string | { one: string; other: string };

/** One locale's strings, flat and dot-namespaced: `"nav.login": "Entrar"`. */
export type Dictionary = Readonly<Record<string, Phrase>>;

/** What a `{name}` placeholder is filled with. `count` also picks a plural form. */
export type TranslationParams = Readonly<Record<string, string | number | null | undefined>>;

/** The form of `phrase` for `params`: the text itself, or the `one`/`other` the count picks. */
export const pickPhrase = (phrase: Phrase, params?: TranslationParams): string => {
  if (typeof phrase === "string") return phrase;
  return params?.count === 1 ? phrase.one : phrase.other;
};

/**
 * `text` with each `{name}` replaced by `params.name`. A placeholder with no value — absent,
 * `null` or `undefined` — is left as written, so a missing parameter shows up on screen instead of
 * printing "undefined" into a sentence.
 */
export const interpolate = (text: string, params?: TranslationParams): string => {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (placeholder, name: string) => {
    const value = params[name];
    return value === null || value === undefined ? placeholder : String(value);
  });
};

/**
 * Which of `locales` a reader's browser asks for. `languages` is `navigator.languages`, most
 * preferred first: each is matched against the locale tags exactly, then by language alone, so a
 * browser in `pt-PT` still lands on a `pt-BR` locale. `null` when none of them matches.
 */
export const matchLocale = <L extends string>(
  languages: readonly string[],
  tags: Readonly<Record<L, string>>,
): L | null => {
  const entries = Object.entries(tags) as [L, string][];
  const primary = (tag: string) => tag.toLowerCase().split("-")[0];
  for (const language of languages) {
    const wanted = language.toLowerCase();
    const exact = entries.find(([, tag]) => tag.toLowerCase() === wanted);
    if (exact) return exact[0];
    const loose = entries.find(([, tag]) => primary(tag) === primary(wanted));
    if (loose) return loose[0];
  }
  return null;
};
