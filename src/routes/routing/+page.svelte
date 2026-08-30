<script lang="ts">
  import { page } from "$app/state";
  import {
    RoutingContext,
    type ResolvedRoute,
    type RoutingConfig,
    type RoutingSource,
  } from "$lib/routing.svelte.js";
  import DerivedNav from "./DerivedNav.svelte";
  import RoutingProvider from "./RoutingProvider.svelte";
  import { showcaseRoutes } from "./showcase-routes.js";

  // The real thing: SvelteKit's own `page` handed straight in. It already matched the URL, so
  // this instance never parses one.
  const routing = new RoutingContext(showcaseRoutes, page);

  type DemoId =
    | "/"
    | "/orders"
    | "/orders/[id]"
    | "/orders/[id]/lines"
    | "/orders/[id]/lines/[line]"
    | "/settings";

  const demoRoutes: RoutingConfig<DemoId> = {
    meta: {
      "/": { title: "Acme", icon: "icon-[lucide--home]" },
      "/orders": {
        title: "Orders",
        icon: "icon-[lucide--receipt]",
        requiredRoles: ["orders:read"],
      },
      "/orders/[id]": { title: ({ params }) => `Order #${params.id}` },
      "/orders/[id]/lines": { requiredRoles: ["orders:write"] },
      "/orders/[id]/lines/[line]": { title: ({ params }) => `Line ${params.line}` },
      "/settings": { title: "Settings", icon: "icon-[lucide--settings]" },
    },
    // A hand-written stand-in for `import.meta.glob`, so this fake tree is self-contained.
    // `/orders` and `/orders/[id]/lines` are missing on purpose: neither has a page of its own,
    // which is what makes them resolve as non-navigable.
    pages: {
      "/src/routes/+page.svelte": {},
      "/src/routes/orders/[id]/+page.svelte": {},
      "/src/routes/orders/[id]/lines/[line]/+page.svelte": {},
      "/src/routes/settings/+page.svelte": {},
    },
  };

  const DEMO_IDS: DemoId[] = [
    "/",
    "/orders",
    "/orders/[id]",
    "/orders/[id]/lines",
    "/orders/[id]/lines/[line]",
    "/settings",
  ];

  let demoRouteId = $state<DemoId>("/orders/[id]/lines/[line]");
  let orderId = $state("7841");
  let lineNumber = $state("3");

  // A hand-rolled stand-in for `page`. Nothing about `RoutingContext` knows the difference --
  // the source is structural, which is what makes it drivable from a form and from a test.
  const demoSource: RoutingSource = {
    get route() {
      return { id: demoRouteId };
    },
    get params() {
      return { id: orderId, line: lineNumber };
    },
    get url() {
      return new URL("https://acme.example/");
    },
  };

  const demoRouting = new RoutingContext(demoRoutes, demoSource);

  let childrenOf = $state<DemoId>("/");

  const gate = (route: ResolvedRoute) => route.meta.requiredRoles?.join(", ") ?? "—";
</script>

