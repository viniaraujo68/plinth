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
bundle the library emits. The `svelte` floor is `^5.57.0`, and it is a real floor rather than a
precaution: the user context is built on the `[get, set, has]` form of `createContext`, which
5.56 does not have — there `has` is `undefined` and the first component that reads the context
throws.

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

An app that cannot render the controller in the right state on the server — a prerendered site, a
client-only app — usually stamps `data-theme="plinth-light"` or `data-theme="plinth-dark"` on
`<html>` from a head script, so the very first paint is already right. That stamp is a **seed for
the first paint and nothing else.** The stylesheet gives it up the moment a checked controller is
under it, and `ThemeController` drops it outright when it mounts, so from hydration onwards the
preference is the only thing painting the page — including the "system" preference, which checks
nothing and would otherwise keep losing to a stale stamp forever. Do not read the root
`data-theme` back as the current theme: read `preference` on the theme context, or `dark` for the
resolved one. A `data-theme` on any element **below** the root is a different thing entirely and
is left alone — that is subtree theming, and it keeps working whatever the page theme is.

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
| `@viniaraujo68/plinth/components`  | The primitives, the `DateRange` and option-matching helpers          |
| `@viniaraujo68/plinth/confirm`     | `confirm`, `Confirmer`, the challenge helpers                        |
| `@viniaraujo68/plinth/shell`       | `AppShell`, `Breadcrumbs`                                            |
| `@viniaraujo68/plinth/table`       | `DataTable` and the sorting functions behind it                      |
| `@viniaraujo68/plinth/toast`       | The toast queue and its host                                         |
| `@viniaraujo68/plinth/routing`     | `RoutingConfig`, `RoutingContext`, `resolvePathname`                 |
| `@viniaraujo68/plinth/user`        | `UserContext`, `ScopedComponent`, the anonymous default              |
| `@viniaraujo68/plinth/http`        | `createHttpClient`, `ApiError`, `errorMessage`, `errorStatus`        |
| `@viniaraujo68/plinth/formatters`  | `createFormatters`, over `Intl`                                      |

The components entry point ships `AsyncButton`, `Combobox`, `Copyable`, `DateRangePicker`,
`Dialog`, `Dropdown`, `ErrorDisplay`, `ErrorPage`, `LoadingButton`, `Logo`, `Modal`, `Paginator`,
`RefreshButton`, `Select`, `Skeleton` and `Tooltip`. Every one of them has a page in the showcase.
It also exports the mark's outline as data — `PICK_PATH` and `PICK_CLIP_PATH` — for anything
that wants the pick as a silhouette of its own.

Two of those pick one thing from a list, and which one to reach for is decided by the length of
the list rather than by a flag:

- **`Select`** — a trigger and a panel of rows, for a list short enough to read at a glance. There
  is nothing to type into; the arrows walk it and the trigger keeps the focus.
- **`Combobox`** — the control bar IS the search field, for a list nobody is going to scroll.
  Clicking it selects the text that is there so the next keystroke replaces it, the query filters
  past accents and anywhere in the label, and anything that closes the list without a pick puts
  the selected label back.

Their panels — and `Dropdown`'s, and the one the `tooltip` attachment puts up — are placed with CSS
anchor positioning, and place themselves from script in a browser that does not have it yet
(Firefox, and Safari before iOS/macOS 26), so a panel is never left floating at the top of the
screen instead of under its control.

`Confirmer` is a component too, and it has its own showcase page, but it ships from
`@viniaraujo68/plinth/confirm` rather than from the components entry point: like `Toaster` it is
half of a pair, and the other half is a function any module calls with nothing plumbed through.

```svelte
<script lang="ts">
  import { confirm } from "@viniaraujo68/plinth/confirm";

  const remove = async (night: Night) => {
    if (!(await confirm({ title: `Delete ${night.name}?`, danger: true }))) return;
    await api.delete(`/nights/${night.id}`);
  };
</script>
```

`await confirm(...)` is the whole call site, and it replaces the browser's own `confirm()` one line
for one line. `<Confirmer />` goes next to `<Toaster />` in the root layout and renders the queue
over `Modal`, so modality, the focus trap, Escape and returning focus to the opener stay the
browser's. Cancel, Escape, the close button, a click on the backdrop and the host unmounting all
resolve `false`; only the confirm action resolves `true`. Focus opens on cancel — never on the
destructive button — so a stray Enter cannot delete anything.

A second call while one is open queues behind it rather than replacing it or rejecting: replacing
would answer a question nobody was shown, and rejecting would throw at a call site written to read
a boolean. `challenge` is the stronger gate — the confirm action stays disabled until that exact
string has been typed, ends trimmed and nothing else folded — and focus opens in that input, where
Enter confirms only once it matches. The library ships no translations, so `confirmLabel`,
`cancelLabel`, `closeLabel` and `challengeLabel` on the host translate every confirm at once, and
any call overrides them through its own options.

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
