import { expect, it } from "vitest";
import { RoutingContext, type RoutingConfig, type RoutingSource } from "./routing.svelte.js";

// The logic lives in `routing.spec.ts`, driven by plain objects in node. What can only be
// asserted where runes exist is the other half of the contract: that the context tracks a
// reactive source instead of snapshotting it at construction, which is what makes a single
// instance survive every client-side navigation.

const config: RoutingConfig = {
  meta: {
    "/": { title: "Home" },
    "/orders": { title: "Orders" },
    "/orders/[id]": { title: ({ params }) => `Order ${params.id}` },
  },
  pages: {
    "/src/routes/+page.svelte": {},
    "/src/routes/orders/+page.svelte": {},
    "/src/routes/orders/[id]/+page.svelte": {},
  },
};

/** `$state` is only legal as a declaration initializer, so each test declares its own. The type
 * is spelled out to keep the mutable view of the otherwise-readonly `RoutingSource`. */
type MutableSource = RoutingSource & {
  route: { id: string | null };
  params: Record<string, string>;
  url: URL;
};

const atRoot = (): MutableSource => ({
  route: { id: "/" },
  params: {},
  url: new URL("https://example.test/"),
});

it("re-resolves the trail when the source moves to another route", () => {
  const source: MutableSource = $state(atRoot());
  const routing = new RoutingContext(config, source);

  expect(routing.matched.map((route) => route.routeId)).toEqual(["/"]);

  source.route.id = "/orders/[id]";
  source.params = { id: "42" };

  expect(routing.matched.map((route) => route.label)).toEqual(["Home", "Orders", "Order 42"]);
  expect(routing.matched.at(-1)?.pathname).toBe("/orders/42");
});

it("re-resolves a dynamic label when only the params change", () => {
  const source: MutableSource = $state(atRoot());
  source.route.id = "/orders/[id]";
  source.params = { id: "1" };
  const routing = new RoutingContext(config, source);

  expect(routing.label("/orders/[id]")).toBe("Order 1");

  source.params = { id: "2" };

  expect(routing.label("/orders/[id]")).toBe("Order 2");
  expect(routing.children("/orders")[0]?.pathname).toBe("/orders/2");
});

it("exposes the live url", () => {
  const source: MutableSource = $state(atRoot());
  const routing = new RoutingContext(config, source);

  source.url = new URL("https://example.test/orders?page=2");

  expect(routing.url.search).toBe("?page=2");
});
