/**
 * One row of a `Select` or a `Combobox`.
 *
 * `value` is the identity: it is what the control binds, what `onchange` reports, and what the
 * option list is keyed by, so two options may not share one. `label` is what a human reads, what
 * the default matcher searches and what a `Combobox` puts in its text field — a code that only
 * means something to the backend belongs in `value`, never in `label`.
 */
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

/**
 * Strips accents and case so that a search compares the letters a person meant rather than the
 * ones they managed to type.
 *
 * `NFD` splits a precomposed letter into its base plus a combining mark — `á` becomes `a` + U+0301
 * — and removing every mark leaves the base behind. Without it a Portuguese list is close to
 * unsearchable: `Otávio`, `Itaipava` and `São Gonçalo` are all words a user types unaccented, and
 * a plain `includes` finds none of them.
 *
 * `toLowerCase` and not `toLocaleLowerCase`: the locale-aware form maps `I` to `ı` under a Turkish
 * locale, which would make the result depend on the machine the code runs on.
 */
export const normalizeForSearch = (text: string): string =>
  text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

const searchWords = (query: string): string[] =>
  normalizeForSearch(query).split(/\s+/).filter(Boolean);

const containsEveryWord = (text: string, words: readonly string[]): boolean => {
  const haystack = normalizeForSearch(text);
  return words.every((word) => haystack.includes(word));
};

/**
 * The matcher `Combobox` uses when no `filter` is passed: the label contains every word of the
 * query, in any order, accent- and case-insensitive. Punctuation stays significant.
 *
 * Exported so a consumer who only wants to widen it — matching the value too, or a synonym list —
 * can compose rather than reimplement the normalisation.
 */
export const matchesSelectQuery = (option: SelectOption, query: string): boolean =>
  containsEveryWord(option.label, searchWords(query));

/**
 * The options whose `text` contains every word of the query, under the same folding as
 * {@link matchesSelectQuery}; all of them for a blank query.
 */
export const filterOptions = <T>(
  options: readonly T[],
  query: string,
  text: (option: T) => string,
): readonly T[] => {
  const words = searchWords(query);
  if (words.length === 0) return options;
  return options.filter((option) => containsEveryWord(text(option), words));
};

/**
 * The first selectable index from `from`, walking in `delta`'s direction; `-1` when there is none.
 *
 * Both controls move a highlight over the same list under the same rule — a disabled row is
 * stepped over rather than landed on — and the walk stops at the ends instead of wrapping, so
 * holding an arrow key rests against the edge rather than cycling forever.
 */
export const nextSelectableIndex = (
  options: readonly SelectOption[],
  from: number,
  delta: number,
): number => {
  for (let index = from; index >= 0 && index < options.length; index += delta)
    if (!options[index].disabled) return index;

  return -1;
};

/** The selectable index at `index`, clamped to the list, else the nearest one after it, else before. */
export const nearestSelectableIndex = (options: readonly SelectOption[], index: number): number => {
  const from = Math.min(Math.max(index, 0), options.length - 1);
  const after = nextSelectableIndex(options, from, 1);
  return after >= 0 ? after : nextSelectableIndex(options, from, -1);
};

/**
 * The selectable option whose label starts with `typed`, folded, searching from `active` and
 * wrapping around; `-1` when none does. One letter, or the same letter repeated, moves past
 * `active` and so cycles through the labels starting with it; a longer prefix may stay on it.
 */
export const typeaheadMatch = (
  options: readonly SelectOption[],
  active: number,
  typed: string,
): number => {
  if (options.length === 0 || typed === "") return -1;
  const cycling = typed === typed[0].repeat(typed.length);
  const prefix = normalizeForSearch(cycling ? typed[0] : typed);
  for (let offset = cycling ? 1 : 0; offset <= options.length; offset++) {
    const index = (((active + offset) % options.length) + options.length) % options.length;
    const candidate = options[index];
    if (!candidate.disabled && normalizeForSearch(candidate.label).startsWith(prefix)) return index;
  }
  return -1;
};

/** Whether a key press types a character: one character long, without Ctrl, Meta or Alt. */
export const isTypedKey = (
  event: Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "altKey">,
): boolean => event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey;

/** Characters typed within half a second of each other, gathered into one prefix. */
export class Typeahead {
  private typed = "";
  private at = -Infinity;

  /** Whether a character came in the last half second, so a Space extends the prefix. */
  get typing(): boolean {
    return Date.now() - this.at < 500;
  }

  /** Adds a character and returns the prefix so far. */
  add(char: string): string {
    this.typed = this.typing ? this.typed + char : char;
    this.at = Date.now();
    return this.typed;
  }
}
