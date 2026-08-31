/**
 * One row of a `Select`.
 *
 * `value` is the identity: it is what the control binds, what `onchange` reports, and what the
 * option list is keyed by, so two options may not share one. `label` is what a human reads and
 * what the default matcher searches — a code that only means something to the backend belongs in
 * `value`, never in `label`.
 */
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

/**
 * How many options it takes before `Select` grows a search field on its own.
 *
 * The number is a judgement, not a measurement: a list this long stops being scannable at a
 * glance on a phone-sized panel, while a shorter one is faster to point at than to type at. Pass
 * `searchable` explicitly to overrule it in either direction.
 */
export const SELECT_SEARCH_THRESHOLD = 8;

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

/**
 * The matcher `Select` uses when no `filter` is passed: a substring of the label, accent- and
 * case-insensitive.
 *
 * Exported so a consumer who only wants to widen it — matching the value too, or a synonym list —
 * can compose rather than reimplement the normalisation.
 */
export const matchesSelectQuery = (option: SelectOption, query: string): boolean =>
  normalizeForSearch(option.label).includes(normalizeForSearch(query));
