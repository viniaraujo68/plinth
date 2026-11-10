import { afterEach, describe, expect, it, vi } from "vitest";
import {
  anchorSelection,
  buildRange,
  createReAnchor,
  CUSTOM_PRESET_ID,
  DEFAULT_PRESETS,
  isoToLocalInput,
  isValidRange,
  localInputToIso,
  allTime,
  isValidDayRange,
  lastMonth,
  lastMonths,
  parseDay,
  selectionFor,
  thisMonth,
  toDay,
  type DateRangePreset,
} from "./date-range.js";

const NOW = new Date("2026-08-29T18:04:05.123Z");
const HOUR: DateRangePreset = { id: "1h", label: "1h", durationMs: 3_600_000 };

// Node re-reads `process.env.TZ` on the next `Date` operation, which is the only way to exercise
// the local-time conversions against an offset the machine running the suite does not have.
const withTimeZone = <T>(timeZone: string, body: () => T): T => {
  const previous = process.env.TZ;
  process.env.TZ = timeZone;

  try {
    return body();
  } finally {
    // Assigning `undefined` to an env var stores the string "undefined", which is not a zone.
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
};

describe("buildRange", () => {
  it("measures the duration back from the given instant", () => {
    expect(buildRange(HOUR, NOW)).toEqual({
      from: "2026-08-29T17:04:05.123Z",
      to: "2026-08-29T18:04:05.123Z",
    });
  });

  it("accepts epoch milliseconds as well as a Date", () => {
    expect(buildRange(HOUR, NOW.getTime())).toEqual(buildRange(HOUR, NOW));
  });

  it("defaults to the current instant", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);

    try {
      expect(buildRange(HOUR).to).toBe(NOW.toISOString());
    } finally {
      vi.useRealTimers();
    }
  });

  // A preset is a duration, not a calendar step: "30d" has to stay 30x24h so the window does not
  // change length across a DST boundary.
  it("treats every preset as a fixed duration", () => {
    const spans = DEFAULT_PRESETS.map(
      (preset) => Date.parse(buildRange(preset, NOW).to) - Date.parse(buildRange(preset, NOW).from),
    );

    expect(spans).toEqual([3_600_000, 86_400_000, 604_800_000, 2_592_000_000]);
  });
});

describe("anchorSelection", () => {
  it("resolves a preset id against the list it was given", () => {
    expect(anchorSelection("24h", DEFAULT_PRESETS, NOW)).toEqual({
      from: "2026-08-28T18:04:05.123Z",
      to: "2026-08-29T18:04:05.123Z",
    });
  });

  // The re-anchor tick and the initial anchor both go through here, so this is the property that
  // makes "a custom range is never re-anchored" true of the data and not only of the wiring.
  it("has nothing to anchor for a custom selection", () => {
    expect(anchorSelection(CUSTOM_PRESET_ID, DEFAULT_PRESETS, NOW)).toBeNull();
  });

  it("has nothing to anchor for an id no preset claims", () => {
    expect(anchorSelection("90d", DEFAULT_PRESETS, NOW)).toBeNull();
  });
});

describe("isValidRange", () => {
  it("accepts an ordered pair, including a zero-length one", () => {
    expect(isValidRange("2026-08-29T17:00:00Z", "2026-08-29T18:00:00Z")).toBe(true);
    expect(isValidRange("2026-08-29T18:00:00Z", "2026-08-29T18:00:00Z")).toBe(true);
  });

  it("rejects a reversed pair", () => {
    expect(isValidRange("2026-08-29T18:00:00Z", "2026-08-29T17:00:00Z")).toBe(false);
  });

  it("rejects a missing or unparseable end", () => {
    expect(isValidRange(null, "2026-08-29T18:00:00Z")).toBe(false);
    expect(isValidRange("2026-08-29T18:00:00Z", null)).toBe(false);
    expect(isValidRange("yesterday", "2026-08-29T18:00:00Z")).toBe(false);
  });
});

describe("localInputToIso", () => {
  // Built from the local components rather than from a literal, so the expectation holds in
  // whatever zone the suite happens to run in.
  it("reads the field as wall-clock time in the local zone", () => {
    expect(localInputToIso("2026-06-15T12:30")).toBe(new Date(2026, 5, 15, 12, 30).toISOString());
  });

  it("keeps seconds when the field carries them", () => {
    expect(localInputToIso("2026-06-15T12:30:45")).toBe(
      new Date(2026, 5, 15, 12, 30, 45).toISOString(),
    );
  });

  it("applies a whole-hour offset", () => {
    expect(withTimeZone("America/Sao_Paulo", () => localInputToIso("2026-06-15T12:30"))).toBe(
      "2026-06-15T15:30:00.000Z",
    );
  });

  // The trap that a naive `getTimezoneOffset() / 60` conversion falls into.
  it("applies a half-hour offset", () => {
    expect(withTimeZone("Asia/Kolkata", () => localInputToIso("2026-06-15T12:30"))).toBe(
      "2026-06-15T07:00:00.000Z",
    );
  });

  it("crosses the date line the local day sits on", () => {
    expect(withTimeZone("Pacific/Auckland", () => localInputToIso("2026-06-15T09:00"))).toBe(
      "2026-06-14T21:00:00.000Z",
    );
  });

  it("rejects a half-typed or malformed field", () => {
    expect(localInputToIso("")).toBeNull();
    expect(localInputToIso(null)).toBeNull();
    expect(localInputToIso("2026-06-15")).toBeNull();
    expect(localInputToIso("2026-06-15T12")).toBeNull();
    expect(localInputToIso("2026-06-15 12:30")).toBeNull();
    // A trailing `Z` is not a datetime-local value; accepting it would silently drop the offset.
    expect(localInputToIso("2026-06-15T12:30Z")).toBeNull();
  });

  it("rejects a day the month does not have", () => {
    expect(localInputToIso("2026-02-31T12:30")).toBeNull();
    expect(localInputToIso("2026-13-01T12:30")).toBeNull();
  });
});

