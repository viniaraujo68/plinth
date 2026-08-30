/** A locale tag, or the priority list `Intl` walks when the first tag has no data. */
export type Locale = string | readonly string[];

/**
 * What a formatter accepts as an instant: a `Date`, epoch milliseconds, or a string the platform
 * `Date` parser understands — API payloads carry timestamps as strings far more often than as
 * anything else.
 */
export type DateInput = Date | string | number;

/**
 * What the numeric formatters accept. Strings are here because a backend that keeps money or
 * rates in an exact decimal type serialises them as strings to avoid the float round trip.
 * `bigint` is passed to `Intl` untouched, which is the only way it stays exact.
 */
export type NumericInput = number | bigint | string;

/**
 * The three shapes the same amount takes across a UI:
 *
 * - `currency` — symbol and the currency's own decimals: `R$ 1.234,50`.
 * - `plain` — the same digits without the symbol, for an input a user edits or a column whose
 *   header already names the currency.
 * - `axis` — no decimals, for chart axis ticks and any other place where three characters of
 *   precision cost more room than they are worth.
 */
export type MoneyFormat = "currency" | "plain" | "axis";

/**
 * Per-formatter `Intl` options merged over the defaults, fixed once for the whole factory.
 *
 * Precision and date style are app-wide decisions in the same way the locale is; making them
 * per-call arguments instead would mean a cache keyed by whatever a caller passes.
 */
export interface FormatterOptions {
  date?: Intl.DateTimeFormatOptions;
  datetime?: Intl.DateTimeFormatOptions;
  number?: Intl.NumberFormatOptions;
  percent?: Intl.NumberFormatOptions;
  relativeTime?: Intl.RelativeTimeFormatOptions;
}

/**
 * Formats an instant, and passes a missing value through as `null`.
 *
 * The two signatures are what makes `{formatters.date(row.releasedAt) ?? "—"}` type-check without
 * a guard at every call site: a value that cannot be null formats to a `string`, and only a
 * nullable one widens the result.
 */
export interface DateFormatter {
  (value: DateInput): string;
  (value: DateInput | null | undefined): string | null;
}

/** Formats a number, and passes a missing value through as `null`. */
export interface NumberFormatter {
  (value: NumericInput): string;
  (value: NumericInput | null | undefined): string | null;
}

/**
 * Formats an amount in `code` (an ISO 4217 code: `"BRL"`, `"USD"`, `"JPY"`).
 *
 * The value is in whole currency units. Integer cents are an app's storage convention, not this
 * library's: whoever holds the cents divides by 100.
 */
export interface CurrencyFormatter {
  (value: NumericInput, code: string, format?: MoneyFormat): string;
  (value: NumericInput | null | undefined, code: string, format?: MoneyFormat): string | null;
}

/** Formats the distance from `now` (default: the current time) to `value`. */
export interface RelativeTimeFormatter {
  (value: DateInput, now?: DateInput): string;
  (value: DateInput | null | undefined, now?: DateInput): string | null;
}

export interface Formatters {
  date: DateFormatter;
  datetime: DateFormatter;
  number: NumberFormatter;
  percent: NumberFormatter;
  currency: CurrencyFormatter;
  relativeTime: RelativeTimeFormatter;
}

const DEFAULT_DATE: Intl.DateTimeFormatOptions = { dateStyle: "short" };
const DEFAULT_DATETIME: Intl.DateTimeFormatOptions = { dateStyle: "short", timeStyle: "medium" };
const DEFAULT_NUMBER: Intl.NumberFormatOptions = {};
/** A ratio, not a 0-100 scale: `percent(0.125)` is `12.5%`. Two decimals is where rates stop. */
const DEFAULT_PERCENT: Intl.NumberFormatOptions = { style: "percent", maximumFractionDigits: 2 };
/**
 * `auto` is what makes this a replacement for a hand-built "3 min ago" helper rather than a
 * stiffer version of one: it spends the locale's own words where they exist — "yesterday",
 * "last week", "now" — and falls back to the numeric phrasing everywhere else.
 */
const DEFAULT_RELATIVE_TIME: Intl.RelativeTimeFormatOptions = { numeric: "auto" };

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * A date-only string ("2026-08-29") parses as UTC midnight, so west of Greenwich it formats as
 * the previous calendar day. Shifting it by the offset in effect *at that instant* — not today's
 * offset, which would land dates on the far side of a DST change one day off — makes it local
 * midnight, and it then formats as the day it names. Any other string already denotes an instant.
 */
const toDate = (value: DateInput): Date => {
  if (value instanceof Date) return value;
  if (typeof value === "number") return new Date(value);

  const parsed = new Date(value);
  if (!DATE_ONLY.test(value)) return parsed;
  return new Date(parsed.getTime() + parsed.getTimezoneOffset() * 60_000);
};

/**
 * `Number`, not `parseFloat`: `parseFloat("12 apples")` is `12`, which puts a number on screen
 * that nobody sent. A value that is not a number reaches `Intl` as `NaN` and renders as such,
 * because an empty cell would hide the bug instead of showing it.
 */
const toNumeric = (value: NumericInput): number | bigint =>
  typeof value === "string" ? Number(value) : value;

/** An empty string is a missing value, not a zero and not an invalid date. */
const isMissing = (value: unknown): value is null | undefined | "" =>
  value === null || value === undefined || value === "";

type RelativeUnit = readonly [Intl.RelativeTimeFormatUnit, number];

const SECOND: RelativeUnit = ["second", 1];

