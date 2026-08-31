<script lang="ts">
  import { resolve } from "$app/paths";
  import { LIBRARY_VERSION } from "$lib/index.js";

  const SECTIONS = [
    {
      href: resolve("/theme"),
      name: "Theme",
      summary:
        "The token layer: one palette declared through light-dark(), a preference that survives a reload, and a subtree that can re-theme itself.",
    },
    {
      href: resolve("/components"),
      name: "Components",
      summary:
        "Fifteen primitives, one page each — buttons that own a promise, dialogs, dropdowns, a picker, a table.",
    },
    {
      href: resolve("/patterns"),
      name: "Patterns",
      summary:
        "The parts that are not a component: routing metadata, the identity seam, the shell, the fetch wrapper, the formatters.",
    },
  ];

  // The published surface, in the order `package.json` declares it. Each row is an import
  // specifier a consumer types verbatim, which is why the table is the entry point map rather
  // than a directory listing of `src/lib`.
  const ENTRIES = [
    { path: "@viniaraujo68/plinth", summary: "AsyncAction, the error reporter, the version." },
    { path: "@viniaraujo68/plinth/theme", summary: "ThemeContext, ThemeController, ThemeToggle." },
    { path: "@viniaraujo68/plinth/theme.css", summary: "The stylesheet the tokens live in." },
    { path: "@viniaraujo68/plinth/attachments", summary: "The tooltip attachment, for any tag." },
    {
      path: "@viniaraujo68/plinth/components",
      summary: "The primitives and the date-range helpers.",
    },
    {
      path: "@viniaraujo68/plinth/confirm",
      summary: "The destructive-action confirm and its host.",
    },
    { path: "@viniaraujo68/plinth/shell", summary: "AppShell and Breadcrumbs." },
    {
      path: "@viniaraujo68/plinth/table",
      summary: "DataTable and the sorting functions behind it.",
    },
    { path: "@viniaraujo68/plinth/toast", summary: "The toast queue and its host." },
    { path: "@viniaraujo68/plinth/routing", summary: "RoutingConfig and RoutingContext." },
    {
      path: "@viniaraujo68/plinth/user",
      summary: "UserContext, ScopedComponent, the anonymous default.",
    },
    { path: "@viniaraujo68/plinth/http", summary: "createHttpClient and the typed ApiError." },
    { path: "@viniaraujo68/plinth/formatters", summary: "createFormatters, over Intl." },
  ];

  const INSTALL = "npm i github:viniaraujo68/plinth";
</script>

<main class="mx-auto flex w-full max-w-4xl flex-col gap-10 p-6 sm:p-10">
  <header class="flex flex-col gap-4">
    <div class="flex items-baseline gap-3">
      <h1 class="text-4xl font-semibold tracking-tight">plinth</h1>
      <span class="badge badge-sm badge-primary" data-testid="version">v{LIBRARY_VERSION}</span>
    </div>
    <p class="max-w-2xl text-lg text-base-content/70">
      A personal Svelte 5 design system, built on Tailwind 4 and daisyUI 5: a theme, an application
      shell, interface primitives and the patterns around them.
    </p>
    <p class="max-w-2xl text-base-content/60">
      It ships as one package with an entry point per area, so an app that only wants a formatter
      never pays for a shell. This site is the documentation — every page below renders the real
      component from the same source that is published.
    </p>
  </header>

  <section class="flex flex-col gap-3">
    <h2 class="text-sm font-medium tracking-wide text-base-content/50 uppercase">Install</h2>
    <pre
      class="overflow-x-auto rounded-box border border-base-content/10 bg-base-200 px-4 py-3 font-mono text-sm"><code
        >{INSTALL}</code
      ></pre>
    <p class="text-sm text-base-content/60">
      npm runs the package's <code class="kbd kbd-xs">prepare</code> script for a git dependency, so the
      build happens on install and nothing has to be committed. The README carries the rest of the setup:
      the consumer's stylesheet, the root layout and the one Vite build option the theme needs.
    </p>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-sm font-medium tracking-wide text-base-content/50 uppercase">Explore</h2>
    <ul class="grid gap-4 sm:grid-cols-3">
      {#each SECTIONS as section (section.href)}
        <li class="contents">
          <a
            href={section.href}
            data-testid="section-link"
            class="card gap-1.5 rounded-box border border-base-content/10 bg-base-100 p-4 transition-colors hover:border-base-content/25 hover:bg-base-200"
          >
            <span class="font-medium">{section.name}</span>
            <span class="text-sm text-base-content/60">{section.summary}</span>
          </a>
        </li>
      {/each}
    </ul>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-sm font-medium tracking-wide text-base-content/50 uppercase">Entry points</h2>
    <div class="overflow-x-auto rounded-box border border-base-content/10">
      <table class="table table-sm">
        <thead>
          <tr>
            <th scope="col">Import</th>
            <th scope="col">What it carries</th>
          </tr>
        </thead>
        <tbody>
          {#each ENTRIES as entry (entry.path)}
            <tr>
              <td class="font-mono text-xs whitespace-nowrap">{entry.path}</td>
              <td class="text-base-content/70">{entry.summary}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </section>
</main>
