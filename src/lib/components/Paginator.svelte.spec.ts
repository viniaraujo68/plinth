import { expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-svelte";
import Paginator from "./Paginator.svelte";

it("emits the page the user picked", async () => {
  const onPageChange = vi.fn();
  render(Paginator, { pageNumber: 1, totalPages: 9, onPageChange });

  await page.getByRole("button", { name: "Page 4" }).click();

  expect(onPageChange).toHaveBeenCalledWith(4);
});

it("walks with the arrows", async () => {
  const onPageChange = vi.fn();
  render(Paginator, { pageNumber: 5, totalPages: 9, onPageChange });

  await page.getByRole("button", { name: "Next page" }).click();
  await page.getByRole("button", { name: "Previous page" }).click();

  expect(onPageChange.mock.calls).toEqual([[6], [4]]);
});

it("stays silent when the current page is clicked again", async () => {
  const onPageChange = vi.fn();
  render(Paginator, { pageNumber: 3, totalPages: 9, onPageChange });

  await page.getByRole("button", { name: "Page 3" }).click();

  expect(onPageChange).not.toHaveBeenCalled();
});

it("disables the previous arrow on the first page", async () => {
  render(Paginator, { pageNumber: 1, totalPages: 3 });

  await expect.element(page.getByRole("button", { name: "Previous page" })).toBeDisabled();
  await expect.element(page.getByRole("button", { name: "Next page" })).toBeEnabled();
});

it("disables the next arrow on the last page", async () => {
  render(Paginator, { pageNumber: 3, totalPages: 3 });

  await expect.element(page.getByRole("button", { name: "Next page" })).toBeDisabled();
  await expect.element(page.getByRole("button", { name: "Previous page" })).toBeEnabled();
});

// The uncounted flavour knows only whether one more page exists, so the last page is unreachable
// and there is no summary to show.
it("follows hasNextPage when no total is known", async () => {
  const onPageChange = vi.fn();
  render(Paginator, { pageNumber: 2, hasNextPage: false, onPageChange });

  await expect.element(page.getByRole("button", { name: "Next page" })).toBeDisabled();
  await page.getByRole("button", { name: "Previous page" }).click();

  expect(onPageChange).toHaveBeenCalledWith(1);
});

it("summarises the window when the item count is known", async () => {
  render(Paginator, { pageNumber: 3, pageSize: 20, totalPages: 6, totalItems: 113 });

  await expect
    .element(page.getByTestId("paginator-summary"))
    .toHaveTextContent("Showing 41 to 60 of 113 items");
});

it("clamps the last window to the item count", async () => {
  render(Paginator, { pageNumber: 6, pageSize: 20, totalPages: 6, totalItems: 113 });

  await expect
    .element(page.getByTestId("paginator-summary"))
    .toHaveTextContent("Showing 101 to 113 of 113 items");
});

it("reports a size change on its own channel", async () => {
  const onPageChange = vi.fn();
  const onPageSizeChange = vi.fn();
  render(Paginator, {
    pageNumber: 3,
    pageSize: 20,
    totalPages: 6,
    totalItems: 113,
    onPageChange,
    onPageSizeChange,
  });

  await page.getByRole("combobox", { name: "Items per page" }).selectOptions("50");

  expect(onPageSizeChange).toHaveBeenCalledWith(50);
  expect(onPageChange).not.toHaveBeenCalled();
});
