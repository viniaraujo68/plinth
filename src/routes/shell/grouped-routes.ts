import type { RoutingConfig } from "$lib/routing.svelte.js";

export type GroupedDemoId =
  | "/"
  | "/dashboard"
  | "/orders"
  | "/orders/[id]"
  | "/customers"
  | "/reports"
  | "/reports/sales"
  | "/reports/stock"
  | "/settings"
  | "/settings/profile"
  | "/settings/billing"
  | "/settings/members";

export const groupedDemoRoutes: RoutingConfig<GroupedDemoId> = {
  meta: {
    "/": { title: "Home", icon: "home" },
    "/dashboard": { title: "Dashboard", icon: "gauge" },
    "/orders": { title: "Orders", icon: "receipt" },
    "/orders/[id]": { title: ({ params }) => `Order #${params.id}` },
    "/customers": { title: "Customers", icon: "users" },
    "/reports": { title: "Reports", icon: "chart" },
    "/reports/sales": { title: "Sales", requiredRoles: ["reports:read"] },
    "/reports/stock": { title: "Stock", requiredRoles: ["reports:read"] },
    "/settings": { title: "Settings", icon: "settings" },
    "/settings/profile": { title: "Profile" },
    "/settings/billing": { title: "Billing" },
    "/settings/members": { title: "Members" },
  },

  pages: {
    "/src/routes/+page.svelte": {},
    "/src/routes/dashboard/+page.svelte": {},
    "/src/routes/orders/+page.svelte": {},
    "/src/routes/orders/[id]/+page.svelte": {},
    "/src/routes/customers/+page.svelte": {},
    "/src/routes/reports/sales/+page.svelte": {},
    "/src/routes/reports/stock/+page.svelte": {},
    "/src/routes/settings/+page.svelte": {},
    "/src/routes/settings/profile/+page.svelte": {},
    "/src/routes/settings/billing/+page.svelte": {},
    "/src/routes/settings/members/+page.svelte": {},
  },
};

export const GROUPED_DEMO_IDS = Object.keys(groupedDemoRoutes.meta).filter(
  (id) => id !== "/reports",
) as GroupedDemoId[];
