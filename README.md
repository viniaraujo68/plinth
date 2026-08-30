# plinth

A personal Svelte 5 design system, built on Tailwind 4 and daisyUI 5: a theme, an application
shell, interface primitives and the patterns around them — routing metadata, an identity seam, a
fetch wrapper and locale-aware formatters.

One package, one entry point per area, so an app that only wants a formatter never pays for a
shell. The library lives in `src/lib` and is published with `svelte-package`; everything in
`src/routes` is the showcase, a static site that doubles as the documentation and is never
published.

**Showcase:** <https://viniaraujo68.github.io/plinth>

## Install

```sh
npm i github:viniaraujo68/plinth
```

npm runs the `prepare` script for a git dependency — and installs the dev dependencies needed to
do it — so `svelte-package` builds `dist` on the consumer's machine and nothing has to be
committed. Pin a ref when you want one: `github:viniaraujo68/plinth#v0.1.0`.

Once published to npm, the same package installs as `npm i @viniaraujo68/plinth`. Both give you
the same import specifiers, which are what every example below uses.

The package declares `svelte` and `@sveltejs/kit` as peer dependencies; Tailwind 4 and daisyUI 5
are the consumer's own, because the theme is a stylesheet the consumer imports rather than a
bundle the library emits.

## Setup

### 1. The stylesheet

The app owns its CSS chain. A SvelteKit app with its entry stylesheet at `src/routes/layout.css`:

```css
/* The theme first: it is plain unlayered CSS, so it outranks everything daisyUI emits into a
   cascade layer, and its `@import url(...)` for the fonts has to reach the top of the bundle. */
@import "@viniaraujo68/plinth/theme.css";

/* Tailwind only scans this project's own files. The library's classes live in a package it never
   looks at, so point it at the shipped `dist` — the path is relative to THIS file. */
@source "../../node_modules/@viniaraujo68/plinth/dist";

@import "tailwindcss";

@plugin "daisyui" {
  exclude: rootscrollgutter;
}
```

Then import it once, from the root layout: `import "./layout.css";`.

If the library is linked rather than installed (`npm link`, a workspace, a `file:` dependency),
`@source` has to point at wherever the real `dist` ended up — a symlinked path is not scanned
through.

### 2. The Vite build target

**This one is not optional.** Every color in the theme is declared once through `light-dark()`,
and that is what makes `[data-theme]` on any element re-theme its subtree. Lightning CSS — which
Vite runs to minify CSS — rewrites `light-dark()` into a pair of inherited guard variables
whenever the configured target browsers predate it. The rewrite is not equivalent: the guards
resolve once at `:root`, and a nested `[data-theme]` stops working, silently, in the production
build only.

Name targets that support `light-dark()` natively:

```ts
// vite.config.ts
export default defineConfig({
  build: { cssTarget: ["chrome123", "edge123", "firefox120", "safari17.5"] },
  plugins: [tailwindcss(), sveltekit()],
});
```

### 3. The route declaration

The route tree is the filesystem; this file only attaches presentation and access data to route
ids SvelteKit already knows. Nothing here re-states the hierarchy.

```ts
// src/lib/routes.ts
import type { RouteId } from "$app/types";
import type { RoutingConfig } from "@viniaraujo68/plinth/routing";

export const routes: RoutingConfig<RouteId> = {
  meta: {
    "/": { title: "Home", icon: "icon-[lucide--home]" },
    "/orders": { title: "Orders", icon: "icon-[lucide--receipt]" },
    "/orders/[id]": { title: ({ params }) => `Order ${params.id}` },
    "/admin": { title: "Admin", icon: "icon-[lucide--shield]", requiredRoles: ["admin"] },
  },

  // The glob has to be written here, in the app, and never inside the library: Vite rewrites the
  // literal call at build time against the file it appears in, so a library issuing it on the
  // app's behalf would scan its own package and come back empty-handed. Only the keys are read.
  pages: import.meta.glob("/src/routes/**/+page.svelte"),
};
```

Keying `meta` with `RouteId` from `$app/types` is what makes a renamed or deleted route a compile
error instead of a crumb that quietly stops appearing. `icon` is an uninterpreted string handed
straight to markup as `<span class={meta.icon}>` — an icon font or an Iconify utility class fits
without configuration; anything else goes through `AppShell`'s `icon` snippet.

### 4. The root layout

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import "./layout.css";
  import { browser } from "$app/environment";
  import { page } from "$app/state";
  import type { Snippet } from "svelte";
  import { RoutingContext, setRoutingContext } from "@viniaraujo68/plinth/routing";
  import { AppShell } from "@viniaraujo68/plinth/shell";
  import {
    readThemePreference,
    setThemeContext,
    ThemeContext,
    ThemeController,
    ThemeToggle,
  } from "@viniaraujo68/plinth/theme";
  import { Toaster } from "@viniaraujo68/plinth/toast";
  import { setUserContext } from "@viniaraujo68/plinth/user";
  import { routes } from "$lib/routes.js";

  const { children }: { children: Snippet } = $props();

  // Contexts are installed while this component initialises, so every route below inherits them.
  setThemeContext(new ThemeContext(browser ? readThemePreference() : "system"));
  // SvelteKit already matched the URL; the routing context only projects that match through the
  // meta map, so `page` is handed in as-is.
  setRoutingContext(new RoutingContext(routes, page));
  setUserContext({
    status: "authenticated",
    data: { name: "Ada Lovelace", email: "ada@example.com" },
    hasRole: (role) => role === "admin",
    hasAnyRole: (roles) => roles.length === 0 || roles.includes("admin"),
    hasAllRoles: (roles) => roles.every((role) => role === "admin"),
  });
</script>

<ThemeController />

