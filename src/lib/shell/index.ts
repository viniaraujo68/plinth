// The application chrome around a routed page. `AppShell` and `Breadcrumbs` read the routing
// context rather than a tree of their own, so the navigation an app declares once in `routes.ts`
// is the navigation that renders — on a sidebar, on a bottom bar and in a breadcrumb trail alike.
// `TopBar` is the lighter alternative for an app with little to navigate, and
// `NavigationProgress` goes with either.
// `@viniaraujo68/plinth/shell`.
export { default as AppShell } from "./AppShell.svelte";
export { default as Breadcrumbs } from "./Breadcrumbs.svelte";
export { default as NavigationProgress } from "./NavigationProgress.svelte";
export { default as TopBar } from "./TopBar.svelte";
export type { Crumb } from "./crumbs.js";
