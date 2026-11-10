import {
  interpolate,
  matchLocale,
  pickPhrase,
  type Dictionary,
  type TranslationParams,
} from "./translate.js";

export interface I18nOptions<L extends string> {
  /** Every locale's strings. The keys of this object are the locales the app offers. */
  dictionaries: Readonly<Record<L, Dictionary>>;
  /** The BCP 47 tag of each locale — what `Intl` and `<html lang>` are given. */
  tags: Readonly<Record<L, string>>;
  /**
   * The app's primary locale. The server always renders it, a key missing from the current
   * dictionary is looked up in it, and a reader whose browser asks for nothing on offer gets it
   * unless {@link I18nOptions.unmatched} says otherwise.
   */
  fallback: L;
  /**
   * The locale for a browser whose languages match none on offer. Defaults to `fallback`; an app
   * written for one country usually wants its international locale here instead, so a French
   * reader lands on English rather than on Portuguese.
   */
  unmatched?: L;
  /** Where the reader's pick is remembered across visits. `null` remembers nothing. */
  storageKey?: string | null;
}

/**
 * The locale an app is shown in, and the `t()` that reads from it.
 *
 * Build one per app, at module level, and import it wherever text is rendered: `locale` is
 * `$state`, so every `t()` read in a template or a `$derived` re-renders when it changes.
 *
 * On the server the instance is shared by every request the process handles and there is no
 * per-request place to keep a reader's language, so it renders the fallback locale and refuses to
 * switch — a switch there would leak one visitor's language into the next one's page. The browser
 * corrects the text during hydration, from the remembered pick or the browser's languages.
 */
export class I18n<L extends string> {
  /** The current locale. Switch it with {@link I18n.setLocale}, which also remembers the pick. */
  locale: L = $state() as L;

  /** Every locale on offer, in the order the dictionaries were declared. */
  readonly locales: readonly L[];

  readonly #dictionaries: Readonly<Record<L, Dictionary>>;
  readonly #tags: Readonly<Record<L, string>>;
  readonly #fallback: L;
  readonly #storageKey: string | null;

  constructor({ dictionaries, tags, fallback, unmatched, storageKey = null }: I18nOptions<L>) {
    this.#dictionaries = dictionaries;
    this.#tags = tags;
    this.#fallback = fallback;
    this.#storageKey = storageKey;
    this.locales = Object.keys(dictionaries) as L[];
    this.locale = this.#initial(unmatched ?? fallback);
    this.#applyLang();
  }

  /** The BCP 47 tag of the current locale, for `Intl` formatters and `toLocaleDateString`. */
  get tag(): string {
    return this.#tags[this.locale] ?? this.#tags[this.#fallback];
  }

  /**
   * The text for `key` in the current locale, with `{name}` placeholders filled from `params` and
   * a plural form picked by `params.count`. A key the current dictionary lacks is read from the
   * fallback one; a key neither has renders as itself — loud on screen, harmless otherwise.
   *
   * An arrow property rather than a method, so `const { t } = i18n` keeps working.
   */
  t = (key: string, params?: TranslationParams): string => {
    const phrase =
      this.#dictionaries[this.locale]?.[key] ?? this.#dictionaries[this.#fallback]?.[key];
    return phrase === undefined ? key : interpolate(pickPhrase(phrase, params), params);
  };

  /** Whether any dictionary has `key` — for text that is optional rather than missing. */
  has = (key: string): boolean =>
    key in (this.#dictionaries[this.locale] ?? {}) ||
    key in (this.#dictionaries[this.#fallback] ?? {});

  /** Switches to `locale` and remembers it. Ignored on the server and for a locale not on offer. */
  setLocale = (locale: L): void => {
    if (typeof window === "undefined" || !this.locales.includes(locale)) return;
    this.locale = locale;
    this.#remember(locale);
    this.#applyLang();
  };

  #initial(unmatched: L): L {
    if (typeof window === "undefined") return this.#fallback;
    const saved = this.#remembered();
    if (saved) return saved;
    const languages = navigator.languages?.length ? navigator.languages : [navigator.language];
    return matchLocale(languages.filter(Boolean), this.#tags) ?? unmatched;
  }

  #remembered(): L | null {
    if (!this.#storageKey) return null;
    try {
      const saved = localStorage.getItem(this.#storageKey) as L | null;
      return saved && this.locales.includes(saved) ? saved : null;
    } catch {
      // Storage blocked: fall through to the browser's languages.
      return null;
    }
  }

  #remember(locale: L) {
    if (!this.#storageKey) return;
    try {
      localStorage.setItem(this.#storageKey, locale);
    } catch {
      // Storage blocked, as in some private modes: the pick still holds for this visit.
    }
  }

  #applyLang() {
    if (typeof document !== "undefined") document.documentElement.lang = this.tag;
  }
}

/** An {@link I18n} for `options` — the one place an app declares its locales. */
export const createI18n = <L extends string>(options: I18nOptions<L>): I18n<L> => new I18n(options);
