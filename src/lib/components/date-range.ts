/**
 * The pair a range picker emits, and the whole of what it emits.
 *
 * In the default `"datetime"` mode both ends are ISO-8601 instants in UTC
 * (`2026-08-29T18:04:05.123Z`), the form `toISOString()` produces. A string rather than a `Date`
 * because this value's job is to travel: into a fetch body, a query string, a store, a load
 * function's return — all of which serialise a `Date` to exactly this string anyway, while an ISO
 * string additionally survives the round trip back and sorts correctly with a plain `<`. UTC rather
 * than a local offset because two clients in different zones must be able to name the same window
 * with the same characters.
 *
 * In `"date"` mode both ends are calendar days, `2026-08-29` — the value of an
 * `<input type="date">`, with no time and no zone, because a day is what the reader picked. An
 * empty string leaves that side open: `{ from: "2026-03-01", to: "" }` is "since March", and two
 * empty ends are all time.
 */
export interface DateRange {
  from: string;
  to: string;
}

/**
 * What the picker works in: `"datetime"` for a window of instants (a dashboard's last 24 hours),
 * `"date"` for a span of calendar days (a history filtered to last month).
 */
export type DateRangeMode = "datetime" | "date";

interface PresetBase {
  /** Stable across renders — it is what the picker's selection prop holds. */
  id: string;
  label: string;
}

/**
 * One relative window offered as a button — a fixed duration measured back from "now".
 *
 * `durationMs` is a duration and not a calendar step on purpose: "30d" means 30×24h, so the
 * window keeps its length across a DST boundary instead of silently growing or shrinking an hour
 * twice a year. A window that follows the calendar — this month, last month — is a
 * {@link CalendarPreset}.
 *
 * In `"date"` mode the window becomes the days it touches: from the day `durationMs` ago to today.
 */
export interface DurationPreset extends PresetBase {
  durationMs: number;
  range?: never;
}

/**
 * One window offered as a button and computed from the current moment — for the windows a
 * duration cannot name: this month, last month, the last six months, all time. `range` returns the
 * pair in the picker's mode, and runs again on every re-anchor, so "this month" turns into the
 * next one when the month does.
 *
 * {@link thisMonth}, {@link lastMonth}, {@link lastMonths} and {@link allTime} build the usual
 * ones for `"date"` mode.
 */
export interface CalendarPreset extends PresetBase {
  range: (now: Date) => DateRange;
  durationMs?: never;
}

export type DateRangePreset = DurationPreset | CalendarPreset;

/**
 * The selection value that means "the user typed the two ends themselves".
 *
 * It lives in the same space as the preset ids, so a preset may not claim it.
 */
export const CUSTOM_PRESET_ID = "custom";

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** The four windows a dashboard actually gets asked for. Replace the list, not the component. */
export const DEFAULT_PRESETS: readonly DateRangePreset[] = [
  { id: "1h", label: "1h", durationMs: HOUR_MS },
  { id: "24h", label: "24h", durationMs: DAY_MS },
  { id: "7d", label: "7d", durationMs: 7 * DAY_MS },
  { id: "30d", label: "30d", durationMs: 30 * DAY_MS },
];

const pad = (value: number, length = 2): string => String(value).padStart(length, "0");

