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
