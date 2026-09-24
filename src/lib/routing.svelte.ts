import { resolve } from "$app/paths";
import { DEV } from "esm-env";
import { createContext } from "svelte";

/**
 * Everything a dynamic title is allowed to depend on.
 *
 * Kept as an object rather than a positional argument so a later addition — the query string,
 * say — is not a breaking change for every title function an app already wrote.
 */
export interface TitleContext {
  /** Params of the current match, already decoded by SvelteKit. */
  params: Record<string, string>;
}

/**
 * What the app attaches to one SvelteKit route id.
 *
 * There is no `children` field and there never will be: the tree is the filesystem, and
 * SvelteKit has already matched it by the time this map is read. Re-declaring the hierarchy here
 * is exactly the duplication the pattern exists to remove.
 *
 * An entry without a `title` is plumbing — a segment that has to exist so its descendants can
 * resolve, but that no user should ever see. It still travels through `matched` and `children`
 * carrying its `requiredRoles`; renderers drop it by testing `meta.title`.
 */
export interface RouteMeta {
  title?: string | ((context: TitleContext) => string);
  /** Icon class for nav chrome. The library never parses it — it is handed straight to markup. */
  icon?: string;
  /** Flat role names. Whoever owns the user context decides what a role means. */
  requiredRoles?: string[];
}

/**
 * The config an app hands to {@link RoutingContext}.
 *
 * ```ts
 * import type { RouteId } from "$app/types";
 * import type { RoutingConfig } from "@viniaraujo68/plinth/routing";
 *
 * export const routes: RoutingConfig<RouteId> = {
 *   meta: { "/": { title: "Home" }, "/orders": { title: "Orders" } },
 *   pages: import.meta.glob("/src/routes/**\/+page.svelte"),
 * };
 * ```
 */
export interface RoutingConfig<Id extends string = string> {
  /**
   * Presentation and access data per route id.
   *
   * Key it with `RouteId` from `$app/types` and a renamed or deleted route becomes a compile
   * error instead of a silently missing crumb.
   *
   * Two structural facts are read back out of this object rather than declared twice: a route
   * id spells its own ancestry in its segments, and key insertion order — which the language
   * guarantees for non-numeric string keys — is sibling order. That is all `children` needs.
   */
  meta: Partial<Record<Id, RouteMeta>>;
  /**
   * The raw result of `import.meta.glob("/src/routes/**\/+page.svelte")`, whose keys say which
   * ids answer a direct visit.
   *
   * It has to be spelled out at the app's own source location: Vite rewrites the literal call
   * site at build time, so a library that tried to issue the glob on the app's behalf would
   * glob its own `dist` and find nothing. The values are never read — only the keys — which is
   * why the type is `unknown` and why a lazy glob costs nothing.
   */
  pages: Record<string, unknown>;
}

/**
 * One route id resolved through the meta map — the single shape every navigational consumer
 * reads, whether it came from `matched` or from `children`.
 */
export interface ResolvedRoute {
  /** The route id, still in bracket notation. */
  routeId: string;
  /** Resolved title, or `""` for a plumbing entry. */
  label: string;
  /** Concrete pathname, params substituted and group segments dropped. Carries no base path —
   * put it through {@link resolvePathname} to get an href. */
  pathname: string;
  /** Whether a real `+page.svelte` backs this id. An entry without it is a heading, not a link. */
  navigable: boolean;
  meta: RouteMeta;
}

/**
 * The reactive match {@link RoutingContext} projects.
 *
 * Structural on purpose. The library never imports `$app/state`, so it never assumes a
 * SvelteKit runtime: an app passes `page`, and a test passes any object with the same three
 * fields. That is the whole seam.
 */
export interface RoutingSource {
  readonly route: { readonly id: string | null };
  readonly params: Record<string, string>;
  readonly url: URL;
}

/**
 * Recover the route id SvelteKit would report for a glob key:
 * `/src/routes/orders/[id]/+page.svelte` becomes `/orders/[id]`, and `/src/routes/+page.svelte`
 * becomes `/`.
 *
 * Group segments survive the trip. `page.route.id` carries them — a route under `(app)` really
 * is `/(app)/orders` — so stripping them here would leave the two halves of the config
 * disagreeing about what a route id is. They are dropped later, when a pathname is built.
 */
