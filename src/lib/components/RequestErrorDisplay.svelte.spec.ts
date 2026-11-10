import { expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-svelte";
import { ApiError } from "../http.js";
import RequestErrorDisplay from "./RequestErrorDisplay.svelte";

const kind = () => document.querySelector("[data-kind]")?.getAttribute("data-kind");
const iconPaths = () =>
  [...document.querySelectorAll('[role="alert"] svg path')].map((path) => path.getAttribute("d"));

it.each([
  [new TypeError("Failed to fetch"), "offline", "Connection problem"],
  [
    new TypeError("NetworkError when attempting to fetch resource."),
    "offline",
    "Connection problem",
  ],
  [new TypeError("Load failed"), "offline", "Connection problem"],
  [new ApiError(401, "unauthorized"), "unauthorized", "Sign-in required"],
  [new ApiError(403, "forbidden"), "forbidden", "Access denied"],
  [new ApiError(404, "missing"), "not-found", "Not found"],
  [new ApiError(502, "bad gateway"), "server", "Server error"],
  [new Error("boom"), "unknown", "Something went wrong"],
] as const)("renders %s as %s", async (error, expectedKind, title) => {
  render(RequestErrorDisplay, { error });

  await expect.element(page.getByRole("alert")).toHaveTextContent(title);
  expect(kind()).toBe(expectedKind);
});

it("draws a different icon for every kind", () => {
  const errors = [
    new TypeError("Failed to fetch"),
    new ApiError(401, ""),
    new ApiError(403, ""),
    new ApiError(404, ""),
    new ApiError(500, ""),
    new Error("boom"),
  ];
  const icons = errors.map((error) => {
    const { unmount } = render(RequestErrorDisplay, { error });
    const drawn = iconPaths().join(" ");
    unmount();
    return drawn;
  });

  expect(new Set(icons).size).toBe(errors.length);
  expect(icons.every((icon) => icon.length > 0)).toBe(true);
});

it("never shows the error's own message", async () => {
  render(RequestErrorDisplay, { error: new ApiError(500, "pq: relation users does not exist") });

  await expect.element(page.getByRole("alert")).toBeVisible();
  expect(document.body.textContent).not.toContain("relation users");
});

it("renders anything at all without throwing, falling back to the generic copy", async () => {
  render(RequestErrorDisplay, { error: Symbol("weird") });

  await expect.element(page.getByRole("alert")).toHaveTextContent("Something went wrong");
});

it("takes per-kind wording, merged over the defaults", async () => {
  render(RequestErrorDisplay, {
    error: new ApiError(403, "forbidden"),
    labels: { forbidden: { title: "Sem acesso" }, server: { title: "unused" } },
    eyebrow: "Erro",
  });

  const alert = page.getByRole("alert");
  await expect.element(alert).toHaveTextContent("Sem acesso");
  await expect.element(alert).toHaveTextContent("You do not have permission to see this.");
  await expect.element(alert).toHaveTextContent("Erro");
});

it("offers a retry only when given a reset, under the label it was given", async () => {
  const reset = vi.fn();
  render(RequestErrorDisplay, {
    error: new TypeError("Load failed"),
    reset,
    retryLabel: "Tentar novamente",
  });

  await page.getByRole("button", { name: "Tentar novamente" }).click();

  expect(reset).toHaveBeenCalledTimes(1);
});

it("renders no retry button without a reset", async () => {
  render(RequestErrorDisplay, { error: new ApiError(500, "") });

  await expect.element(page.getByRole("alert")).toBeVisible();
  expect(page.getByRole("button").elements()).toHaveLength(0);
});
