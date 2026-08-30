import { afterEach, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-svelte";
import Toaster from "./Toaster.svelte";
import { createToastManager } from "./toast-manager.svelte.js";

// Every test gets its own manager: the module-level `toast` helper is a browser singleton, so
// sharing it would carry a stray toast from one test into the next.
const mount = () => {
  const manager = createToastManager();
  render(Toaster, { manager });
  return manager;
};

const region = () => document.querySelector<HTMLElement>('[role="region"][aria-live="polite"]');

const openModals: HTMLDialogElement[] = [];

afterEach(() => {
  for (const dialog of openModals.splice(0)) {
    dialog.close();
    dialog.remove();
  }
});

it("keeps the live region mounted before anything is queued", () => {
  mount();

  // A region added to the DOM together with its first message is announced unreliably, so the
  // empty case is the one worth asserting.
  expect(region()).not.toBeNull();
  expect(region()?.getAttribute("aria-label")).toBe("Notifications");
});

it("renders a queued toast with its message and description", async () => {
  const manager = mount();

  manager.success("Settings saved.", { description: "All changes are live." });

  await expect.element(page.getByText("Settings saved.")).toBeInTheDocument();
  await expect.element(page.getByText("All changes are live.")).toBeInTheDocument();
});

it("announces info and success politely and warnings and errors assertively", async () => {
  const manager = mount();

  manager.info("i");
  manager.success("s");
  manager.warning("w");
  manager.error("e");

  await expect.element(page.getByTestId("toast").nth(3)).toBeInTheDocument();
  const roles = [...document.querySelectorAll('[data-testid="toast"]')].map((toast) => [
    toast.getAttribute("data-variant"),
    toast.getAttribute("role"),
  ]);

  expect(roles).toEqual([
    ["info", "status"],
    ["success", "status"],
    ["warning", "alert"],
    ["error", "alert"],
  ]);
});

it("gives every variant an icon so severity is not carried by color alone", async () => {
  const manager = mount();

  manager.info("i");
  manager.error("e");

  await expect.element(page.getByTestId("toast").nth(1)).toBeInTheDocument();
  // The first svg is the variant icon; the second, when present, belongs to the dismiss button.
  const icons = [...document.querySelectorAll('[data-testid="toast"]')].map((toast) =>
    [...(toast.querySelector("svg")?.querySelectorAll("path") ?? [])]
      .map((path) => path.getAttribute("d"))
      .join(" "),
  );

  expect(icons).toHaveLength(2);
  expect(icons[0]).not.toBe(icons[1]);
});

it("removes a toast through its dismiss button", async () => {
  const manager = mount();
  manager.info("Export queued.", { duration: Number.POSITIVE_INFINITY });

  await page.getByRole("button", { name: "Dismiss notification" }).click();

  await expect.element(page.getByText("Export queued.")).not.toBeInTheDocument();
  expect(manager.toasts).toHaveLength(0);
});

it("omits the dismiss button when the toast is not dismissible", async () => {
  const manager = mount();

  manager.info("Locked.", { dismissible: false, duration: Number.POSITIVE_INFINITY });

  await expect.element(page.getByText("Locked.")).toBeInTheDocument();
  await expect
    .element(page.getByRole("button", { name: "Dismiss notification" }))
    .not.toBeInTheDocument();
});

it("freezes the countdown while the pointer rests on the toast", async () => {
  const manager = mount();
  const toast = page.getByTestId("toast");
  manager.info("Read me.", { duration: 800 });

  await toast.hover();
  // Well past the duration: a countdown that was not frozen would have emptied the queue.
  await new Promise((resolve) => setTimeout(resolve, 1200));
  expect(manager.toasts).toHaveLength(1);

  await toast.unhover();
  await vi.waitFor(() => {
    expect(manager.toasts).toHaveLength(0);
  });
});

it("hosts the stack inside the topmost open modal dialog", async () => {
  mount();
  const dialog = document.createElement("dialog");
  document.body.appendChild(dialog);
  openModals.push(dialog);

  // A modal <dialog> paints above any popover anchored in <body>, so a toast stack left there
  // would be invisible for exactly as long as the modal is open.
  dialog.showModal();

  await vi.waitFor(() => {
    expect(region()?.parentElement).toBe(dialog);
  });
});

it("moves the stack back to the body when the modal closes", async () => {
  mount();
  const dialog = document.createElement("dialog");
  document.body.appendChild(dialog);
  openModals.push(dialog);

  dialog.showModal();
  await vi.waitFor(() => {
    expect(region()?.parentElement).toBe(dialog);
  });

  dialog.close();
  await vi.waitFor(() => {
    expect(region()?.parentElement).toBe(document.body);
  });
});