describe("isoToLocalInput", () => {
  it("renders the instant as local wall-clock text with no offset", () => {
    const instant = new Date(2026, 5, 15, 12, 30);

    expect(isoToLocalInput(instant.toISOString())).toBe("2026-06-15T12:30");
  });

  it("truncates to whole minutes, which is what the field's default step allows", () => {
    const instant = new Date(2026, 5, 15, 12, 30, 45, 900);

    expect(isoToLocalInput(instant.toISOString())).toBe("2026-06-15T12:30");
  });

  it("pads every component to the width the field expects", () => {
    const instant = new Date(2026, 0, 2, 3, 4);

    expect(isoToLocalInput(instant.toISOString())).toBe("2026-01-02T03:04");
  });

  it("shifts into the local zone", () => {
    expect(withTimeZone("Asia/Kolkata", () => isoToLocalInput("2026-06-15T07:00:00.000Z"))).toBe(
      "2026-06-15T12:30",
    );
    expect(
      withTimeZone("Pacific/Auckland", () => isoToLocalInput("2026-06-14T21:00:00.000Z")),
    ).toBe("2026-06-15T09:00");
  });

  it("passes a missing or unparseable instant through as null", () => {
    expect(isoToLocalInput(null)).toBeNull();
    expect(isoToLocalInput(undefined)).toBeNull();
    expect(isoToLocalInput("")).toBeNull();
    expect(isoToLocalInput("not an instant")).toBeNull();
  });

  it("round-trips a field value through UTC and back", () => {
    const fields = ["2026-01-01T00:00", "2026-06-15T12:30", "2026-12-31T23:59"];

    for (const zone of ["UTC", "America/Sao_Paulo", "Asia/Kolkata", "Pacific/Auckland"])
      withTimeZone(zone, () => {
        for (const field of fields) expect(isoToLocalInput(localInputToIso(field))).toBe(field);
      });
  });
});

describe("createReAnchor", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("anchors once per interval, and not before the first one elapses", () => {
    vi.useFakeTimers();
    const onAnchor = vi.fn();
    const clock = createReAnchor({ intervalMs: 60_000, onAnchor });

    clock.start();
    expect(onAnchor).not.toHaveBeenCalled();

    vi.advanceTimersByTime(180_000);
    expect(onAnchor).toHaveBeenCalledTimes(3);

    clock.stop();
    vi.advanceTimersByTime(180_000);
    expect(onAnchor).toHaveBeenCalledTimes(3);
  });

  it("stays silent for a non-positive interval", () => {
    vi.useFakeTimers();
    const onAnchor = vi.fn();

    createReAnchor({ intervalMs: 0, onAnchor }).start();
    vi.advanceTimersByTime(600_000);

    expect(onAnchor).not.toHaveBeenCalled();
  });

  it("survives a repeated start without stacking intervals", () => {
    vi.useFakeTimers();
    const onAnchor = vi.fn();
    const clock = createReAnchor({ intervalMs: 60_000, onAnchor });

    clock.start();
    clock.start();
    vi.advanceTimersByTime(60_000);

    expect(onAnchor).toHaveBeenCalledTimes(1);
  });

  // A hidden tab is not watching, and its timers are throttled anyway; the catch-up burst that a
  // naive interval would fire on return is exactly what this replaces with a single anchor.
  it("suspends while hidden and anchors once on return", () => {
    vi.useFakeTimers();
    const onAnchor = vi.fn();
    const clock = createReAnchor({ intervalMs: 60_000, onAnchor });

    clock.start();
    clock.setHidden(true);
    vi.advanceTimersByTime(600_000);
    expect(onAnchor).not.toHaveBeenCalled();

    clock.setHidden(false);
    expect(onAnchor).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(60_000);
    expect(onAnchor).toHaveBeenCalledTimes(2);
  });

  it("ignores a visibility report that changes nothing", () => {
    vi.useFakeTimers();
    const onAnchor = vi.fn();
    const clock = createReAnchor({ intervalMs: 60_000, onAnchor });

    clock.start();
    clock.setHidden(false);

    expect(onAnchor).not.toHaveBeenCalled();
  });

  it("does not anchor on becoming visible again once stopped", () => {
    vi.useFakeTimers();
    const onAnchor = vi.fn();
    const clock = createReAnchor({ intervalMs: 60_000, onAnchor });

    clock.start();
    clock.setHidden(true);
    clock.stop();
    clock.setHidden(false);
    vi.advanceTimersByTime(600_000);

    expect(onAnchor).not.toHaveBeenCalled();
  });
});