/** A local calendar day as `YYYY-MM-DD`, the value an `<input type="date">` holds. */
export const toDay = (date: Date): string =>
  `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** Builds the window a preset names as of `now`, in the picker's `mode`. */
export const buildRange = (
  preset: DateRangePreset,
  now: Date | number = Date.now(),
  mode: DateRangeMode = "datetime",
): DateRange => {
  const end = now instanceof Date ? now.getTime() : now;

  if (preset.range) return preset.range(new Date(end));
  if (mode === "date")
    return { from: toDay(new Date(end - preset.durationMs)), to: toDay(new Date(end)) };

  return { from: new Date(end - preset.durationMs).toISOString(), to: new Date(end).toISOString() };
};

/**
 * Resolves a selection into the window it stands for right now, or `null` when there is nothing
 * to build — an unknown id, or {@link CUSTOM_PRESET_ID}.
 *
 * The initial anchor and every re-anchor tick both go through here, which is what makes "a custom
 * range is never re-anchored" a property of the data rather than of the timer's wiring: even a
 * tick that somehow fired while the user was in custom mode would have nothing to emit.
 */
export const anchorSelection = (
  selection: string,
  presets: readonly DateRangePreset[],
  now: Date | number = Date.now(),
  mode: DateRangeMode = "datetime",
): DateRange | null => {
  if (selection === CUSTOM_PRESET_ID) return null;

  const preset = presets.find(({ id }) => id === selection);

  return preset ? buildRange(preset, now, mode) : null;
};

/**
 * The selection a picker handed `value` (and no `preset`) should open on: the preset whose window
 * right now is exactly that pair, or {@link CUSTOM_PRESET_ID}. A page that remounts its picker —
 * one per tab, say — gets its "Last month" button back instead of a custom pair spelling it out.
 *
 * A duration preset in `"datetime"` mode only matches to the millisecond, so in practice a seeded
 * instant pair still opens as custom, as it always did.
 */
export const selectionFor = (
  value: DateRange,
  presets: readonly DateRangePreset[],
  now: Date | number = Date.now(),
  mode: DateRangeMode = "datetime",
): string => {
  const match = presets.find((preset) => {
    const range = buildRange(preset, now, mode);
    return range.from === value.from && range.to === value.to;
  });

  return match?.id ?? CUSTOM_PRESET_ID;
};

/**
 * Whether a pair of days is in order. An empty end leaves that side open, so it can never put the
 * pair out of order.
 */
export const isValidDayRange = (from: string, to: string): boolean => !from || !to || from <= to;

const DAY_PATTERN = /^([1-9]\d{3})-(\d{2})-(\d{2})$/;

/**
 * Reads an `<input type="date">` value back: the day itself, `""` for an empty field — no bound on
 * that side — or `null` for anything that is not yet a real day.
 *
 * A year below 1000 counts as not yet a day. Chrome reports a value on every digit of the year as
 * it is typed — `0002-03-01`, `0020-03-01`, `0202-03-01` — and each of those would otherwise be
 * emitted, and fetched, on the way to `2026`.
 */
export const parseDay = (value: string | null | undefined): string | null => {
  if (!value) return "";

  const match = DAY_PATTERN.exec(value);
  if (!match) return null;

  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));

  return date.getMonth() === Number(month) - 1 && date.getDate() === Number(day) ? value : null;
};

/** `now` moved back `months` calendar months, kept on its day or the last one the month has. */
const monthsBefore = (now: Date, months: number): Date => {
  const month = now.getMonth() - months;
  const lastDay = new Date(now.getFullYear(), month + 1, 0).getDate();

  return new Date(now.getFullYear(), month, Math.min(now.getDate(), lastDay));
};

/** "This month", for `"date"` mode: from the 1st, open at the end. */
export const thisMonth = (label: string, id = "this-month"): CalendarPreset => ({
  id,
  label,
  range: (now) => ({ from: toDay(new Date(now.getFullYear(), now.getMonth(), 1)), to: "" }),
});

/** "Last month", for `"date"` mode: its first day to its last. */
export const lastMonth = (label: string, id = "last-month"): CalendarPreset => ({
  id,
  label,
  range: (now) => ({
    from: toDay(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
    to: toDay(new Date(now.getFullYear(), now.getMonth(), 0)),
  }),
});

/**
 * The last `months` months, for `"date"` mode: from the same day that many months ago — or the
 * last day that month has — open at the end.
 */
export const lastMonths = (
  months: number,
  label: string,
  id = `last-${months}-months`,
): CalendarPreset => ({
  id,
  label,
  range: (now) => ({ from: toDay(monthsBefore(now, months)), to: "" }),
});

/** "All time", for `"date"` mode: both ends open. */
export const allTime = (label: string, id = "all-time"): CalendarPreset => ({
  id,
  label,
  range: () => ({ from: "", to: "" }),
});

/** Whether the pair is in order. An empty end is not a range, so it is not valid either. */
export const isValidRange = (from: string | null, to: string | null): boolean => {
  if (from === null || to === null) return false;

  const start = Date.parse(from);
  const end = Date.parse(to);

  return !Number.isNaN(start) && !Number.isNaN(end) && start <= end;
};

const LOCAL_INPUT_PATTERN = /^(\d{4,6})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

/**
 * Formats a UTC instant for the `value` of an `<input type="datetime-local">`, whose contents are
 * always wall-clock time in the browser's own zone and carry no offset of their own.
 *
 * Two browser traps are handled here. The string may not end in `Z` — appending one, or handing
 * over a sliced `toISOString()`, silently shifts the field by the local offset. And the input's
 * default `step` is 60, so a value carrying seconds is a step mismatch: the field would either
 * refuse it or grow a seconds segment. The instant is therefore truncated down to the minute,
 * which is a real loss of up to 59 seconds — the picker re-emits after the conversion rather than
 * keeping a value it is no longer showing.
 *
 * Returns `null` for anything `Date` cannot parse, so a bad value from an API blanks the field
 * instead of writing `NaN-NaN-NaN` into it.
 */
export const isoToLocalInput = (iso: string | null | undefined): string | null => {
  if (!iso) return null;

  const instant = new Date(iso);
  if (Number.isNaN(instant.getTime())) return null;

  const date = `${pad(instant.getFullYear(), 4)}-${pad(instant.getMonth() + 1)}-${pad(instant.getDate())}`;

  return `${date}T${pad(instant.getHours())}:${pad(instant.getMinutes())}`;
};

/**
 * Reads an `<input type="datetime-local">` value back into a UTC ISO instant, interpreting it in
 * the browser's zone.
 *
 * The parse is explicit rather than `new Date(value)`: the platform parser reads a date-only
 * string as UTC and a date-time string as local, a split that turns a half-typed field into an
 * instant a whole offset away. Anything that is not a complete local date and time — which is
 * what a partly filled field reports — is rejected as `null`.
 *
 * A local time that does not exist, the hour a spring-forward skips, is normalised by the
 * platform to the instant just after the jump. That is the same answer the input's own picker
 * gives, so the field and the emitted value stay in agreement.
 */
export const localInputToIso = (local: string | null | undefined): string | null => {
  if (!local) return null;

  const match = LOCAL_INPUT_PATTERN.exec(local);
  if (!match) return null;

  const [, year, month, day, hours, minutes, seconds = "0"] = match;
  const instant = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hours),
    Number(minutes),
    Number(seconds),
  );

  // `Date` rolls a nonsensical component over into the next unit -- month 13 becomes January --
  // so the only way to reject "2026-02-31" is to ask what came back out.
  if (
    Number.isNaN(instant.getTime()) ||
    instant.getMonth() !== Number(month) - 1 ||
    instant.getDate() !== Number(day)
  )
    return null;

  return instant.toISOString();
};

/** The clock behind a relative range, driven by the picker and stopped by it. */
export interface ReAnchor {
  /** Starts ticking. Idempotent, and a no-op for a non-positive interval. */
  start: () => void;
  /** Stops ticking and forgets that it was running. */
  stop: () => void;
  /**
   * Reports the document's visibility. Going hidden suspends the interval; coming back fires one
   * anchor immediately, because the range on screen is by then as stale as the tab is old.
   */
  setHidden: (hidden: boolean) => void;
}

/**
 * A suspendable repeating anchor.
 *
 * It exists apart from the component for two reasons: the suspend-on-hidden rule is the part
 * most likely to regress and the easiest to test with fake timers, and a background tab whose
 * timers the browser has throttled to once a minute would otherwise fire a burst of catch-up
 * anchors the moment it returns.
 */
export const createReAnchor = (options: { intervalMs: number; onAnchor: () => void }): ReAnchor => {
  let timer: ReturnType<typeof setInterval> | undefined;
  let running = false;
  let hidden = false;

  const schedule = () => {
    if (timer !== undefined || !running || hidden || options.intervalMs <= 0) return;
    timer = setInterval(options.onAnchor, options.intervalMs);
  };

  const clear = () => {
    if (timer === undefined) return;
    clearInterval(timer);
    timer = undefined;
  };

  return {
    start: () => {
      running = true;
      schedule();
    },

    stop: () => {
      running = false;
      clear();
    },

    setHidden: (next: boolean) => {
      if (next === hidden) return;
      hidden = next;

      if (hidden) {
        clear();
        return;
      }

      if (!running) return;
      options.onAnchor();
      schedule();
    },
  };
};
