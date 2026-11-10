import { describe, expect, it, vi } from "vitest";
import { ApiError, classifyError } from "./http.js";

describe("network failures", () => {
  it.each([
    ["Chrome", "Failed to fetch"],
    ["Firefox", "NetworkError when attempting to fetch resource."],
    ["Safari", "Load failed"],
    ["Node", "fetch failed"],
  ])("reads %s's fetch TypeError as offline", (_browser, message) => {
    expect(classifyError(new TypeError(message), true)).toBe("offline");
  });

  it("reads any TypeError as offline while the browser says it is offline", () => {
    expect(classifyError(new TypeError("Something unrecognised"), false)).toBe("offline");
  });

  it("keeps a programming TypeError apart from a network failure while online", () => {
    const bug = new TypeError("Cannot read properties of undefined (reading 'id')");

    expect(classifyError(bug, true)).toBe("unknown");
    expect(classifyError(bug, undefined)).toBe("unknown");
  });

  it("does not read a network message on anything but a TypeError", () => {
    expect(classifyError(new Error("Failed to fetch"), true)).toBe("unknown");
  });

  it("classifies a TypeError from another realm by its name", () => {
    expect(classifyError({ name: "TypeError", message: "Load failed" }, true)).toBe("offline");
  });

  it("reads navigator.onLine when no answer is passed", () => {
    vi.stubGlobal("navigator", { onLine: false });
    try {
      expect(classifyError(new TypeError("Something unrecognised"))).toBe("offline");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("falls back to the message where navigator has no onLine", () => {
    vi.stubGlobal("navigator", {});
    try {
      expect(classifyError(new TypeError("Failed to fetch"))).toBe("offline");
      expect(classifyError(new TypeError("Something unrecognised"))).toBe("unknown");
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("statuses", () => {
  it.each([
    [401, "unauthorized"],
    [403, "forbidden"],
    [404, "not-found"],
    [500, "server"],
    [502, "server"],
    [503, "server"],
    [599, "server"],
  ] as const)("reads an ApiError %i as %s", (status, kind) => {
    expect(classifyError(new ApiError(status, "failed"), true)).toBe(kind);
  });

  it("reads any object with a numeric status, such as SvelteKit's HttpError", () => {
    expect(classifyError({ status: 404, body: { message: "Not Found" } }, true)).toBe("not-found");
  });

  it("lets a status win over the browser being offline", () => {
    expect(classifyError(new ApiError(503, "unavailable"), false)).toBe("server");
  });

  it.each([400, 409, 422, 429, 600, 0])("leaves status %i to the generic fallback", (status) => {
    expect(classifyError(new ApiError(status, "failed"), true)).toBe("unknown");
  });

  it("ignores a status that is not a number", () => {
    expect(classifyError({ status: "404" }, true)).toBe("unknown");
  });
});

describe("everything else", () => {
  it.each([
    ["a plain error", new Error("boom")],
    ["a string", "boom"],
    ["null", null],
    ["undefined", undefined],
    ["a number", 42],
  ])("classifies %s as unknown", (_label, error) => {
    expect(classifyError(error, true)).toBe("unknown");
  });
});