<main class="mx-auto flex w-full max-w-4xl flex-col gap-12 p-6 sm:p-10">
  <header class="flex flex-col gap-3">
    <h1 class="text-3xl font-semibold tracking-tight">Routing</h1>
    <p class="max-w-2xl text-base-content/70">
      A route tree that is declared exactly once — by the filesystem. SvelteKit already knows which
      route the URL matched; this layer adds the part SvelteKit has no opinion about (a title, an
      icon, a role gate) and hands it back as something breadcrumbs, navigation and layouts can
      read. It resolves no URLs, ranks no patterns and holds no tree of its own.
    </p>
  </header>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
      The declaration
    </h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      One file in the app. <code class="kbd kbd-sm">meta</code> attaches data to SvelteKit route
      ids, keyed by <code class="kbd kbd-sm">RouteId</code> from
      <code class="kbd kbd-sm">$app/types</code> so a renamed directory becomes a compile error rather
      than a crumb that quietly stops appearing.
    </p>
    <pre class="overflow-x-auto rounded-box bg-base-200 p-4 text-xs leading-relaxed"><code
        >{`export const routes: RoutingConfig<RouteId> = {
  meta: {
    "/": { title: "Acme", icon: "icon-[lucide--home]" },
    "/orders": { title: "Orders", requiredRoles: ["orders:read"] },
    "/orders/[id]": { title: ({ params }) => \`Order #\${params.id}\` },
    "/settings": { title: "Settings" },
  },
  pages: import.meta.glob("/src/routes/**/+page.svelte"),
};`}</code
      ></pre>
    <p class="max-w-2xl text-sm text-base-content/70">
      Two structural facts are read back out of that object instead of being written twice. A route
      id spells its own ancestry in its segments, so the breadcrumb trail is a prefix walk. And key
      insertion order is sibling order, so “the sidebar lists the first level, in the order I wrote
      them” needs no separate array.
    </p>
    <p class="max-w-2xl text-sm text-base-content/70">
      <code class="kbd kbd-sm">pages</code> is the raw
      <code class="kbd kbd-sm">import.meta.glob</code> result, and it has to be spelled out in the app.
      Vite rewrites the literal call site at build time, against the file it appears in — a library that
      issued the glob itself would scan its own package and find nothing. Only the keys are ever read;
      they say which ids answer a direct visit, which is how an entry ends up rendering as a heading instead
      of a link.
    </p>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
      Derived, live, from this page
    </h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      The context below was built from the showcase's own route map and SvelteKit's
      <code class="kbd kbd-sm">page</code>. The crumbs and the section buttons are two different
      reads of it —
      <code class="kbd kbd-sm">matched</code> and <code class="kbd kbd-sm">children("/")</code> — inside
      a component that was never told what the tree looks like. Navigate anywhere in this site and they
      follow.
    </p>
    <div
      class="flex flex-col gap-4 rounded-box border border-base-content/10 bg-base-200/40 p-4"
      data-testid="derived-nav"
    >
      <RoutingProvider {routing}>
        <DerivedNav />
      </RoutingProvider>
    </div>
    <p class="max-w-2xl text-sm text-base-content/70">
      The header at the top of this site still hand-declares its tabs; replacing it with a shell
      that derives them is the next piece of work.
    </p>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
      matched — the current trail
    </h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      Every declared prefix of the current match, root first. It is what a breadcrumb renders, and
      also what a layout reads to find the deepest role gate that applies.
    </p>
    <div class="overflow-x-auto">
      <table class="table table-sm" data-testid="matched-table">
        <thead>
          <tr><th>routeId</th><th>label</th><th>pathname</th><th>navigable</th></tr>
        </thead>
        <tbody>
          {#each routing.matched as route (route.routeId)}
            <tr>
              <td><code class="text-xs">{route.routeId}</code></td>
              <td>{route.label || "—"}</td>
              <td><code class="text-xs">{route.pathname}</code></td>
              <td>{route.navigable ? "yes" : "no"}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
      A tree you can drive
    </h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      The context takes its match from a plain object with three fields —
      <code class="kbd kbd-sm">route.id</code>, <code class="kbd kbd-sm">params</code> and
      <code class="kbd kbd-sm">url</code>. An app passes SvelteKit's
      <code class="kbd kbd-sm">page</code>; nothing stops a form from passing its own, which is what
      the controls below do. The same seam is what lets the whole thing be tested without a browser.
    </p>
    <div class="flex flex-wrap items-end gap-4">
      <label class="form-control">
        <span class="label-text text-xs text-base-content/50">route.id</span>
        <select class="select w-72 select-sm" bind:value={demoRouteId} data-testid="demo-route">
          {#each DEMO_IDS as id (id)}
            <option value={id}>{id}</option>
          {/each}
        </select>
      </label>
      <label class="form-control">
        <span class="label-text text-xs text-base-content/50">params.id</span>
        <input class="input w-28 input-sm" bind:value={orderId} data-testid="demo-id" />
      </label>
      <label class="form-control">
        <span class="label-text text-xs text-base-content/50">params.line</span>
        <input class="input w-28 input-sm" bind:value={lineNumber} data-testid="demo-line" />
      </label>
    </div>
    <div class="overflow-x-auto">
      <table class="table table-sm" data-testid="demo-matched">
        <thead>
          <tr>
            <th>routeId</th><th>label</th><th>pathname</th><th>navigable</th><th>requiredRoles</th>
          </tr>
        </thead>
        <tbody>
          {#each demoRouting.matched as route (route.routeId)}
            <tr>
              <td><code class="text-xs">{route.routeId}</code></td>
              <td>{route.label || "—"}</td>
              <td><code class="text-xs">{route.pathname}</code></td>
              <td>{route.navigable ? "yes" : "no"}</td>
              <td class="text-xs">{gate(route)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <ul class="max-w-2xl list-disc space-y-1 pl-5 text-sm text-base-content/70">
      <li>
        <code class="kbd kbd-sm">/orders/[id]/lines</code> carries a role but no title. It is
        plumbing: it exists so the line page can resolve a trail, and a renderer drops it by testing
        <code class="kbd kbd-sm">meta.title</code>
        — but its gate is still in
        <code class="kbd kbd-sm">matched</code>, which is the point of keeping it there.
      </li>
      <li>
        <code class="kbd kbd-sm">/orders</code> has no page of its own, so it resolves with
        <code class="kbd kbd-sm">navigable: false</code>. A crumb renders it as text; a sidebar
        renders it as a group heading.
      </li>
      <li>
        A dynamic title is a function of the current params, so editing
        <code class="kbd kbd-sm">params.id</code> above relabels the trail without any of this knowing
        that an order exists.
      </li>
    </ul>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
      children — the tree read back out
    </h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      Direct children of a route id, in declaration order. This is what a sidebar or a bottom bar
      lists, and it is why the tree never has to be written a second time in a nav component.
    </p>
    <label class="form-control w-72">
      <span class="label-text text-xs text-base-content/50">children(…)</span>
      <select class="select select-sm" bind:value={childrenOf} data-testid="children-of">
        {#each DEMO_IDS as id (id)}
          <option value={id}>{id}</option>
        {/each}
      </select>
    </label>
    <div class="overflow-x-auto">
      <table class="table table-sm" data-testid="demo-children">
        <thead>
          <tr><th>routeId</th><th>label</th><th>pathname</th><th>icon</th></tr>
        </thead>
        <tbody>
          {#each demoRouting.children(childrenOf) as route (route.routeId)}
            <tr>
              <td><code class="text-xs">{route.routeId}</code></td>
              <td>{route.label || "— (plumbing)"}</td>
              <td><code class="text-xs">{route.pathname}</code></td>
              <td class="text-xs">{route.meta.icon ?? "—"}</td>
            </tr>
          {:else}
            <tr><td colspan="4" class="text-base-content/50">no declared children</td></tr>
          {/each}
        </tbody>
      </table>
    </div>
    <p class="max-w-2xl text-sm text-base-content/70">
      The icon is carried, never interpreted — it is handed to markup verbatim, so a project can put
      an Iconify class, an emoji or an SVG name in there without the library caring. This showcase
      does not load an icon plugin, which is why the column shows the raw string.
    </p>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">Drift</h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      Typed keys catch a renamed route at compile time. They cannot catch the other two ways the map
      and the filesystem come apart, so the constructor checks for both once, in dev only, and
      writes to the console:
    </p>
    <pre class="overflow-x-auto rounded-box bg-base-200 p-4 text-xs leading-relaxed"><code
        >{`[plinth/routing] pages with no meta entry: /reports
[plinth/routing] meta entries with no page beneath them: /orders/archive`}</code
      ></pre>
    <p class="max-w-2xl text-sm text-base-content/70">
      The first is a page nobody declared — it works, but it has no title and no gate, so it will
      never show up in navigation. The second is a leftover entry whose routes were deleted. An
      entry with no page of its own but with pages underneath is not drift; that is just a section
      heading, and it is left alone.
    </p>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">Wiring</h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      An app builds the context once in its root layout and puts it in context; everything below
      reads it. Titles, gates and navigation all come off the same instance.
    </p>
    <pre class="overflow-x-auto rounded-box bg-base-200 p-4 text-xs leading-relaxed"><code
        >{`import { page } from "$app/state";
import { RoutingContext, setRoutingContext } from "@viniaraujo68/plinth/routing";
import { routes } from "$lib/routes";

setRoutingContext(new RoutingContext(routes, page));`}</code
      ></pre>
  </section>
</main>