const pageFileToRouteId = (file: string): string =>
  /\/routes(?<id>\/.*)?\/\+page\.svelte$/.exec(file)?.groups?.id ?? "/";

/** `"/"` yields no segments, `"/orders/[id]"` yields `["orders", "[id]"]`. */
const idSegments = (routeId: string): string[] => routeId.split("/").filter(Boolean);

const isGroup = (segment: string): boolean => segment.startsWith("(") && segment.endsWith(")");

const isParam = (segment: string): boolean => segment.startsWith("[") && segment.endsWith("]");

/**
 * The key a param segment uses in `params`, which is never the segment itself: SvelteKit spells
 * the same `id` as `[id]`, `[id=integer]`, `[...id]` or `[[id]]` depending on how the route
 * captures it.
 */
const paramName = (segment: string): string =>
  segment
    .replace(/^\[+/, "")
    .replace(/\]+$/, "")
    .replace(/^\.\.\./, "")
    .split("=")[0];

/** A segment SvelteKit is willing to match against nothing at all, hence one that may vanish. */
const isOptionalParam = (segment: string): boolean =>
  segment.startsWith("[[") || segment.startsWith("[...");

/**
 * Turn a route id into a pathname against the current params.
 *
 * A required param with no value leaves an empty segment behind rather than disappearing. The
 * resulting `//` is ugly, and that is the point — it only happens when a caller asks for the
 * pathname of a dynamic route nobody is currently on, which is a bug worth seeing.
 */
const routeIdToPathname = (routeId: string, params: Record<string, string>): string => {
  const segments: string[] = [];
  for (const segment of idSegments(routeId)) {
    if (isGroup(segment)) continue;
    if (!isParam(segment)) {
      segments.push(segment);
      continue;
    }
    const value = params[paramName(segment)] ?? "";
    if (value === "" && isOptionalParam(segment)) continue;
    segments.push(value);
  }
  return segments.length === 0 ? "/" : `/${segments.join("/")}`;
};

const resolveTitle = (meta: RouteMeta, params: Record<string, string>): string => {
  if (meta.title === undefined) return "";
  return typeof meta.title === "function" ? meta.title({ params }) : meta.title;
};

/**
 * Reactive view over SvelteKit's own match, projected through a flat metadata map.
 *
 * It resolves nothing by itself — no URL parsing, no pattern matching, no ranking. SvelteKit
 * already decided which route the user is on; this class only answers "what does the app want
 * displayed and gated for that decision, and for its ancestors".
 */
export class RoutingContext<Id extends string = string> {
  private readonly config: RoutingConfig<Id>;
  /** Every id with a real page, computed once — the filesystem cannot change while the tab is
   * open, so this is the one part of the class that has no reason to be reactive. */
  private readonly navigableIds: ReadonlySet<string>;

  /** The current URL, straight off the source. Nav chrome reads it for things the route id does
   * not carry, such as the query string or the host. */
  url: URL;
  /** The matched route id, or `null` when nothing matched — a 404, or the first paint of an
   * error page. */
  routeId: string | null;
  /** Decoded params of the current match. */
  params: Record<string, string>;
  /**
   * The declared prefixes of the current match, root first.
   *
   * Every ancestor that has a meta entry is here, plumbing included, so a gate declared halfway
   * up the tree stays reachable (`matched.findLast((r) => r.meta.requiredRoles)`). Prefixes with
   * no entry contribute nothing and are skipped rather than faked. Empty when `routeId` is null.
   */
  matched: ResolvedRoute[];

  constructor(config: RoutingConfig<Id>, source: RoutingSource) {
    this.config = config;
    // A plain Set: nothing ever writes to it, so a reactive one would buy a proxy and no
    // behaviour.
    // eslint-disable-next-line svelte/prefer-svelte-reactivity
    this.navigableIds = new Set(Object.keys(config.pages).map(pageFileToRouteId));

    this.url = $derived(source.url);
    this.routeId = $derived(source.route.id);
    this.params = $derived(source.params);
    this.matched = $derived.by(() => {
      const id = this.routeId;
      if (id === null) return [];

      const params = this.params;
      const segments = idSegments(id);
      const prefixes = ["/", ...segments.map((_, i) => `/${segments.slice(0, i + 1).join("/")}`)];

      const trail: ResolvedRoute[] = [];
      for (const prefix of prefixes) {
        const meta = this.metaFor(prefix);
        if (meta !== undefined) trail.push(this.resolve(prefix, meta, params));
      }
      return trail;
    });

    if (DEV) this.reportDrift();
  }

