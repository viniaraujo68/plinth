import { expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-svelte";
import type { UserContext, UserStatus } from "../user/context.js";
import Harness from "./TopBarHarness.spec.svelte";

const userWith = (
  options: { status?: UserStatus; logout?: () => void; email?: string } = {},
): UserContext => {
  const status = options.status ?? "authenticated";
  return {
    status,
    data:
      status === "authenticated"
        ? { name: "Ada Lovelace", email: options.email ?? "ada@example.test" }
        : null,
    hasRole: () => false,
    hasAnyRole: () => true,
    hasAllRoles: () => true,
    logout: options.logout,
  };
};

const trigger = () => page.getByRole("button", { name: "Account menu" });
const menuOpen = () =>
  [...document.querySelectorAll("[popover]")].some((node) => node.matches(":popover-open"));

it("lays out the brand at the start and the app's controls at the end", async () => {
  render(Harness, { user: userWith() });

  await expect.element(page.getByTestId("brand")).toBeVisible();
  await expect.element(page.getByRole("button", { name: "Theme" })).toBeVisible();
});

it("shows no account menu to a visitor who is not signed in", async () => {
  render(Harness, { user: userWith({ status: "anonymous" }) });

  await expect.element(page.getByRole("button", { name: "Theme" })).toBeVisible();
  expect(document.querySelector(".plinth-top-bar-account")).toBeNull();
});

it("shows no account menu without a user context at all", async () => {
  render(Harness);

  await expect.element(page.getByTestId("brand")).toBeVisible();
  expect(document.querySelector(".plinth-top-bar-account")).toBeNull();
});

it("draws the signed-in user's initials on a disc", async () => {
  render(Harness, { user: userWith() });

  await expect.element(trigger()).toBeVisible();
  const avatar = document.querySelector<HTMLElement>(".plinth-top-bar-account .plinth-avatar")!;
  expect(avatar.textContent).toBe("AL");
  expect(getComputedStyle(avatar).borderRadius).toBe("9999px");
});

it("opens a menu with the user's name, the app's entries and signing out", async () => {
  render(Harness, { user: userWith({ logout: () => undefined }) });

  await trigger().click();

  await expect.element(page.getByText("Ada Lovelace")).toBeVisible();
  await expect.element(page.getByText("ada@example.test")).toBeVisible();
  await expect.element(page.getByRole("link", { name: "Account" })).toBeVisible();
  await expect.element(page.getByRole("button", { name: "Sign out" })).toBeVisible();
});

it("leaves the address line out when the user has none", async () => {
  render(Harness, { user: userWith({ email: "" }) });

  await trigger().click();

  await expect.element(page.getByText("Ada Lovelace")).toBeVisible();
  expect(document.querySelector(".plinth-top-bar-email")).toBeNull();
});

it("closes the menu when one of the app's entries is chosen", async () => {
  render(Harness, { user: userWith() });

  await trigger().click();
  await expect.poll(menuOpen).toBe(true);

  await page.getByRole("link", { name: "Account" }).click();

  await expect.poll(menuOpen).toBe(false);
});

it("signs out through the user context and closes the menu", async () => {
  const logout = vi.fn();
  render(Harness, { user: userWith({ logout }) });

  await trigger().click();
  await page.getByRole("button", { name: "Sign out" }).click();

  expect(logout).toHaveBeenCalledOnce();
  await expect.poll(menuOpen).toBe(false);
});

it("hides signing out when the context has nowhere to sign out to", async () => {
  render(Harness, { user: userWith() });

  await trigger().click();

  await expect.element(page.getByRole("link", { name: "Account" })).toBeVisible();
  expect(document.querySelector(".plinth-top-bar-menu button")).toBeNull();
});
