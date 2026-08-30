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

// The entry point table is the published surface written out by hand, so it drifts silently when
// an export is added. The count is what makes that drift visible.
it("lists every published entry point", async () => {
  render(Page);

  await expect.element(page.getByRole("table")).toBeInTheDocument();
  await expect(page.getByRole("row").elements()).toHaveLength(13);
  await expect(page.getByTestId("section-link").elements()).toHaveLength(3);
});
