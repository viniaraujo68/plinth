import { expect, it } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-svelte";
import ErrorPage from "./ErrorPage.svelte";

it("names the missing address on a 404", async () => {
  render(ErrorPage, { status: 404, pathname: "/reports/2019" });

  await expect.element(page.getByRole("heading", { level: 1 })).toHaveTextContent("Page not found");
  await expect.element(page.getByText("/reports/2019")).toBeVisible();
  expect(page.getByRole("button", { name: "Reload" }).elements()).toHaveLength(0);
});

// A 500 might not repeat, so reloading is worth offering; the message from `error(status, …)` is
// the app's own words and is shown as written.
it("shows the status message and a reload for a server failure", async () => {
  render(ErrorPage, { status: 503, message: "Maintenance until 18:00." });

  await expect
    .element(page.getByRole("heading", { level: 1 }))
    .toHaveTextContent("Something went wrong");
  await expect.element(page.getByText("Error 503")).toBeVisible();
  await expect.element(page.getByText("Maintenance until 18:00.")).toBeVisible();
  await expect.element(page.getByRole("button", { name: "Reload" })).toBeVisible();
});

it("points the way home wherever the app mounted it", async () => {
  render(ErrorPage, { status: 500, homeHref: "/app/" });

  await expect
    .element(page.getByRole("link", { name: "Back to start" }))
    .toHaveAttribute("href", "/app/");
});

it("words the status chip as it was told", async () => {
  render(ErrorPage, { status: 503, statusLabel: (status) => `Failure ${status}` });

  await expect.element(page.getByText("Failure 503")).toBeVisible();
  expect(page.getByText("Error 503").elements()).toHaveLength(0);
});

it("titles a 404 as it was told", async () => {
  render(ErrorPage, { status: 404, notFoundTitle: "No such address" });

  await expect
    .element(page.getByRole("heading", { level: 1 }))
    .toHaveTextContent("No such address");
});

it("words the 404 body as it was told, around the path it was given", async () => {
  render(ErrorPage, {
    status: 404,
    pathname: "/reports/2019",
    notFoundBody: (pathname) => `Nothing lives at ${pathname ?? "that address"}.`,
  });

  await expect.element(page.getByText("Nothing lives at /reports/2019.")).toBeVisible();
});

it("titles every other status as it was told", async () => {
  render(ErrorPage, { status: 500, errorTitle: "That did not work" });

  await expect
    .element(page.getByRole("heading", { level: 1 }))
    .toHaveTextContent("That did not work");
});

it("falls back to the body it was told", async () => {
  render(ErrorPage, { status: 500, errorBody: "Something broke on our side." });

  await expect.element(page.getByText("Something broke on our side.")).toBeVisible();
});

// `errorBody` is only the fallback copy: a message the app passed still wins over it.
it("keeps a message ahead of the body it was told", async () => {
  render(ErrorPage, {
    status: 500,
    errorBody: "Something broke on our side.",
    message: "Maintenance until 18:00.",
  });

  await expect.element(page.getByText("Maintenance until 18:00.")).toBeVisible();
  expect(page.getByText("Something broke on our side.").elements()).toHaveLength(0);
});

it("labels the link home as it was told", async () => {
  render(ErrorPage, { status: 500, homeLabel: "Take me home" });

  await expect.element(page.getByRole("link", { name: "Take me home" })).toBeVisible();
});

it("labels the reload button as it was told", async () => {
  render(ErrorPage, { status: 500, reloadLabel: "Try again" });

  await expect.element(page.getByRole("button", { name: "Try again" })).toBeVisible();
});
