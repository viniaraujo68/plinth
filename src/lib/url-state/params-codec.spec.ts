import { describe, expect, expectTypeOf, it } from "vitest";
import { createParamsCodec, param } from "./params-codec.js";

const read = <T>(handler: { read: (values: readonly string[]) => T }, ...values: string[]) =>
  handler.read(values);

describe("param.string", () => {
  it("round-trips any text and falls back to the default when absent", () => {
    const handler = param.string({ default: "" });

    expect(read(handler, "hello world")).toBe("hello world");
    expect(read(handler)).toBe("");
    expect(handler.write("hello world")).toEqual(["hello world"]);
  });

  it("leaves the default and the empty string out of the URL", () => {
    const handler = param.string({ default: "all" });

    expect(handler.write("all")).toEqual([]);
    expect(handler.write("")).toEqual([]);
  });

  it("is undefined when no default is given", () => {
    const handler = param.string();

    expect(read(handler)).toBeUndefined();
    expect(handler.write(undefined)).toEqual([]);
  });

  it("narrows to the oneOf literals and rejects anything else", () => {
    const handler = param.string({ oneOf: ["asc", "desc"], default: "asc" });

    expectTypeOf(handler.defaultValue).toEqualTypeOf<"asc" | "desc">();
    expect(read(handler, "desc")).toBe("desc");
    expect(read(handler, "sideways")).toBe("asc");
    expect(read(handler, "DESC")).toBe("asc");
    expect(handler.write("sideways" as "asc")).toEqual([]);
  });

  it("keeps a oneOf without a default optional", () => {
    const handler = param.string({ oneOf: ["a", "b"] as const });

    expectTypeOf(handler.defaultValue).toEqualTypeOf<"a" | "b" | undefined>();
    expect(read(handler, "c")).toBeUndefined();
  });
});

describe("param.number", () => {
  const handler = param.number({ default: 1 });

  it("parses finite numbers", () => {
    expect(read(handler, "42")).toBe(42);
    expect(read(handler, "-2.5")).toBe(-2.5);
    expect(read(handler, " 7 ")).toBe(7);
  });

  it("falls back to the default for NaN, empty and infinite values", () => {
    expect(read(handler, "abc")).toBe(1);
    expect(read(handler, "")).toBe(1);
    expect(read(handler, "   ")).toBe(1);
    expect(read(handler, "NaN")).toBe(1);
    expect(read(handler, "Infinity")).toBe(1);
  });

  it("enforces min, max and integer", () => {
    const page = param.number({ default: 1, min: 1, max: 50, integer: true });

    expect(read(page, "3")).toBe(3);
    expect(read(page, "0")).toBe(1);
    expect(read(page, "51")).toBe(1);
    expect(read(page, "2.5")).toBe(1);
  });

  it("never writes NaN, a null from an emptied input, or the default", () => {
    expect(handler.write(Number.NaN)).toEqual([]);
    expect(handler.write(null as unknown as number)).toEqual([]);
    expect(handler.write(1)).toEqual([]);
    expect(handler.write(0)).toEqual(["0"]);
  });

  it("drops a value outside the bounds instead of writing it", () => {
    const page = param.number({ default: 1, min: 1 });

    expect(page.write(-4)).toEqual([]);
  });
});

describe("param.boolean", () => {
  const handler = param.boolean({ default: false });

  it("accepts only true and false", () => {
    expect(read(handler, "true")).toBe(true);
    expect(read(handler, "false")).toBe(false);
    expect(read(handler, "1")).toBe(false);
    expect(read(handler, "yes")).toBe(false);
    expect(read(handler, "TRUE")).toBe(false);
    expect(read(handler, "")).toBe(false);
  });

  it("falls back to a true default too", () => {
    const on = param.boolean({ default: true });

    expect(read(on, "nope")).toBe(true);
    expect(on.write(false)).toEqual(["false"]);
    expect(on.write(true)).toEqual([]);
  });
});

describe("param.date", () => {
  const handler = param.date();

  it("reads YYYY-MM-DD as local midnight", () => {
    const value = read(handler, "2024-03-31");

    expect(value?.getFullYear()).toBe(2024);
    expect(value?.getMonth()).toBe(2);
    expect(value?.getDate()).toBe(31);
    expect(value?.getHours()).toBe(0);
  });

  it("writes the local calendar day back", () => {
    expect(handler.write(new Date(2024, 0, 5, 23, 30))).toEqual(["2024-01-05"]);
  });

  it("falls back to the default for malformed or impossible dates", () => {
    expect(read(handler, "2024-02-30")).toBeUndefined();
    expect(read(handler, "2024-13-01")).toBeUndefined();
    expect(read(handler, "2024-1-5")).toBeUndefined();
    expect(read(handler, "yesterday")).toBeUndefined();
    expect(read(handler, "")).toBeUndefined();
  });

  it("never throws on an invalid Date", () => {
    expect(handler.write(new Date(Number.NaN))).toEqual([]);
  });

  it("keeps years before 100 in their own century", () => {
    expect(read(handler, "0042-06-01")?.getFullYear()).toBe(42);
    expect(handler.write(new Date(read(handler, "0042-06-01")!))).toEqual(["0042-06-01"]);
  });
});

