import { describe, expect, it } from "vitest";
import { loginUrl, safeNext, withNext } from "./redirect.js";

describe("safeNext", () => {
  it("keeps a path on this site, query and fragment included", () => {
    expect(safeNext("/groups/7")).toBe("/groups/7");
    expect(safeNext("/groups/7?tab=ranking#top")).toBe("/groups/7?tab=ranking#top");
    expect(safeNext("/")).toBe("/");
  });

  it("returns the path normalised, the way the browser would read it", () => {
    expect(safeNext("/a/../b")).toBe("/b");
  });

  it("refuses anything that is not a path", () => {
    expect(safeNext(null)).toBeNull();
    expect(safeNext(undefined)).toBeNull();
    expect(safeNext("")).toBeNull();
    expect(safeNext("groups/7")).toBeNull();
    expect(safeNext(" /groups/7")).toBeNull();
    expect(safeNext("https://evil.example/")).toBeNull();
    expect(safeNext("javascript:alert(1)")).toBeNull();
  });

  it("refuses the spellings a browser reads as another site", () => {
    expect(safeNext("//evil.example")).toBeNull();
    expect(safeNext("/\\evil.example")).toBeNull();
    expect(safeNext("/\\/evil.example")).toBeNull();
    // The URL parser strips tabs and line breaks first, which turns these into `//evil.example`.
    expect(safeNext("/\t/evil.example")).toBeNull();
    expect(safeNext("/\n/evil.example")).toBeNull();
  });

  it("keeps an encoded slash, which stays a path segment", () => {
    expect(safeNext("/%2F%2Fevil.example")).toBe("/%2F%2Fevil.example");
  });
});

describe("loginUrl", () => {
  it("carries the current path to the sign-in page", () => {
    expect(loginUrl(new URL("https://app.example/groups/7"))).toBe("/login?next=%2Fgroups%2F7");
  });

  it("drops the query string, where share tokens live", () => {
    expect(loginUrl(new URL("https://app.example/g/quinta?t=secret"))).toBe(
      "/login?next=%2Fg%2Fquinta",
    );
  });

  it("carries nothing from the root or from the sign-in page itself", () => {
    expect(loginUrl(new URL("https://app.example/"))).toBe("/login");
    expect(loginUrl(new URL("https://app.example/login?next=%2Fx"))).toBe("/login");
  });

  it("takes another sign-in path and parameter name", () => {
    expect(loginUrl("/groups/7", { path: "/entrar", param: "volta" })).toBe(
      "/entrar?volta=%2Fgroups%2F7",
    );
  });
});

describe("withNext", () => {
  it("carries a safe path along", () => {
    expect(withNext("/register", "/groups/7")).toBe("/register?next=%2Fgroups%2F7");
  });

  it("leaves the link bare when there is nothing safe to carry", () => {
    expect(withNext("/register", null)).toBe("/register");
    expect(withNext("/register", "//evil.example")).toBe("/register");
  });

  it("appends to a link that already has a query", () => {
    expect(withNext("/register?plan=free", "/groups/7")).toBe(
      "/register?plan=free&next=%2Fgroups%2F7",
    );
  });
});
