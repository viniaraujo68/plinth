import type { RoutingConfig } from "$lib/routing.svelte.js";

export type DemoId =
  | "/"
  | "/dashboard"
  | "/orders"
  | "/orders/[id]"
  | "/orders/[id]/lines"
  | "/orders/[id]/lines/[line]"
  | "/customers"
  | "/invoices"
  | "/reports"
  | "/inventory"
  | "/settings";

/**
 * A fake app's whole route declaration — the one file a real app writes, and the only place its
 * navigation exists. Seven titled sections plus a home entry is past what any phone's bottom bar
 * can hold, which is the point: the same eight entries become a sidebar, a five-slot bar and a
 * sheet without being written down a second time.
 *
 * `icon` is deliberately a bare word rather than an icon-font class. The library never parses the
 * string, so an app that renders icons through the `icon` snippet is free to make it a key into
 * whatever set it uses — which is what this demo does.
 */
export const demoRoutes: RoutingConfig<DemoId> = {
  meta: {
    "/": { title: "Home", icon: "home" },
    "/dashboard": { title: "Dashboard", icon: "gauge" },
    "/orders": { title: "Orders", icon: "receipt" },
    "/orders/[id]": { title: ({ params }) => `Order #${params.id}` },
    // No title: pure plumbing, so the deep line page still resolves a trail without inserting a
    // crumb nobody asked for. It keeps travelling through `matched` and `children`, and every
    // renderer drops it by testing `meta.title`.
    "/orders/[id]/lines": {},
    "/orders/[id]/lines/[line]": { title: ({ params }) => `Line ${params.line}` },
    "/customers": { title: "Customers", icon: "users" },
    "/invoices": { title: "Invoices", icon: "file" },
    "/reports": { title: "Reports", icon: "chart", requiredRoles: ["reports:read"] },
    "/inventory": { title: "Inventory", icon: "box" },
    "/settings": { title: "Settings", icon: "settings" },
  },

  // A hand-written stand-in for `import.meta.glob`, so the fake tree is self-contained. `/orders`
  // has no page of its own on purpose: it resolves as a non-navigable heading, which is what the
  // breadcrumb trail renders as plain text.
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
  },
};

/** The demo's icon set: eight inline paths, keyed by the same bare words `meta.icon` carries. */
export const DEMO_ICONS: Record<string, string> = {
  home: "M3 10.5 12 3l9 7.5M5.5 9.5V20h13V9.5",
  gauge: "M12 14 16 9M4 19a9 9 0 1 1 16 0",
  receipt: "M5 3v18l2.5-1.5L10 21l2-1.5L14 21l2.5-1.5L19 21V3zM8.5 8h7M8.5 12h7",
  users:
    "M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 20v-2a4 4 0 0 0-3-3.9M17 2.1a4 4 0 0 1 0 7.8",
  file: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5",
  chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  box: "M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5 9-5M12 13v8",
  settings:
    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-3-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.2-3l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 2.9-1.2V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 3 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z",
};