describe("date mode", () => {
  // Local noon, so no zone the suite might run in moves it to another day.
  const MARCH_31 = new Date(2026, 2, 31, 12);
  const JANUARY_15 = new Date(2026, 0, 15, 12);

  it("writes a local day the way a date field holds it", () => {
    expect(toDay(new Date(2026, 0, 2, 23, 59))).toBe("2026-01-02");
  });

  it("turns a duration into the days it touches", () => {
    expect(
      buildRange({ id: "7d", label: "7d", durationMs: 7 * 86_400_000 }, MARCH_31, "date"),
    ).toEqual({
      from: "2026-03-24",
      to: "2026-03-31",
    });
  });

  it("hands a calendar preset the current moment", () => {
    const seen: Date[] = [];
    const preset: DateRangePreset = {
      id: "x",
      label: "x",
      range: (now) => {
        seen.push(now);
        return { from: "a", to: "b" };
      },
    };

    expect(buildRange(preset, MARCH_31, "date")).toEqual({ from: "a", to: "b" });
    expect(seen[0].getTime()).toBe(MARCH_31.getTime());
  });

  it("anchors a calendar preset in either mode", () => {
    expect(anchorSelection("this-month", [thisMonth("This month")], MARCH_31)).toEqual({
      from: "2026-03-01",
      to: "",
    });
  });

  it("builds this month open at the end", () => {
    expect(thisMonth("This month").range(MARCH_31)).toEqual({ from: "2026-03-01", to: "" });
  });

  it("builds last month from its first day to its last, across a year", () => {
    expect(lastMonth("Last month").range(MARCH_31)).toEqual({
      from: "2026-02-01",
      to: "2026-02-28",
    });
    expect(lastMonth("Last month").range(JANUARY_15)).toEqual({
      from: "2025-12-01",
      to: "2025-12-31",
    });
  });

  it("goes back whole months, on the last day a shorter month has", () => {
    expect(lastMonths(1, "1 month").range(MARCH_31)).toEqual({ from: "2026-02-28", to: "" });
    expect(lastMonths(6, "6 months").range(MARCH_31)).toEqual({ from: "2025-09-30", to: "" });
    expect(lastMonths(12, "12 months").range(JANUARY_15)).toEqual({ from: "2025-01-15", to: "" });
  });

  it("leaves both ends of all time open", () => {
    expect(allTime("All time").range(MARCH_31)).toEqual({ from: "", to: "" });
  });

  it("gives each builder an id of its own unless told one", () => {
    const ids = [
      thisMonth("a"),
      lastMonth("b"),
      lastMonths(6, "c"),
      lastMonths(12, "d"),
      allTime("e"),
    ];

    expect(new Set(ids.map(({ id }) => id)).size).toBe(5);
    expect(allTime("All", "all").id).toBe("all");
  });

  it("reads a date field as the day, an open end, or not a day yet", () => {
    expect(parseDay("2026-03-01")).toBe("2026-03-01");
    expect(parseDay("")).toBe("");
    expect(parseDay(undefined)).toBe("");
    expect(parseDay("2026-02-31")).toBeNull();
    expect(parseDay("2026-3-1")).toBeNull();
  });

  // Chrome reports a value on each digit of a year being typed; none of them is the year meant.
  it("treats a year still being typed as not a day", () => {
    for (const partial of ["0002-03-01", "0020-03-01", "0202-03-01"])
      expect(parseDay(partial)).toBeNull();
  });

  it("lets an open end through and stops a reversed pair", () => {
    expect(isValidDayRange("2026-03-01", "")).toBe(true);
    expect(isValidDayRange("", "2026-03-01")).toBe(true);
    expect(isValidDayRange("", "")).toBe(true);
    expect(isValidDayRange("2026-03-01", "2026-03-01")).toBe(true);
    expect(isValidDayRange("2026-03-02", "2026-03-01")).toBe(false);
  });

  it("finds the preset a seeded pair stands for, or falls back to custom", () => {
    const presets = [allTime("All"), thisMonth("This month"), lastMonth("Last month")];

    expect(selectionFor({ from: "2026-02-01", to: "2026-02-28" }, presets, MARCH_31, "date")).toBe(
      "last-month",
    );
    expect(selectionFor({ from: "", to: "" }, presets, MARCH_31, "date")).toBe("all-time");
    expect(selectionFor({ from: "2026-02-02", to: "" }, presets, MARCH_31, "date")).toBe(
      CUSTOM_PRESET_ID,
    );
  });
});
