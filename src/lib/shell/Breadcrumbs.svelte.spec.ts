import { expect, it } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-svelte";
import Harness from "./BreadcrumbsHarness.spec.svelte";
import { RoutingContext, type RoutingConfig, type RoutingSource } from "../routing.svelte.js";

const config: RoutingConfig = {
  meta: {
    "/": { title: "Acme", icon: "i-home" },
    "/orders": { title: "Orders" },
    "/orders/[id]": { title: ({ params }) => `Order ${params.id}` },
    // Untitled: it exists so the line page can resolve, and must never become a crumb.
    "/orders/[id]/lines": {},
    "/orders/[id]/lines/[line]": { title: ({ params }) => `Line ${params.line}` },
  },
  pages: {
    "/src/routes/+page.svelte": {},
    "/src/routes/orders/[id]/+page.svelte": {},
    "/src/routes/orders/[id]/lines/[line]/+page.svelte": {},
  },
};

const routingAt = (id: string | null, params: Record<string, string> = {}) => {
  const source: RoutingSource = { route: { id }, params, url: new URL("https://acme.test/") };
  return new RoutingContext(config, source);
};

const crumbs = () => [...document.querySelectorAll<HTMLElement>(".crumb")];
const labels = () => crumbs().map((crumb) => crumb.textContent?.trim() ?? "");
const tags = () => crumbs().map((crumb) => crumb.tagName);

it("renders the titled entries of the current match, root first", () => {
  render(Harness, { routing: routingAt("/orders/[id]/lines/[line]", { id: "7841", line: "3" }) });

  expect(labels()).toEqual(["Acme", "Orders", "Order 7841", "Line 3"]);
});

it("links every ancestor with a page of its own, and nothing else", () => {
  render(Harness, { routing: routingAt("/orders/[id]/lines/[line]", { id: "7841", line: "3" }) });

  // "Orders" is declared but has no page of its own, so it is a heading rather than a link; the
  // last crumb never links either.
  expect(tags()).toEqual(["A", "SPAN", "A", "SPAN"]);
  expect(crumbs()[2].getAttribute("href")).toBe("/orders/7841");
});

it("renders a section with no page of its own as plain text", () => {
  render(Harness, { routing: routingAt("/orders/[id]", { id: "7841" }) });

  // "/orders" is declared but has no +page.svelte, so it is a heading rather than a link.
  expect(labels()).toEqual(["Acme", "Orders", "Order 7841"]);
  expect(tags()).toEqual(["A", "SPAN", "SPAN"]);
});

it("marks the last crumb as the current page", () => {
  render(Harness, { routing: routingAt("/orders/[id]", { id: "7841" }) });

  const current = document.querySelectorAll('[aria-current="page"]');
  expect([...current].map((element) => element.textContent?.trim())).toEqual(["Order 7841"]);
});

it("shows the root icon and only the root icon", () => {
  render(Harness, { routing: routingAt("/orders/[id]", { id: "7841" }) });

  expect(document.querySelectorAll(".i-home")).toHaveLength(1);
  expect(crumbs()[0].querySelector(".i-home")).not.toBeNull();
});

it("renders nothing at all when nothing matched", () => {
  render(Harness, { routing: routingAt(null) });

  expect(crumbs()).toHaveLength(0);
});

it("renders a caller's own trail, with no routing context in sight", async () => {
  render(Harness, {
    crumbs: [
      { routeId: "/", label: "Acme", pathname: "/", navigable: true },
      { routeId: "/orders", label: "Orders", pathname: "/orders", navigable: true },
      { routeId: "leaf", label: "Purchase order 7841-A" },
    ],
  });

  expect(labels()).toEqual(["Acme", "Orders", "Purchase order 7841-A"]);
  expect(tags()).toEqual(["A", "A", "SPAN"]);
  await expect.element(page.getByRole("navigation", { name: "Breadcrumb" })).toBeInTheDocument();
});