  /**
   * The direct declared children of a route id, in the order the meta map declares them.
   *
   * Plumbing children come back too — a caller may want to recurse past them or read their
   * gates — so a renderer that only wants visible entries filters on `meta.title`. Labels and
   * pathnames resolve against the current params, which only shows up when a child is itself a
   * capture and the user is standing on it.
   */
  children(routeId: string): ResolvedRoute[] {
    const prefix = routeId === "/" ? "/" : `${routeId}/`;
    const params = this.params;
    const found: ResolvedRoute[] = [];

    for (const [id, meta] of Object.entries<RouteMeta | undefined>(this.config.meta)) {
      if (meta === undefined || id === routeId) continue;
      if (!id.startsWith(prefix)) continue;
      // A remaining slash means a grandchild, which belongs to a deeper call.
      if (id.slice(prefix.length).includes("/")) continue;
      found.push(this.resolve(id, meta, params));
    }
    return found;
  }

  /**
   * The title of any declared route id, `""` when it is plumbing or unknown.
   *
   * A dynamic title is evaluated against the params of the *current* match, so asking about a
   * capture route the user is not on hands it empty strings. Reading the label off `matched` or
   * `children` is the normal path; this is for the odd one-off lookup.
   */
  label(routeId: Id): string {
    const meta = this.config.meta[routeId];
    return meta === undefined ? "" : resolveTitle(meta, this.params);
  }

  /** The single place a runtime string is narrowed to the app's route-id union. Every lookup in
   * this class goes through it so the cast exists once instead of at four call sites. */
  private metaFor(routeId: string): RouteMeta | undefined {
    return this.config.meta[routeId as Id];
  }

  private resolve(routeId: string, meta: RouteMeta, params: Record<string, string>): ResolvedRoute {
    return {
      routeId,
      label: resolveTitle(meta, params),
      pathname: routeIdToPathname(routeId, params),
      navigable: this.navigableIds.has(routeId),
      meta,
    };
  }

  /**
   * Warn once, in dev, about the two ways the map and the filesystem drift apart.
   *
   * Typed keys already catch the common case at compile time. What they cannot catch is a page
   * added without a meta entry, or a plumbing entry left behind after the last route under it
   * was deleted — neither is a type error, and both are invisible until a crumb or a nav item
   * quietly stops appearing.
   */
  private reportDrift(): void {
    const declared = Object.keys(this.config.meta);

    const undeclared = [...this.navigableIds].filter((id) => !declared.includes(id));
    if (undeclared.length > 0)
      console.warn(`[plinth/routing] pages with no meta entry: ${undeclared.sort().join(", ")}`);

    const orphaned = declared.filter((id) => {
      const prefix = id === "/" ? "/" : `${id}/`;
      return ![...this.navigableIds].some((page) => page === id || page.startsWith(prefix));
    });
    if (orphaned.length > 0)
      console.warn(
        `[plinth/routing] meta entries with no page beneath them: ${orphaned.sort().join(", ")}`,
      );
  }
}

/**
 * Turn a pathname computed at runtime into an href that respects the configured base path.
 *
 * `$app/paths`' `resolve` is typed as one overload per literal route in the app, so no value
 * produced at runtime can ever satisfy it. This is where that gets acknowledged, once, instead
 * of a cast at every nav item and crumb.
 */
export const resolvePathname = (pathname: string): string =>
  (resolve as unknown as (path: string) => string)(pathname);

export const [getRoutingContext, setRoutingContext] = createContext<RoutingContext>();

/**
 * A copy of `url` with some search parameters set and others removed — `null` or `undefined`
 * removes. It never edits the URL it was given, which is usually the page store's own and is read
 * by everything else on the page.
 */
export const withSearchParams = (
  url: URL,
  updates: Record<string, string | null | undefined>,
): URL => {
  // A value handed to `goto` or an `href`, never read reactively: a `SvelteURL` would only add
  // signals nobody subscribes to.
  // eslint-disable-next-line svelte/prefer-svelte-reactivity
  const next = new URL(url);
  for (const [key, value] of Object.entries(updates))
    if (value === null || value === undefined) next.searchParams.delete(key);
    else next.searchParams.set(key, value);

  return next;
};
