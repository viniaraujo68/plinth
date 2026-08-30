import type { ResolvedRoute, RouteMeta } from "../routing.svelte.js";

/**
 * One step of a breadcrumb trail.
 *
 * Deliberately a subset of {@link ResolvedRoute} rather than that type itself, so a page can
 * append a leaf the route tree knows nothing about — a record's name it just fetched — with two
 * fields instead of five.
 *
 * It lives in its own module rather than inside `Breadcrumbs.svelte` because a type declared in a
 * component's instance script cannot be re-exported from the package's entry point, and a consumer
 * building a custom trail needs to name this.
 */
export interface Crumb {
  /** Keys the entry; `"/"` additionally marks the root, the only crumb that shows an icon. */
  routeId: string;
  /** The visible text. */
  label: string;
  /** Where a navigable, non-final crumb links. */
  pathname?: string;
  /** Whether this crumb links at all. A section with no page of its own is a heading. */
  navigable?: boolean;
  meta?: Pick<RouteMeta, "icon">;
}

type Assert<T extends true> = T;

/**
 * A compile-time pin, not a runtime one: the day `ResolvedRoute` stops fitting `Crumb`, handing
 * `routing.matched` straight to the component's prop would break, and this is the line that says
 * so first — at the definition, rather than at whichever call site noticed.
 */
type _ResolvedRouteIsACrumb = Assert<ResolvedRoute extends Crumb ? true : false>;
