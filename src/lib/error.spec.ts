import { afterEach, expect, it, vi } from "vitest";
import { reportError, setErrorReporter } from "./error.js";

afterEach(() => {
  setErrorReporter(null);
  vi.restoreAllMocks();
});

it("reports to the console until an app installs a reporter", () => {
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
  const failure = new Error("boom");

  reportError(failure);

  expect(consoleError).toHaveBeenCalledWith(failure);
});

it("routes every report through the installed reporter", () => {
  const reporter = vi.fn();
  setErrorReporter(reporter);

  reportError("first");
  reportError("second");

  expect(reporter.mock.calls).toEqual([["first"], ["second"]]);
});

it("restores the console default when the reporter is cleared", () => {
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
  const reporter = vi.fn();

  setErrorReporter(reporter);
  setErrorReporter(null);
  reportError("orphan");

  expect(reporter).not.toHaveBeenCalled();
  expect(consoleError).toHaveBeenCalledWith("orphan");
});

it("keeps the original error when the reporter itself throws", () => {
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
  const reporterFailure = new Error("reporter is down");
  setErrorReporter(() => {
    throw reporterFailure;
  });

  expect(() => reportError("original")).not.toThrow();
  expect(consoleError).toHaveBeenNthCalledWith(1, "original");
  expect(consoleError).toHaveBeenNthCalledWith(2, reporterFailure);
});
