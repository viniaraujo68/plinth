import type { RouteId } from "$app/types";
import type { RoutingConfig } from "$lib/routing.svelte.js";

/**
 * The showcase's own route metadata — the file an app would write once and never think about
 * again. It is deliberately the whole map rather than a trimmed sample: the point of the pattern
 * is that a single declaration feeds breadcrumbs, navigation, document titles and role gates,
 * and a five-entry excerpt would not show that.
 *
 * `RouteId` comes from `$app/types`, so every key below is checked against the routes that
 * actually exist. Rename a directory and this file stops compiling, which is the whole reason
 * to key it this way.
 */
export const showcaseRoutes: RoutingConfig<RouteId> = {
  meta: {
    "/": { title: "plinth", icon: "icon-[lucide--home]" },
    "/components": { title: "Components", icon: "icon-[lucide--shapes]" },
    "/components/async-button": { title: "AsyncButton" },
    "/components/copyable": { title: "Copyable" },
    "/components/date-range-picker": { title: "DateRangePicker" },
    "/components/dialog": { title: "Dialog" },
    "/components/dropdown": { title: "Dropdown" },
    "/components/error-display": { title: "ErrorDisplay" },
    "/components/error-page": { title: "ErrorPage" },
    "/components/loading-button": { title: "LoadingButton" },
    "/components/logo": { title: "Logo" },
    "/components/modal": { title: "Modal" },
    "/components/paginator": { title: "Paginator" },
    "/components/refresh-button": { title: "RefreshButton" },
    "/components/select": { title: "Select" },
    "/components/skeleton": { title: "Skeleton" },
    "/components/toast": { title: "Toast" },
    "/components/tooltip": { title: "Tooltip" },
    "/formatters": { title: "Formatters", icon: "icon-[lucide--hash]" },
    "/http": { title: "HTTP", icon: "icon-[lucide--cable]" },
    "/patterns": { title: "Patterns", icon: "icon-[lucide--puzzle]" },
    "/theme": { title: "Theme", icon: "icon-[lucide--palette]" },
    "/routing": { title: "Routing", icon: "icon-[lucide--route]" },
    "/shell": { title: "Shell", icon: "icon-[lucide--layout-dashboard]" },
    "/table": { title: "DataTable", icon: "icon-[lucide--table]" },
    "/user": { title: "User", icon: "icon-[lucide--user-round]" },
  },

  // The glob has to be written here, in the app, and not inside the library: Vite rewrites the
  // literal call at build time against the file it appears in, so a library issuing it on the
  // app's behalf would scan its own package and come back empty-handed.
  pages: import.meta.glob("/src/routes/**/+page.svelte"),
};
