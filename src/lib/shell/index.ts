// The application chrome around a routed page. Everything here reads the routing context rather
// than a tree of its own, so the navigation an app declares once in `routes.ts` is the navigation
// that renders — on a sidebar, on a bottom bar and in a breadcrumb trail alike.
// `@viniaraujo68/plinth/shell`.
export { default as AppShell } from "./AppShell.svelte";
export { default as Breadcrumbs } from "./Breadcrumbs.svelte";
export type { Crumb } from "./crumbs.js";