/**
 * Seconds in each unit, largest first. Month and year are the average Gregorian ones: the unit is
 * picked to phrase an approximation, so a February that is three days shorter changes nothing a
 * reader could notice.
 */
const RELATIVE_UNITS: readonly RelativeUnit[] = [
  ["year", 31_557_600],
  ["month", 2_629_800],
  ["week", 604_800],
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
  SECOND,
];

/**
 * Builds the six formatters for one locale.
 *
 * Nothing here decides the locale or the currency on its own. The app picks the locale once, at
 * the factory; the currency code travels per call, so a single-currency app closes over one and a
 * multi-currency one passes whatever the row holds.
 *
 * ```ts
 * const fmt = createFormatters("pt-BR");
 * fmt.currency(1234.5, "BRL");          // "R$ 1.234,50"
 * fmt.currency(1234.5, "BRL", "axis");  // "R$ 1.235"
 * fmt.relativeTime(sentAt);             // "há 5 minutos"
 * ```
 *
 * The closure is the cache. `Intl` constructors are the expensive part — the `format` calls are
 * cheap — so building the factory once at module scope of an app, or once per locale in a store,
 * is the difference between resolving locale data a handful of times and doing it per row.
 */
export const createFormatters = (locale: Locale, options: FormatterOptions = {}): Formatters => {
  const dateFormat = new Intl.DateTimeFormat(locale, { ...DEFAULT_DATE, ...options.date });
  const datetimeFormat = new Intl.DateTimeFormat(locale, {
    ...DEFAULT_DATETIME,
    ...options.datetime,
  });
  const numberFormat = new Intl.NumberFormat(locale, { ...DEFAULT_NUMBER, ...options.number });
  const percentFormat = new Intl.NumberFormat(locale, { ...DEFAULT_PERCENT, ...options.percent });
  const relativeTimeFormat = new Intl.RelativeTimeFormat(locale, {
    ...DEFAULT_RELATIVE_TIME,
    ...options.relativeTime,
  });

  // Currency is the one axis the factory cannot resolve up front, so it memoises what it meets.
  // Bounded by the codes an app actually shows, times the three formats.
  const moneyFormats = new Map<string, Intl.NumberFormat>();

  const moneyFormat = (code: string, format: MoneyFormat): Intl.NumberFormat => {
    const key = `${code}:${format}`;
    const cached = moneyFormats.get(key);
    if (cached) return cached;

    const built = buildMoneyFormat(code, format);
    moneyFormats.set(key, built);
    return built;
  };

  const buildMoneyFormat = (code: string, format: MoneyFormat): Intl.NumberFormat => {
    const currencyOptions: Intl.NumberFormatOptions = { style: "currency", currency: code };
    if (format === "currency") return new Intl.NumberFormat(locale, currencyOptions);
    if (format === "axis")
      return new Intl.NumberFormat(locale, {
        ...currencyOptions,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });

    // The symbol is dropped, but the currency still decides the digits: JPY has none, most have
    // two, and a few have three. Asking the currency formatter what it resolved keeps that right
    // for every code instead of hardcoding the two decimals of the currencies at hand.
    const { minimumFractionDigits, maximumFractionDigits } = moneyFormat(
      code,
      "currency",
    ).resolvedOptions();
    return new Intl.NumberFormat(locale, { minimumFractionDigits, maximumFractionDigits });
  };

  function date(value: DateInput): string;
  function date(value: DateInput | null | undefined): string | null;
  function date(value: DateInput | null | undefined): string | null {
    if (isMissing(value)) return null;
    return dateFormat.format(toDate(value));
  }

  function datetime(value: DateInput): string;
  function datetime(value: DateInput | null | undefined): string | null;
  function datetime(value: DateInput | null | undefined): string | null {
    if (isMissing(value)) return null;
    return datetimeFormat.format(toDate(value));
  }

  function number(value: NumericInput): string;
  function number(value: NumericInput | null | undefined): string | null;
  function number(value: NumericInput | null | undefined): string | null {
    if (isMissing(value)) return null;
    return numberFormat.format(toNumeric(value));
  }

  function percent(value: NumericInput): string;
  function percent(value: NumericInput | null | undefined): string | null;
  function percent(value: NumericInput | null | undefined): string | null {
    if (isMissing(value)) return null;
    return percentFormat.format(toNumeric(value));
  }

  function currency(value: NumericInput, code: string, format?: MoneyFormat): string;
  function currency(
    value: NumericInput | null | undefined,
    code: string,
    format?: MoneyFormat,
  ): string | null;
  function currency(
    value: NumericInput | null | undefined,
    code: string,
    format: MoneyFormat = "currency",
  ): string | null {
    if (isMissing(value)) return null;
    return moneyFormat(code, format).format(toNumeric(value));
  }

  function relativeTime(value: DateInput, now?: DateInput): string;
  function relativeTime(value: DateInput | null | undefined, now?: DateInput): string | null;
  function relativeTime(value: DateInput | null | undefined, now?: DateInput): string | null {
    if (isMissing(value)) return null;

    const from = now === undefined ? Date.now() : toDate(now).getTime();
    const seconds = (toDate(value).getTime() - from) / 1000;

    const [unit, size] = RELATIVE_UNITS.find(([, span]) => Math.abs(seconds) >= span) ?? SECOND;
    // Truncated, never rounded: an event 90 seconds old is "1 minute ago", not "2 minutes ago".
    // Rounding up would also push 59.5 minutes into "60 minutes ago", a phrase no unit owns.
    return relativeTimeFormat.format(Math.trunc(seconds / size), unit);
  }

  return { date, datetime, number, percent, currency, relativeTime };
};
