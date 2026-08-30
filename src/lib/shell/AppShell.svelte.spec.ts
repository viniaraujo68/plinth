import { beforeEach, expect, it } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-svelte";
import Harness from "./AppShellHarness.spec.svelte";
import { RoutingContext, type RoutingConfig, type RoutingSource } from "../routing.svelte.js";
import type { UserContext, UserData, UserStatus } from "../user/context.js";

/** Eight titled entries once Home is counted — three more than the bottom bar has slots, which is
 * what makes the overflow path reachable at all. `/orders/[id]/lines` carries no title: it is the
 * plumbing entry every renderer has to drop. */
const config: RoutingConfig = {
  meta: {
    "/": { title: "Home", icon: "i-home" },
    "/dashboard": { title: "Dashboard", icon: "i-gauge" },
    "/orders": { title: "Orders", icon: "i-receipt" },
    "/orders/[id]": { title: ({ params }) => `Order ${params.id}` },
    "/orders/[id]/lines": {},
    "/orders/[id]/lines/[line]": { title: ({ params }) => `Line ${params.line}` },
    "/customers": { title: "Customers", icon: "i-users" },
    "/invoices": { title: "Invoices", icon: "i-file" },
    "/reports": { title: "Reports", icon: "i-chart", requiredRoles: ["reports:read"] },
    "/inventory": { title: "Inventory", icon: "i-box" },
    "/settings": { title: "Settings", icon: "i-settings" },
    "/internal": {},
  },
  pages: {
    "/src/routes/+page.svelte": {},
    "/src/routes/dashboard/+page.svelte": {},
    "/src/routes/orders/[id]/+page.svelte": {},
    "/src/routes/orders/[id]/lines/[line]/+page.svelte": {},
    "/src/routes/customers/+page.svelte": {},
    "/src/routes/invoices/+page.svelte": {},
    "/src/routes/reports/+page.svelte": {},
    "/src/routes/inventory/+page.svelte": {},
    "/src/routes/settings/+page.svelte": {},
    "/src/routes/internal/+page.svelte": {},
  },
};

const sourceAt = (id: string | null, params: Record<string, string> = {}): RoutingSource => ({
  route: { id },
  params,
  url: new URL("https://acme.test/"),
});

const routingAt = (id: string | null, params?: Record<string, string>) =>
  new RoutingContext(config, sourceAt(id, params));

class TestUser implements UserContext {
  status: UserStatus = $state("authenticated");
  data: UserData | null = $state({ name: "Ada Lovelace", email: "ada@example.test" });
  roles: string[] = $state([]);
  logout: (() => void) | undefined;

  constructor(options: { roles?: string[]; status?: UserStatus; logout?: () => void } = {}) {
    this.roles = options.roles ?? [];
    this.status = options.status ?? "authenticated";
    if (this.status !== "authenticated") this.data = null;
    this.logout = options.logout;
  }

  private get signedIn() {
    return this.status === "authenticated";
  }

  hasRole = (role: string) => this.signedIn && this.roles.includes(role);
  hasAnyRole = (roles: readonly string[]) =>
    roles.length === 0 || (this.signedIn && roles.some((role) => this.roles.includes(role)));
  hasAllRoles = (roles: readonly string[]) =>
    roles.length === 0 || (this.signedIn && roles.every((role) => this.roles.includes(role)));
}

// The two forms are both in the markup at all times; only the container query decides which one is
// displayed. Querying by class rather than by role is deliberate: it can see the hidden form too,
// which is what several of these assertions are actually about.
const WIDE = "900px";
const NARROW = "375px";

const shell = () => document.querySelector<HTMLElement>(".plinth-shell")!;
const sidebarLinks = () => [
  ...document.querySelectorAll<HTMLAnchorElement>(".shell-sidebar .nav-link"),
];
const sidebarLabels = () => sidebarLinks().map((link) => link.textContent?.trim() ?? "");
const barLinks = () => [...document.querySelectorAll<HTMLElement>(".shell-bottom-bar .bar-link")];
const barLabels = () => barLinks().map((link) => link.textContent?.trim() ?? "");
const sheetLinks = () => [...document.querySelectorAll<HTMLAnchorElement>(".plinth-sheet a")];
const currentLabels = () =>
  [...document.querySelectorAll<HTMLElement>('.shell-sidebar [aria-current="page"]')].map(
    (element) => element.textContent?.trim() ?? "",
  );

const STORAGE_KEY = "plinth-test:sidebar";

beforeEach(() => {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem("plinth:sidebar-collapsed");
});

it("derives the sidebar from the route tree, dropping plumbing entries", () => {
  render(Harness, { routing: routingAt("/dashboard"), width: WIDE });

  // "/internal" and "/orders/[id]/lines" are declared but untitled; "/orders/[id]" is a grandchild.
  expect(sidebarLabels()).toEqual([
    "Home",
    "Dashboard",
    "Orders",
    "Customers",
    "Invoices",
    "Reports",
    "Inventory",
    "Settings",
  ]);
});

