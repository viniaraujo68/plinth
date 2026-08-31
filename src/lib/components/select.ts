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

/**
 * The matcher `Combobox` uses when no `filter` is passed: a substring of the label, accent- and
 * case-insensitive.
 *
 * Exported so a consumer who only wants to widen it — matching the value too, or a synonym list —
 * can compose rather than reimplement the normalisation.
 */
export const matchesSelectQuery = (option: SelectOption, query: string): boolean =>
  normalizeForSearch(option.label).includes(normalizeForSearch(query));

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
