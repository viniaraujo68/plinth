import { describe, expect, it } from "vitest";
import { pageSpan } from "./paging.js";

describe("pageSpan", () => {
  it("maps an index range onto zero-based pages", () => {
    expect(pageSpan(0, 0, 20, null)).toEqual({ first: 0, last: 0 });
    expect(pageSpan(19, 20, 20, null)).toEqual({ first: 0, last: 1 });
    expect(pageSpan(45, 130, 20, null)).toEqual({ first: 2, last: 6 });
  });

  it("treats a reversed or negative range as a single page", () => {
    expect(pageSpan(-5, -1, 20, null)).toEqual({ first: 0, last: 0 });
    expect(pageSpan(50, 10, 20, null)).toEqual({ first: 2, last: 2 });
  });

  it("never asks for pages past a known total", () => {
    expect(pageSpan(0, 500, 10, 15)).toEqual({ first: 0, last: 1 });
    expect(pageSpan(900, 950, 10, 15)).toEqual({ first: 1, last: 1 });
  });

  it("asks for nothing once the set is known to be empty", () => {
    expect(pageSpan(0, 10, 10, 0)).toBeNull();
  });
});