it("drops an entry the user context gates out", () => {
  render(Harness, { routing: routingAt("/dashboard"), width: WIDE, user: new TestUser() });

  expect(sidebarLabels()).not.toContain("Reports");
});

it("shows a gated entry once the user holds the role, without a remount", async () => {
  const user = new TestUser();
  render(Harness, { routing: routingAt("/dashboard"), width: WIDE, user });

  expect(sidebarLabels()).not.toContain("Reports");

  user.roles = ["reports:read"];

  await expect.poll(sidebarLabels).toContain("Reports");
});

it("marks the top-level entry the current match sits under", () => {
  render(Harness, {
    routing: routingAt("/orders/[id]/lines/[line]", { id: "7", line: "3" }),
    width: WIDE,
  });

  // Home is excluded on purpose: everything is below the root, so it would otherwise be current
  // everywhere.
  expect(currentLabels()).toEqual(["Orders"]);
});

it("marks Home only on the exact root", () => {
  render(Harness, { routing: routingAt("/"), width: WIDE });

  expect(currentLabels()).toEqual(["Home"]);
});

it("marks nothing when the route did not match anything declared", () => {
  render(Harness, { routing: routingAt(null), width: WIDE });

  expect(currentLabels()).toEqual([]);
  // No trail means no Home entry either -- it is derived off the match, never re-declared.
  expect(sidebarLabels()).not.toContain("Home");
});

it("hands meta.icon straight to markup as a class by default", () => {
  render(Harness, { routing: routingAt("/dashboard"), width: WIDE });

  expect(document.querySelector(".shell-sidebar .nav-icon .i-gauge")).not.toBeNull();
});

it("lets the icon snippet decide what meta.icon means", () => {
  render(Harness, { routing: routingAt("/dashboard"), width: WIDE, customIcons: true });

  expect(document.querySelector('[data-testid="custom-icon"][data-icon="i-gauge"]')).not.toBeNull();
  expect(document.querySelector(".shell-sidebar .nav-icon .i-gauge")).toBeNull();
});

it("collapses and expands the sidebar from its toggle", async () => {
  render(Harness, { routing: routingAt("/dashboard"), width: WIDE, storageKey: STORAGE_KEY });

  const toggle = page.getByRole("button", { name: "Toggle sidebar" });
  await expect.element(toggle).toHaveAttribute("aria-pressed", "false");

  await toggle.click();

  await expect.element(toggle).toHaveAttribute("aria-pressed", "true");
  expect(shell().classList.contains("collapsed")).toBe(true);
});

it("writes the collapse state to storage", async () => {
  render(Harness, { routing: routingAt("/dashboard"), width: WIDE, storageKey: STORAGE_KEY });

  await page.getByRole("button", { name: "Toggle sidebar" }).click();

  await expect.poll(() => localStorage.getItem(STORAGE_KEY)).toBe("true");
});

it("starts collapsed when storage says so", () => {
  localStorage.setItem(STORAGE_KEY, "true");

  render(Harness, { routing: routingAt("/dashboard"), width: WIDE, storageKey: STORAGE_KEY });

  expect(shell().classList.contains("collapsed")).toBe(true);
});

it("does not touch storage when persistence is turned off", async () => {
  render(Harness, { routing: routingAt("/dashboard"), width: WIDE, storageKey: null });

  await page.getByRole("button", { name: "Toggle sidebar" }).click();

  expect(shell().classList.contains("collapsed")).toBe(true);
  expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
});

it("shows the sidebar and hides the bottom bar in a wide container", () => {
  render(Harness, { routing: routingAt("/dashboard"), width: WIDE });

  expect(getComputedStyle(document.querySelector(".shell-sidebar")!).display).not.toBe("none");
  expect(getComputedStyle(document.querySelector(".shell-bottom-bar")!).display).toBe("none");
});

it("shows the bottom bar and hides the sidebar in a narrow container", () => {
  render(Harness, { routing: routingAt("/dashboard"), width: NARROW });

  expect(getComputedStyle(document.querySelector(".shell-sidebar")!).display).toBe("none");
  expect(getComputedStyle(document.querySelector(".shell-bottom-bar")!).display).not.toBe("none");
});

it("fills the bottom bar to its slot count and folds the rest behind More", () => {
  render(Harness, { routing: routingAt("/dashboard"), width: NARROW });

  // Eight entries into five slots: the last slot is spent on "More".
  expect(barLabels()).toEqual(["Home", "Dashboard", "Orders", "Customers", "More"]);
});

it("uses every slot when the entries fit exactly", () => {
  render(Harness, { routing: routingAt("/dashboard"), width: NARROW, bottomBarSlots: 8 });

  expect(barLabels()).toHaveLength(8);
  expect(barLabels()).not.toContain("More");
});

