import { afterEach, expect, it, vi } from "vitest";
import {
  RoutingContext,
  resolvePathname,
  type RoutingConfig,
  type RoutingSource,
} from "./routing.svelte.js";

// `$app/paths` is a virtual module the SvelteKit plugin fills in from the generated app; in a
// node run there is no base path to speak of, and the point of `resolvePathname` is only that it
// forwards to `resolve` at all. Mocking is cheaper and more honest than booting a kit runtime.
vi.mock("$app/paths", () => ({ resolve: (path: string) => `/base${path}` }));

/** Nothing here asserts reactivity -- a plain object satisfies `RoutingSource` structurally, and
 * that is exactly the seam the class was built around. Reactivity is covered in the browser
 * spec, where runes are available. */
const sourceOn = (id: string | null, params: Record<string, string> = {}): RoutingSource => ({
  route: { id },
  params,
  url: new URL(`https://example.test${id ?? "/"}`),
});

const pages = (...ids: string[]): Record<string, unknown> =>
  Object.fromEntries(ids.map((id) => [`/src/routes${id === "/" ? "" : id}/+page.svelte`, {}]));

const config: RoutingConfig = {
  meta: {
    "/": { title: "Home", icon: "icon-home" },
    // No page of its own: a section heading whose children carry the pages.
    "/orders": { title: "Orders", requiredRoles: ["orders:read"] },
    "/orders/[id]": { title: ({ params }) => `Order ${params.id}` },
    // Plumbing -- resolves, gates, renders nothing.
    "/orders/[id]/lines": { requiredRoles: ["orders:write"] },
    "/settings": { title: "Settings" },
  },
  pages: pages("/", "/orders/[id]", "/orders/[id]/lines", "/settings"),
};

const warnings = () => {
  const spy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  return () => spy.mock.calls.map((call) => String(call[0]));
};

afterEach(() => {
  vi.restoreAllMocks();
});

it("reads navigability from the glob keys, not from the meta map", () => {
  const routing = new RoutingContext(config, sourceOn("/orders/[id]", { id: "7" }));

  expect(routing.matched.map((route) => [route.routeId, route.navigable])).toEqual([
    ["/", true],
    ["/orders", false],
    ["/orders/[id]", true],
  ]);
});

it("recovers the root route id from the bare page file", () => {
  const routing = new RoutingContext({ meta: { "/": {} }, pages: pages("/") }, sourceOn("/"));

  expect(routing.matched[0]?.navigable).toBe(true);
});

it("walks the declared prefixes of the match from root to leaf", () => {
  const routing = new RoutingContext(config, sourceOn("/orders/[id]/lines", { id: "42" }));

  expect(routing.matched.map((route) => route.routeId)).toEqual([
    "/",
    "/orders",
    "/orders/[id]",
    "/orders/[id]/lines",
  ]);
});

it("keeps plumbing in the trail with an empty label so its gate stays reachable", () => {
  const routing = new RoutingContext(config, sourceOn("/orders/[id]/lines", { id: "42" }));

  expect(routing.matched.map((route) => route.label)).toEqual(["Home", "Orders", "Order 42", ""]);
  expect(routing.matched.at(-1)?.meta.requiredRoles).toEqual(["orders:write"]);
});

it("skips prefixes the meta map never mentions", () => {
  const undeclared: RoutingConfig = {
    meta: { "/": { title: "Home" }, "/a/b": { title: "Deep" } },
    pages: pages("/", "/a/b"),
  };
  const routing = new RoutingContext(undeclared, sourceOn("/a/b"));

  expect(routing.matched.map((route) => route.routeId)).toEqual(["/", "/a/b"]);
});

it("resolves an empty trail when nothing matched", () => {
  const routing = new RoutingContext(config, sourceOn(null));

  expect(routing.matched).toEqual([]);
});

it("substitutes the current params into every pathname of the trail", () => {
  const routing = new RoutingContext(config, sourceOn("/orders/[id]/lines", { id: "42" }));

  expect(routing.matched.map((route) => route.pathname)).toEqual([
    "/",
    "/orders",
    "/orders/42",
    "/orders/42/lines",
  ]);
});

it("looks a matcher-qualified param up under its bare name", () => {
  const matcher: RoutingConfig = {
    meta: { "/invoices/[id=integer]": { title: "Invoice" } },
    pages: pages("/invoices/[id=integer]"),
  };
  const routing = new RoutingContext(matcher, sourceOn("/invoices/[id=integer]", { id: "9" }));

  expect(routing.matched[0]?.pathname).toBe("/invoices/9");
});