<div class="h-dvh">
  <AppShell>
    {#snippet brand({ collapsed })}
      <span class="font-semibold tracking-tight">{collapsed ? "A" : "Acme"}</span>
    {/snippet}
    {#snippet footer()}
      <ThemeToggle iconOnly />
    {/snippet}
    {@render children()}
  </AppShell>
</div>

<!-- Outside the routed subtree: a toast fired just before a navigation has to outlive the page
     that fired it. -->
<Toaster />
```

`ThemeController` is a hidden checkbox that must be mounted exactly once, unconditionally — it is
what CSS keys the theme on, and every other picker in the app just writes `preference` on the
theme context. `AppShell` fills its parent, so give it one with a height.

`setUserContext` is optional: without it the library falls back to an anonymous context whose role
checks all answer `true`, so a route tree annotated with `requiredRoles` still renders while there
is no authentication to evaluate it against. Any object matching the `UserContext` interface will
do — reactive if the answers can change, which a class with `$state` fields gives you.

### 5. A page

```svelte
<!-- src/routes/orders/+page.svelte -->
<script lang="ts">
  import { Breadcrumbs } from "@viniaraujo68/plinth/shell";
  import { DataTable } from "@viniaraujo68/plinth/table";
  import type { Column } from "@viniaraujo68/plinth/table";
  import { createFormatters } from "@viniaraujo68/plinth/formatters";
  import { createHttpClient, errorMessage } from "@viniaraujo68/plinth/http";
  import { toast } from "@viniaraujo68/plinth/toast";

  interface Order {
    id: string;
    customer: string;
    total: number;
    placedAt: string;
  }

  const format = createFormatters("en-US");
  const api = createHttpClient({ baseUrl: "/api", credentials: "include" });

  // `key` alone reads the field, renders it and sorts by it. A formatted cell says what it shows
  // with `value` and what it orders by with `sortBy`, so money sorts as a number and a date as a
  // date rather than as the string on screen.
  const columns: Column<Order>[] = [
    { key: "id", label: "Order" },
    { key: "customer", label: "Customer" },
    {
      key: "total",
      label: "Total",
      value: (row) => format.currency(row.total, "USD"),
      sortBy: (row) => row.total,
      numeric: true,
    },
    {
      key: "placedAt",
      label: "Placed",
      value: (row) => format.date(row.placedAt),
      sortBy: (row) => row.placedAt,
    },
  ];

  let rows = $state<Order[]>([]);

  $effect(() => {
    api
      .get<Order[]>("/orders")
      .then((loaded) => (rows = loaded))
      .catch((error: unknown) => toast.error(errorMessage(error)));
  });
</script>

<div class="flex flex-col gap-4 p-6">
  <Breadcrumbs />
  <DataTable {columns} {rows} rowKey={(row) => row.id} />
</div>
```

`Breadcrumbs` derives the trail from the routing context; it is never handed a list. `DataTable`
sorts in the browser and turns into cards on a narrow screen. `createFormatters` decides the
locale once, and `createHttpClient` takes the three things that actually differ between apps — the
base URL, how auth is injected, and how the backend spells an error body.

## Entry points

| Import                             | What it carries                                                      |
| ---------------------------------- | -------------------------------------------------------------------- |
| `@viniaraujo68/plinth`             | `AsyncAction`, the error reporter, `LIBRARY_VERSION`                 |
| `@viniaraujo68/plinth/theme`       | `ThemeContext`, `ThemeController`, `ThemeToggle`, the cookie helpers |
| `@viniaraujo68/plinth/theme.css`   | The stylesheet the tokens are declared in                            |
| `@viniaraujo68/plinth/attachments` | The `tooltip` attachment, usable on any tag                          |
| `@viniaraujo68/plinth/components`  | The primitives, and the `DateRange` helpers                          |
| `@viniaraujo68/plinth/shell`       | `AppShell`, `Breadcrumbs`                                            |
| `@viniaraujo68/plinth/table`       | `DataTable` and the sorting functions behind it                      |
| `@viniaraujo68/plinth/toast`       | The toast queue and its host                                         |
| `@viniaraujo68/plinth/routing`     | `RoutingConfig`, `RoutingContext`, `resolvePathname`                 |
| `@viniaraujo68/plinth/user`        | `UserContext`, `ScopedComponent`, the anonymous default              |
| `@viniaraujo68/plinth/http`        | `createHttpClient`, `ApiError`, `errorMessage`, `errorStatus`        |
| `@viniaraujo68/plinth/formatters`  | `createFormatters`, over `Intl`                                      |

The components entry point ships `AsyncButton`, `Copyable`, `DateRangePicker`, `Dialog`,
`Dropdown`, `ErrorDisplay`, `ErrorPage`, `LoadingButton`, `Logo`, `Modal`, `Paginator`,
`RefreshButton`, `Skeleton` and `Tooltip`. Every one of them has a page in the showcase.
It also exports the mark's outline as data — `PICK_PATH` and `PICK_CLIP_PATH` — for anything
that wants the pick as a silhouette of its own.

## Development

```sh
npm install
npm run dev        # showcase at localhost:5173
npm run check      # svelte-check
npm run lint       # prettier --check and eslint
npm run test:unit  # vitest: a browser project and a node project
npm run test       # the above, plus the playwright end-to-end run
npm run build      # showcase build, then svelte-package and publint
```

`npm run test:unit` needs a Chromium build: `npx playwright install chromium`.

`BASE_PATH=/plinth npm run build` reproduces what the Pages deploy does. Leave it unset anywhere
else — dev, preview and the end-to-end run all serve from the root.

Two workflows run on GitHub: every push to `main` deploys the showcase to Pages, and a `v*` tag
gates on check, lint and unit tests before `npm publish`.

## License

MIT
