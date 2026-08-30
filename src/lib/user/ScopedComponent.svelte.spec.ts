import { expect, it } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-svelte";
import Harness from "./ScopedComponentHarness.spec.svelte";
import type { UserContext, UserData, UserStatus } from "./context.js";

/** The kind of implementation an app is expected to supply: reactive fields, flat role names,
 * and no opinion about where any of it came from. */
class TestUser implements UserContext {
  status: UserStatus = $state("authenticated");
  data: UserData | null = $state({ name: "Ada", email: "ada@example.test" });
  roles: string[] = $state([]);

  constructor(roles: string[]) {
    this.roles = roles;
  }

  hasRole = (role: string) => this.roles.includes(role);
  hasAnyRole = (roles: readonly string[]) =>
    roles.length === 0 || roles.some((role) => this.roles.includes(role));
  hasAllRoles = (roles: readonly string[]) =>
    roles.length === 0 || roles.every((role) => this.roles.includes(role));
}

const granted = () => page.getByText("granted");
const denied = () => page.getByText("denied");

it("renders the children for a user holding one of the roles", async () => {
  render(Harness, { user: new TestUser(["orders:read"]), roles: ["orders:read", "orders:write"] });

  await expect.element(granted()).toBeInTheDocument();
});

it("renders nothing when the roles do not match and no fallback was given", async () => {
  render(Harness, { user: new TestUser(["reports:read"]), roles: ["orders:read"] });

  await expect.element(granted()).not.toBeInTheDocument();
  await expect.element(denied()).not.toBeInTheDocument();
});

it("renders the fallback instead of the children when the check fails", async () => {
  render(Harness, {
    user: new TestUser(["reports:read"]),
    roles: ["orders:read"],
    withFallback: true,
  });

  await expect.element(denied()).toBeInTheDocument();
  await expect.element(granted()).not.toBeInTheDocument();
});

it("requires every role when requiresAll is set", async () => {
  render(Harness, {
    user: new TestUser(["orders:read"]),
    roles: ["orders:read", "orders:write"],
    requiresAll: true,
  });

  await expect.element(granted()).not.toBeInTheDocument();
});

it("passes requiresAll once the user holds the whole set", async () => {
  render(Harness, {
    user: new TestUser(["orders:read", "orders:write"]),
    roles: ["orders:read", "orders:write"],
    requiresAll: true,
  });

  await expect.element(granted()).toBeInTheDocument();
});

it("treats an empty role list as an open gate", async () => {
  render(Harness, { user: new TestUser([]), roles: [] });

  await expect.element(granted()).toBeInTheDocument();
});

it("opens the gate without a remount when the user gains the role", async () => {
  const user = new TestUser([]);
  render(Harness, { user, roles: ["orders:read"], withFallback: true });

  await expect.element(denied()).toBeInTheDocument();

  user.roles = ["orders:read"];

  await expect.element(granted()).toBeInTheDocument();
  await expect.element(denied()).not.toBeInTheDocument();
});

it("lets everything through when the app never set a user context", async () => {
  render(Harness, { roles: ["orders:read"], withFallback: true });

  await expect.element(granted()).toBeInTheDocument();
  await expect.element(denied()).not.toBeInTheDocument();
});