it("drops an optional or rest segment that captured nothing", () => {
  const catchAll: RoutingConfig = {
    meta: { "/docs/[[lang]]/[...slug]": { title: "Docs" } },
    pages: pages("/docs/[[lang]]/[...slug]"),
  };

  const filled = new RoutingContext(catchAll, sourceOn("/docs/[[lang]]/[...slug]", {}));
  expect(filled.matched[0]?.pathname).toBe("/docs");

  const withValues = new RoutingContext(
    catchAll,
    sourceOn("/docs/[[lang]]/[...slug]", { lang: "en", slug: "a/b" }),
  );
  expect(withValues.matched[0]?.pathname).toBe("/docs/en/a/b");
});

it("leaves an empty segment behind when a required param is missing", () => {
  const routing = new RoutingContext(config, sourceOn("/orders/[id]", {}));

  expect(routing.matched.at(-1)?.pathname).toBe("/orders/");
});

it("keeps group segments in the route id but drops them from the pathname", () => {
  const grouped: RoutingConfig = {
    meta: { "/(app)": { requiredRoles: ["member"] }, "/(app)/orders": { title: "Orders" } },
    pages: pages("/(app)/orders"),
  };
  const routing = new RoutingContext(grouped, sourceOn("/(app)/orders"));

  expect(routing.matched.map((route) => route.routeId)).toEqual(["/(app)", "/(app)/orders"]);
  expect(routing.matched.map((route) => route.pathname)).toEqual(["/", "/orders"]);
  expect(routing.matched[1]?.navigable).toBe(true);
});

it("returns only the direct children of a route id", () => {
  const routing = new RoutingContext(config, sourceOn("/"));

  expect(routing.children("/").map((route) => route.routeId)).toEqual(["/orders", "/settings"]);
  expect(routing.children("/orders").map((route) => route.routeId)).toEqual(["/orders/[id]"]);
});

it("returns plumbing children too, for the caller to filter", () => {
  const routing = new RoutingContext(config, sourceOn("/"));

  expect(routing.children("/orders/[id]")).toEqual([
    expect.objectContaining({ routeId: "/orders/[id]/lines", label: "" }),
  ]);
});

it("orders children by declaration, not by name or by filesystem", () => {
  const reversed: RoutingConfig = {
    meta: {
      "/": { title: "Home" },
      "/settings": { title: "Settings" },
      "/orders": { title: "Orders" },
    },
    pages: pages("/", "/settings", "/orders"),
  };
  const routing = new RoutingContext(reversed, sourceOn("/"));

  expect(routing.children("/").map((route) => route.routeId)).toEqual(["/settings", "/orders"]);
});

it("resolves child labels against the params of the current match", () => {
  const routing = new RoutingContext(config, sourceOn("/orders/[id]", { id: "13" }));

  expect(routing.children("/orders")).toEqual([
    expect.objectContaining({ label: "Order 13", pathname: "/orders/13" }),
  ]);
});

it("answers label lookups, including for unknown and untitled ids", () => {
  const routing = new RoutingContext(config, sourceOn("/orders/[id]", { id: "5" }));

  expect(routing.label("/settings")).toBe("Settings");
  expect(routing.label("/orders/[id]")).toBe("Order 5");
  expect(routing.label("/orders/[id]/lines")).toBe("");
  expect(routing.label("/nowhere")).toBe("");
});

it("warns in dev about a page that no meta entry covers", () => {
  const read = warnings();

  new RoutingContext(
    { meta: { "/": { title: "Home" } }, pages: pages("/", "/orders") },
    sourceOn("/"),
  );

  expect(read()).toEqual([expect.stringContaining("pages with no meta entry: /orders")]);
});

it("warns in dev about a meta entry with nothing beneath it", () => {
  const read = warnings();

  new RoutingContext(
    { meta: { "/": { title: "Home" }, "/gone": { title: "Gone" } }, pages: pages("/") },
    sourceOn("/"),
  );

  expect(read()).toEqual([
    expect.stringContaining("meta entries with no page beneath them: /gone"),
  ]);
});

it("does not call a parent entry stale when only its descendants have pages", () => {
  const read = warnings();

  new RoutingContext(config, sourceOn("/"));

  expect(read()).toEqual([]);
});

it("sends a runtime pathname through the app's base-path resolver", () => {
  expect(resolvePathname("/orders/42")).toBe("/base/orders/42");
});
