<script lang="ts">
  import { resolve } from "$app/paths";

  // Same shape as the components index: each href is resolved from its own literal, so a demo
  // route that gets renamed or deleted breaks this list at build time rather than at runtime.
  const PATTERNS = [
    {
      href: resolve("/routing"),
      name: "routing",
      entry: "@viniaraujo68/plinth/routing",
      summary: "Route metadata declared once, read back as crumbs, navigation and role gates.",
    },
    {
      href: resolve("/user"),
      name: "user",
      entry: "@viniaraujo68/plinth/user",
      summary: "The identity seam: who the user is, which roles they hold, and nothing else.",
    },
    {
      href: resolve("/shell"),
      name: "shell",
      entry: "@viniaraujo68/plinth/shell",
      summary: "Sidebar, bottom bar and breadcrumbs, all fed by the routing declaration.",
    },
    {
      href: resolve("/http"),
      name: "http",
      entry: "@viniaraujo68/plinth/http",
      summary: "A fetch wrapper with a base URL, auth injection and one typed error.",
    },
    {
      href: resolve("/formatters"),
      name: "formatters",
      entry: "@viniaraujo68/plinth/formatters",
      summary: "Dates, money and numbers through Intl, with the locale decided once.",
    },
  ];
</script>

<main class="mx-auto flex w-full max-w-4xl flex-col gap-8 p-6 sm:p-10">
  <header class="flex flex-col gap-3">
    <h1 class="text-3xl font-semibold tracking-tight">Patterns</h1>
    <p class="max-w-2xl text-base-content/70">
      The parts of the library that are not a component. Each one is its own entry point, so an app
      that only wants a formatter never pays for a shell.
    </p>
  </header>

  <ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {#each PATTERNS as pattern (pattern.href)}
      <li class="contents">
        <a
          href={pattern.href}
          data-testid="pattern-link"
          class="card gap-1.5 rounded-box border border-base-content/10 bg-base-100 p-4 transition-colors hover:border-base-content/25 hover:bg-base-200"
        >
          <span class="font-mono text-sm font-medium">{pattern.name}</span>
          <span class="text-sm text-base-content/60">{pattern.summary}</span>
          <span class="mt-1 font-mono text-xs text-base-content/40">{pattern.entry}</span>
        </a>
      </li>
    {/each}
  </ul>
</main>
