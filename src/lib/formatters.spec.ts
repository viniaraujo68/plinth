import { describe, expect, it } from "vitest";
import { createFormatters } from "./formatters.js";

// CLDR puts a non-breaking space between a currency symbol and its digits in most locales, and
// nothing at all in en-US. Asserting the real character rather than normalising it is the point:
// this is the spacing that reaches the screen, and a change in it is a change worth failing on.
const NBSP = "\u00a0";

// A fixed instant, formatted in UTC so the assertions do not depend on the machine's zone.
const INSTANT = new Date("2026-08-29T18:04:05Z");
const UTC = { date: { timeZone: "UTC" }, datetime: { timeZone: "UTC" } };

const en = createFormatters("en-US", UTC);
const ptBR = createFormatters("pt-BR", UTC);

describe("date", () => {
  it("formats an instant in the factory's locale", () => {
    expect(en.date(INSTANT)).toBe("8/29/26");
    expect(ptBR.date(INSTANT)).toBe("29/08/2026");
  });

  it("accepts an ISO string and epoch milliseconds", () => {
    expect(en.date("2026-08-29T18:04:05Z")).toBe("8/29/26");
    expect(en.date(INSTANT.getTime())).toBe("8/29/26");
  });

  it("formats a date-only string as the calendar day it names", () => {
    // No timeZone override here on purpose: the shift is to LOCAL midnight, so the day survives
    // whatever zone the test machine is in — which is the whole reason the shift exists.
    const local = createFormatters("en-US");
    expect(local.date("2026-01-01")).toBe("1/1/26");
    expect(local.date("2026-12-31")).toBe("12/31/26");
  });

  it("passes a missing value through", () => {
    expect(en.date(null)).toBeNull();
    expect(en.date(undefined)).toBeNull();
    expect(en.date("")).toBeNull();
  });
});

describe("datetime", () => {
  it("formats date and time in the factory's locale", () => {
    expect(en.datetime(INSTANT)).toBe("8/29/26, 6:04:05 PM");
    expect(ptBR.datetime(INSTANT)).toBe("29/08/2026, 18:04:05");
  });

  it("takes per-factory Intl overrides", () => {
    const withZone = createFormatters("en-US", {
      datetime: { dateStyle: "medium", timeStyle: "short", timeZone: "America/New_York" },
    });
    expect(withZone.datetime(INSTANT)).toBe("Aug 29, 2026, 2:04 PM");
  });
});

describe("number", () => {
  it("groups and separates per locale", () => {
    expect(en.number(1234567.891)).toBe("1,234,567.891");
    expect(ptBR.number(1234567.891)).toBe("1.234.567,891");
  });

  it("accepts a decimal that arrived as a string", () => {
    expect(en.number("1234.5")).toBe("1,234.5");
  });

  it("keeps a bigint exact", () => {
    expect(en.number(9007199254740993n)).toBe("9,007,199,254,740,993");
  });

  it("shows a value that is not a number instead of hiding it", () => {
    expect(en.number("twelve")).toBe("NaN");
  });

  it("passes a missing value through, but not a zero", () => {
    expect(en.number(null)).toBeNull();
    expect(en.number(0)).toBe("0");
  });
});

describe("percent", () => {
  it("treats the value as a ratio", () => {
    expect(en.percent(0.12345)).toBe("12.35%");
    expect(ptBR.percent(0.12345)).toBe("12,35%");
    expect(en.percent(1)).toBe("100%");
  });

  it("takes a per-factory precision", () => {
    const precise = createFormatters("en-US", {
      percent: { style: "percent", maximumFractionDigits: 4 },
    });
    expect(precise.percent(0.123456)).toBe("12.3456%");
  });
});

describe("currency", () => {
  it("puts the passed code in the factory's locale", () => {
    expect(ptBR.currency(1234.5, "BRL")).toBe(`R$${NBSP}1.234,50`);
    expect(ptBR.currency(1234.5, "USD")).toBe(`US$${NBSP}1.234,50`);
    expect(en.currency(1234.5, "USD")).toBe("$1,234.50");
    expect(en.currency(1234.5, "BRL")).toBe("R$1,234.50");
  });

  it("drops the symbol in the plain format, keeping the currency's own digits", () => {
    expect(ptBR.currency(1234.5, "BRL", "plain")).toBe("1.234,50");
    expect(en.currency(1234.5, "USD", "plain")).toBe("1,234.50");
    // JPY has no minor unit, so its plain form has no decimals either.
    expect(en.currency(1234.5, "JPY", "plain")).toBe("1,235");
  });

  it("drops the decimals in the axis format, keeping the symbol", () => {
    expect(ptBR.currency(1234.5, "BRL", "axis")).toBe(`R$${NBSP}1.235`);
    expect(en.currency(1234.5, "USD", "axis")).toBe("$1,235");
  });

  it("formats whole units, never cents on its own", () => {
    const cents = 123450;
    expect(en.currency(cents / 100, "USD")).toBe("$1,234.50");
    expect(en.currency(cents, "USD")).toBe("$123,450.00");
  });

  it("passes a missing value through", () => {
    expect(en.currency(null, "USD")).toBeNull();
    expect(en.currency(undefined, "USD", "axis")).toBeNull();
  });
});