it("lists the overflow in the sheet the More item opens", async () => {
  render(Harness, { routing: routingAt("/dashboard"), width: NARROW });

  expect(sheetLinks()).toHaveLength(0);

  await page.getByRole("button", { name: "More" }).click();

  await expect
    .poll(() => sheetLinks().map((link) => link.textContent?.trim()))
    .toEqual(["Invoices", "Reports", "Inventory", "Settings"]);
  expect(document.querySelector<HTMLDialogElement>(".plinth-sheet")?.open).toBe(true);
});

it("closes the sheet from its own close button", async () => {
  render(Harness, { routing: routingAt("/dashboard"), width: NARROW });

  await page.getByRole("button", { name: "More" }).click();
  await expect.poll(() => sheetLinks().length).toBe(4);

  await page.getByRole("button", { name: "Close" }).click();

  await expect.poll(() => sheetLinks().length).toBe(0);
});

it("gives every bottom bar target at least 44px in both directions", async () => {
  render(Harness, { routing: routingAt("/dashboard"), width: NARROW });

  await expect.poll(() => barLinks().length).toBe(5);
  for (const link of barLinks()) {
    const box = link.getBoundingClientRect();
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.width).toBeGreaterThanOrEqual(44);
  }
});

it("pays the safe-area inset out of one custom property", () => {
  render(Harness, { routing: routingAt("/dashboard"), width: NARROW });

  // `env(safe-area-inset-bottom)` is 0 in a headless browser, so what is asserted is the seam
  // rather than the value: the bar's padding and the content's reserved room both read the same
  // property, so a device that reports an inset moves both.
  shell().style.setProperty("--plinth-safe-area-bottom", "24px");

  expect(getComputedStyle(document.querySelector(".shell-bottom-bar")!).paddingBottom).toBe("24px");
  expect(getComputedStyle(document.querySelector(".shell-content")!).paddingBottom).toBe("80px");
});

it("reserves no room under the content once the bar is gone", () => {
  render(Harness, { routing: routingAt("/dashboard"), width: WIDE });

  expect(getComputedStyle(document.querySelector(".shell-content")!).paddingBottom).toBe("0px");
});

it("renders no user block at all without a user context", () => {
  render(Harness, { routing: routingAt("/dashboard"), width: WIDE });

  expect(document.querySelector(".user-card")).toBeNull();
});

it("renders no user block for someone who is not signed in", () => {
  render(Harness, {
    routing: routingAt("/dashboard"),
    width: WIDE,
    user: new TestUser({ status: "anonymous" }),
  });

  expect(document.querySelector(".user-card")).toBeNull();
});

it("renders the name, the address and the initials of a signed-in user", async () => {
  render(Harness, { routing: routingAt("/dashboard"), width: WIDE, user: new TestUser() });

  await expect.element(page.getByText("Ada Lovelace")).toBeInTheDocument();
  await expect.element(page.getByText("ada@example.test")).toBeInTheDocument();
  expect(document.querySelector(".avatar-initials")?.textContent).toBe("AL");
});

it("cuts the avatar to the mark's silhouette rather than to a disc", () => {
  render(Harness, { routing: routingAt("/dashboard"), width: WIDE, user: new TestUser() });

  const avatar = document.querySelector<HTMLElement>(".avatar-initials")!;
  const clip = getComputedStyle(avatar).clipPath;

  // No radius left to round: the shape is the clip now, and a leftover circle would fight it.
  expect(getComputedStyle(avatar).borderRadius).toBe("0px");

  const id = /url\(["']?#(?<id>[^"')]+)/u.exec(clip)?.groups?.id;
  expect(id).toBeDefined();

  // The reference has to resolve inside the same tree the shell rendered, which is the half of
  // this that a computed value alone cannot tell you.
  const definition = document.getElementById(id!);
  expect(definition?.tagName).toBe("clipPath");
  // Normalised units are what let one declaration fit an avatar of any size.
  expect(definition?.getAttribute("clipPathUnits")).toBe("objectBoundingBox");
});

it("hides the sign-out control when the context has nowhere to sign out to", () => {
  render(Harness, { routing: routingAt("/dashboard"), width: WIDE, user: new TestUser() });

  expect(document.querySelector('[aria-label="Sign out"]')).toBeNull();
});

it("signs out through the context when it can", async () => {
  let signedOut = false;
  render(Harness, {
    routing: routingAt("/dashboard"),
    width: WIDE,
    user: new TestUser({
      logout: () => {
        signedOut = true;
      },
    }),
  });

  await page.getByRole("button", { name: "Sign out" }).click();

  expect(signedOut).toBe(true);
});

it("renders the brand snippet in the sidebar header", async () => {
  render(Harness, { routing: routingAt("/dashboard"), width: WIDE, withBrand: true });

  await expect.element(page.getByTestId("brand")).toBeInTheDocument();
});
