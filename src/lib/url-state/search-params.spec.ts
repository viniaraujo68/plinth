import { expect, it } from "vitest";
import { changedParams, pickParams, sameLocation, withOwnedParams } from "./search-params.js";

const at = (href: string) => new URL(href, "https://example.test");

it("replaces only the owned params and keeps every foreign one", () => {
  const next = withOwnedParams(
    at("/list?tab=2&q=old&tags=a&tags=b#top"),
    ["q", "tags"],
    new URLSearchParams("tags=c&q=new"),
  );

  expect(next.pathname).toBe("/list");
  expect(next.hash).toBe("#top");
  expect(next.searchParams.get("tab")).toBe("2");
  expect(next.searchParams.get("q")).toBe("new");
  expect(next.searchParams.getAll("tags")).toEqual(["c"]);
});

it("removes an owned param the write no longer carries", () => {
  const next = withOwnedParams(at("/list?q=old&page=3"), ["q", "page"], new URLSearchParams());

  expect(next.search).toBe("");
});

it("does not mutate the URL it starts from", () => {
  const base = at("/list?q=old");
  withOwnedParams(base, ["q"], new URLSearchParams("q=new"));

  expect(base.search).toBe("?q=old");
});

it("treats a reordered query as the same location", () => {
  expect(sameLocation(at("/a?x=1&y=2"), at("/a?y=2&x=1"))).toBe(true);
  expect(sameLocation(at("/a?x=1"), at("/a?x=2"))).toBe(false);
  expect(sameLocation(at("/a?x=1"), at("/b?x=1"))).toBe(false);
  expect(sameLocation(at("/a?x=1#one"), at("/a?x=1#two"))).toBe(false);
});

it("keeps the order of a repeated param significant", () => {
  expect(sameLocation(at("/a?t=1&t=2"), at("/a?t=2&t=1"))).toBe(false);
});

it("picks only the named params", () => {
  expect(pickParams(new URLSearchParams("a=1&b=2&a=3"), ["a"]).toString()).toBe("a=1&a=3");
});

it("names the params whose values differ", () => {
  const previous = new URLSearchParams("q=a&page=2&tags=x");
  const next = new URLSearchParams("q=ab&page=2&tags=x&tags=y&empty=");

  expect(changedParams(previous, next)).toEqual(["q", "tags", "empty"]);
  expect(changedParams(next, next)).toEqual([]);
});
