<script lang="ts">
  import { resolve } from "$app/paths";

  // Each href is resolved from its own literal: `resolve` is typed on the route id, so a demo
  // route that gets renamed or deleted breaks this list at build time rather than at runtime.
  const DEMOS = [
    {
      href: resolve("/components/async-button"),
      name: "AsyncButton",
      summary: "A button that owns the promise its click returns, and its own failure.",
    },
    {
      href: resolve("/components/copyable"),
      name: "Copyable",
      summary: "Puts its own text on the clipboard and says so.",
    },
    {
      href: resolve("/table"),
      name: "DataTable",
      summary: "Columns described as data, sorted in the browser, cards on a narrow screen.",
    },
    {
      href: resolve("/components/date-range-picker"),
      name: "DateRangePicker",
      summary: "Relative presets or a custom pair, emitted as two UTC instants.",
    },
    {
      href: resolve("/components/dialog"),
      name: "Dialog",
      summary: "A native <dialog> that mounts its content only while it is on screen.",
    },
    {
      href: resolve("/components/dropdown"),
      name: "Dropdown",
      summary: "A trigger and a top-layer panel, anchored and dismissed by the browser.",
    },
    {
      href: resolve("/components/error-display"),
      name: "ErrorDisplay",
      summary: "The panel a boundary shows in place of the subtree that crashed.",
    },
    {
      href: resolve("/components/error-page"),
      name: "ErrorPage",
      summary: "A full-page status screen, with its own wording for a 404.",
    },
    {
      href: resolve("/components/loading-button"),
      name: "LoadingButton",
      summary: "A spinner and a blocked button, driven by a flag the caller owns.",
    },
    {
      href: resolve("/components/logo"),
      name: "Logo",
      summary: "The placeholder mark: an outline that sizes itself off the font size.",
    },
    {
      href: resolve("/components/modal"),
      name: "Modal",
      summary: "Title, scrollable body and footer over an inert background.",
    },
    {
      href: resolve("/components/paginator"),
      name: "Paginator",
      summary: "Page walking and a size picker, for counted and uncounted results alike.",
    },
    {
      href: resolve("/components/refresh-button"),
      name: "RefreshButton",
      summary: "Manual reload, an auto-refresh schedule and the age of what is on screen.",
    },
    {
      href: resolve("/components/toast"),
      name: "Toast",
      summary: "A queue any module can push to, rendered by one host near the app root.",
    },
    {
      href: resolve("/components/tooltip"),
      name: "Tooltip",
      summary: "A hover and focus panel on any tag, without a wrapper element.",
    },
  ];
</script>

<main class="mx-auto flex w-full max-w-4xl flex-col gap-8 p-6 sm:p-10">
  <header class="flex flex-col gap-3">
    <h1 class="text-3xl font-semibold tracking-tight">Components</h1>
    <p class="max-w-2xl text-base-content/70">
      The primitives, one page each. Everything here is imported from
      <code class="kbd kbd-sm">@viniaraujo68/plinth/components</code>, except the toast queue and
      the table, which are their own entries at
      <code class="kbd kbd-sm">@viniaraujo68/plinth/toast</code> and
      <code class="kbd kbd-sm">@viniaraujo68/plinth/table</code>.
    </p>
  </header>

  <ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {#each DEMOS as demo (demo.href)}
      <li class="contents">
        <a
          href={demo.href}
          data-testid="demo-link"
          class="card gap-1.5 rounded-box border border-base-content/10 bg-base-100 p-4 transition-colors hover:border-base-content/25 hover:bg-base-200"
        >
          <span class="font-mono text-sm font-medium">{demo.name}</span>
          <span class="text-sm text-base-content/60">{demo.summary}</span>
        </a>
      </li>
    {/each}
  </ul>
</main>