describe("param.datetime", () => {
  const fallback = new Date("2020-01-01T00:00:00.000Z");
  const handler = param.datetime({ default: fallback });

  it("round-trips an ISO instant", () => {
    const value = read(handler, "2024-05-06T07:08:09.010Z");

    expect(value.toISOString()).toBe("2024-05-06T07:08:09.010Z");
    expect(handler.write(value)).toEqual(["2024-05-06T07:08:09.010Z"]);
  });

  it("falls back to the default for garbage and never throws writing an invalid Date", () => {
    expect(read(handler, "not a date")).toBe(fallback);
    expect(handler.write(new Date("garbage"))).toEqual([]);
    expect(handler.write(fallback)).toEqual([]);
  });
});

describe("param.list", () => {
  it("reads every repeated value and drops the invalid ones", () => {
    const handler = param.list(param.number({ integer: true }));

    expect(read(handler, "1", "x", "3", "2.5")).toEqual([1, 3]);
    expect(read(handler)).toEqual([]);
  });

  it("writes one value per entry and nothing for an empty list", () => {
    const handler = param.list(param.string({ oneOf: ["red", "green"] }));

    expectTypeOf(handler.defaultValue).toEqualTypeOf<("red" | "green")[]>();
    expect(handler.write(["red", "green"])).toEqual(["red", "green"]);
    expect(handler.write([])).toEqual([]);
    expect(handler.write(["red", "blue" as "red"])).toEqual(["red"]);
  });
});

describe("createParamsCodec", () => {
  const codec = createParamsCodec({
    q: param.string({ default: "" }),
    sort: param.string({ oneOf: ["asc", "desc"], default: "asc" }),
    page: param.number({ default: 1, min: 1, integer: true }),
    tags: param.list(param.string()),
    archived: param.boolean({ default: false }),
    from: param.date(),
  });

  it("infers the state type from the definition and builds its defaults", () => {
    expectTypeOf(codec.createDefault()).toEqualTypeOf<{
      q: string;
      sort: "asc" | "desc";
      page: number;
      tags: string[];
      archived: boolean;
      from: Date | undefined;
    }>();
    expect(codec.createDefault()).toEqual({
      q: "",
      sort: "asc",
      page: 1,
      tags: [],
      archived: false,
      from: undefined,
    });
  });

  it("owns exactly its fields", () => {
    expect(codec.ownedParams()).toEqual(["q", "sort", "page", "tags", "archived", "from"]);
  });

  it("hands out a fresh default every time", () => {
    const first = codec.createDefault();
    first.tags.push("mutated");

    expect(codec.createDefault().tags).toEqual([]);
  });

  it("parses a URL, falling back field by field and ignoring foreign params", () => {
    const state = codec.parse(
      new URLSearchParams("q=ice&sort=up&page=-1&tags=a&tags=b&archived=1&from=2024-01-02&tab=x"),
    );

    expect(state).toMatchObject({ q: "ice", sort: "asc", page: 1, tags: ["a", "b"] });
    expect(state.archived).toBe(false);
    expect(state.from?.getDate()).toBe(2);
    expect(state).not.toHaveProperty("tab");
  });

  it("serializes only what differs from the defaults", () => {
    const params = codec.serialize({
      ...codec.createDefault(),
      q: "ice",
      page: 3,
      tags: ["a", "b"],
    });

    expect(params.toString()).toBe("q=ice&page=3&tags=a&tags=b");
    expect(codec.serialize(codec.createDefault()).toString()).toBe("");
  });

  it("normalizes empty, invalid and default values into one canonical state", () => {
    const messy = {
      ...codec.createDefault(),
      page: Number.NaN,
      from: new Date(Number.NaN),
    };

    expect(codec.normalize(messy)).toEqual(codec.createDefault());
    expect(codec.key(codec.normalize(messy))).toBe("");
  });

  it("keys equal states equally, whatever order the URL had", () => {
    const a = codec.parse(new URLSearchParams("page=2&q=x"));
    const b = codec.parse(new URLSearchParams("q=x&page=2"));

    expect(codec.key(a)).toBe(codec.key(b));
    expect(codec.key(a)).toBe("q=x&page=2");
  });
});
