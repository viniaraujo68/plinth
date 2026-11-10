import { expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-svelte";
import Harness from "./VirtualJsonViewHarness.spec.svelte";
import "../theme/theme.css";

const ITEMS = Array.from({ length: 2000 }, (_, index) => ({
  id: index,
  label: `item-${index}`,
  tags: ["a", "b"],
}));

it("renders only the rows in view of a large document", async () => {
  render(Harness, { value: { items: ITEMS } });

  await expect.element(page.getByText('"item-0"')).toBeInTheDocument();
  const rows = document.querySelectorAll("[data-line]").length;
  expect(rows).toBeGreaterThan(5);
  expect(rows).toBeLessThan(200);
  expect(page.getByText('"item-1999"').query()).toBeNull();
});

it("scrolls a search match far down the document into view", async () => {
  render(Harness, { value: { items: ITEMS } });

  await page.getByText('"item-0"').click();
  await userEvent.keyboard("{Control>}f{/Control}");
  await userEvent.keyboard("item-1990");

  await expect.element(page.getByText('"item-1990"')).toBeVisible();
});
