import { page } from "vitest/browser";
import { render } from "vitest-browser-svelte";
import { expect, it } from "vitest";
import { LIBRARY_VERSION } from "$lib/index.js";
import Page from "./+page.svelte";

it("renders the showcase home in a real browser", async () => {
  render(Page);

  await expect.element(page.getByRole("heading", { level: 1 })).toHaveTextContent("plinth");
  await expect.element(page.getByTestId("version")).toHaveTextContent(`v${LIBRARY_VERSION}`);
});