describe("relativeTime", () => {
  const now = new Date("2026-08-29T12:00:00Z");
  const ago = (seconds: number) => new Date(now.getTime() - seconds * 1000);
  const ahead = (seconds: number) => new Date(now.getTime() + seconds * 1000);

  it("picks the largest unit that fits, truncating rather than rounding", () => {
    expect(en.relativeTime(now, now)).toBe("now");
    expect(en.relativeTime(ago(45), now)).toBe("45 seconds ago");
    expect(en.relativeTime(ago(90), now)).toBe("1 minute ago");
    expect(en.relativeTime(ago(3599), now)).toBe("59 minutes ago");
    expect(en.relativeTime(ago(7200), now)).toBe("2 hours ago");
  });

  it("crosses each unit boundary exactly once", () => {
    expect(en.relativeTime(ago(59), now)).toBe("59 seconds ago");
    expect(en.relativeTime(ago(60), now)).toBe("1 minute ago");
    expect(en.relativeTime(ago(3599), now)).toBe("59 minutes ago");
    expect(en.relativeTime(ago(3600), now)).toBe("1 hour ago");
    expect(en.relativeTime(ago(86_399), now)).toBe("23 hours ago");
    expect(en.relativeTime(ago(86_400), now)).toBe("yesterday");
    expect(en.relativeTime(ago(604_799), now)).toBe("6 days ago");
    expect(en.relativeTime(ago(604_800), now)).toBe("last week");
    expect(en.relativeTime(ago(2_629_799), now)).toBe("4 weeks ago");
    expect(en.relativeTime(ago(2_629_800), now)).toBe("last month");
    expect(en.relativeTime(ago(31_557_599), now)).toBe("11 months ago");
    expect(en.relativeTime(ago(31_557_600), now)).toBe("last year");
    expect(en.relativeTime(ago(3 * 31_557_600), now)).toBe("3 years ago");
  });

  it("phrases the future too", () => {
    expect(en.relativeTime(ahead(30), now)).toBe("in 30 seconds");
    expect(en.relativeTime(ahead(7200), now)).toBe("in 2 hours");
    expect(en.relativeTime(ahead(86_400), now)).toBe("tomorrow");
    expect(en.relativeTime(ahead(604_800), now)).toBe("next week");
    expect(en.relativeTime(ahead(3 * 31_557_600), now)).toBe("in 3 years");
  });

  it("uses the locale's own words", () => {
    expect(ptBR.relativeTime(now, now)).toBe("agora");
    expect(ptBR.relativeTime(ago(300), now)).toBe("há 5 minutos");
    expect(ptBR.relativeTime(ago(86_400), now)).toBe("ontem");
    expect(ptBR.relativeTime(ahead(604_800), now)).toBe("próxima semana");
  });

  it("takes the numeric phrasing when the factory asks for it", () => {
    const numeric = createFormatters("en-US", { relativeTime: { numeric: "always" } });
    expect(numeric.relativeTime(ago(86_400), now)).toBe("1 day ago");
  });

  it("accepts strings on both sides and defaults now to the clock", () => {
    expect(en.relativeTime("2026-08-29T11:00:00Z", "2026-08-29T12:00:00Z")).toBe("1 hour ago");
    expect(en.relativeTime(new Date(Date.now() - 5000))).toBe("5 seconds ago");
  });

  it("passes a missing value through", () => {
    expect(en.relativeTime(null)).toBeNull();
  });
});

describe("Intl instance caching", () => {
  // Counting construction directly: the claim is about how many times the expensive part runs,
  // and a spy on the constructor is the only thing that can observe it from outside.
  const countingConstructions = <T>(
    run: () => T,
  ): { result: T; numbers: number; dates: number } => {
    const realNumberFormat = Intl.NumberFormat;
    const realDateTimeFormat = Intl.DateTimeFormat;
    let numbers = 0;
    let dates = 0;

    Intl.NumberFormat = new Proxy(realNumberFormat, {
      construct: (target, args: ConstructorParameters<typeof Intl.NumberFormat>) => {
        numbers++;
        return Reflect.construct(target, args);
      },
    });
    Intl.DateTimeFormat = new Proxy(realDateTimeFormat, {
      construct: (target, args: ConstructorParameters<typeof Intl.DateTimeFormat>) => {
        dates++;
        return Reflect.construct(target, args);
      },
    });

    try {
      return { result: run(), numbers, dates };
    } finally {
      Intl.NumberFormat = realNumberFormat;
      Intl.DateTimeFormat = realDateTimeFormat;
    }
  };

  it("builds each fixed formatter once, however many values it formats", () => {
    const { dates, numbers } = countingConstructions(() => {
      const fmt = createFormatters("en-US");
      for (let i = 0; i < 50; i++) {
        fmt.date(INSTANT);
        fmt.datetime(INSTANT);
        fmt.number(i);
        fmt.percent(i / 100);
      }
    });

    expect(dates).toBe(2);
    expect(numbers).toBe(2);
  });

  it("builds one currency formatter per code and format, and reuses it", () => {
    const { numbers } = countingConstructions(() => {
      const fmt = createFormatters("en-US");
      for (let i = 0; i < 50; i++) {
        fmt.currency(i, "USD");
        fmt.currency(i, "USD", "axis");
        fmt.currency(i, "BRL");
      }
    });

    // Two eager (number, percent) plus one per distinct code-and-format pair. The plain format is
    // not asked for here, and nothing was built for it.
    expect(numbers).toBe(5);
  });
});
