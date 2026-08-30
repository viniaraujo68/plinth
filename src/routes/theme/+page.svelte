<script lang="ts">
  import { getThemeContext, ThemeToggle } from "$lib/theme/index.js";

  const theme = getThemeContext();

  const SURFACES = [
    { token: "base-100", classes: "bg-base-100 text-base-content", note: "page and panels" },
    { token: "base-200", classes: "bg-base-200 text-base-content", note: "recessed areas" },
    { token: "base-300", classes: "bg-base-300 text-base-content", note: "zebra, hover fills" },
    { token: "base-content", classes: "bg-base-content text-base-100", note: "ink" },
  ];

  const BRAND = [
    { token: "primary", classes: "bg-primary text-primary-content" },
    { token: "secondary", classes: "bg-secondary text-secondary-content" },
    { token: "accent", classes: "bg-accent text-accent-content" },
    { token: "neutral", classes: "bg-neutral text-neutral-content" },
  ];

  const SEMANTIC = [
    { token: "info", classes: "bg-info text-info-content" },
    { token: "success", classes: "bg-success text-success-content" },
    { token: "warning", classes: "bg-warning text-warning-content" },
    { token: "error", classes: "bg-error text-error-content" },
  ];

  const RADII = [
    { token: "radius-selector", classes: "rounded-selector", note: "checkbox, toggle, badge" },
    { token: "radius-field", classes: "rounded-field", note: "button, input, select" },
    { token: "radius-box", classes: "rounded-box", note: "card, modal, dropdown" },
  ];
</script>

{#snippet swatch(token: string, classes: string, note?: string)}
  <figure class="flex flex-col gap-1.5">
    <div
      class="flex h-16 items-center justify-center rounded-box border border-base-content/10 text-lg {classes}"
    >
      Aa
    </div>
    <figcaption class="flex flex-col">
      <code class="font-mono text-xs">--color-{token}</code>
      {#if note}<span class="text-xs text-base-content/50">{note}</span>{/if}
    </figcaption>
  </figure>
{/snippet}

<main class="mx-auto flex w-full max-w-4xl flex-col gap-12 p-6 sm:p-10">
  <header class="flex flex-col gap-3">
    <h1 class="text-3xl font-semibold tracking-tight">Theme</h1>
    <p class="max-w-2xl text-base-content/70">
      Every color is declared once with <code class="kbd kbd-sm">light-dark()</code>, so the
      inherited <code class="kbd kbd-sm">color-scheme</code> is the only switch in the system. The preference
      lives in a hidden daisyUI theme-controller checkbox, which means the first paint is already correct
      without running any JavaScript.
    </p>
  </header>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">Controller</h2>
    <div class="card flex-row flex-wrap items-center gap-4 rounded-box p-4">
      <ThemeToggle class="btn-md" />
      <div class="flex flex-col gap-1 text-sm">
        <span>
          Preference
          <span class="badge badge-soft badge-primary" data-testid="preference">
            {theme.preference}
          </span>
          resolves to
          <span class="badge badge-soft" data-testid="resolved"
            >{theme.dark ? "dark" : "light"}</span
          >
        </span>
        <span class="text-xs text-base-content/50">
          System defers to the OS and keeps tracking it; the other two pin the scheme.
        </span>
      </div>
    </div>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">Surfaces</h2>
    <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {#each SURFACES as entry (entry.token)}
        {@render swatch(entry.token, entry.classes, entry.note)}
      {/each}
    </div>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">Brand</h2>
    <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {#each BRAND as entry (entry.token)}
        {@render swatch(entry.token, entry.classes)}
      {/each}
    </div>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">Semantic</h2>
    <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {#each SEMANTIC as entry (entry.token)}
        {@render swatch(entry.token, entry.classes)}
      {/each}
    </div>
    <div class="flex flex-wrap gap-2">
      <span class="badge badge-soft badge-info">Info</span>
      <span class="badge badge-soft badge-success">Success</span>
      <span class="badge badge-soft badge-warning">Warning</span>
      <span class="badge badge-soft badge-error">Error</span>
      <span class="badge badge-soft">Neutral</span>
    </div>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">Radii</h2>
    <div class="grid grid-cols-3 gap-4">
      {#each RADII as entry (entry.token)}
        <figure class="flex flex-col gap-1.5">
          <div class="h-16 border border-base-content/15 bg-base-200 {entry.classes}"></div>
          <figcaption class="flex flex-col">
            <code class="font-mono text-xs">--{entry.token}</code>
            <span class="text-xs text-base-content/50">{entry.note}</span>
          </figcaption>
        </figure>
      {/each}
    </div>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">Type</h2>
    <div class="card flex flex-col gap-4 rounded-box p-4">
      <div class="flex flex-col gap-1">
        <code class="font-mono text-xs text-base-content/50">--font-sans · Geist</code>
        <p class="font-sans text-2xl">Sphinx of black quartz, judge my vow.</p>
      </div>
      <div class="flex flex-col gap-1">
        <code class="font-mono text-xs text-base-content/50">--font-mono · JetBrains Mono</code>
        <p class="font-mono text-2xl tabular-nums">0123456789 · const x = &lbrace;&rbrace;;</p>
      </div>
    </div>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
      Subtree theming
    </h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      <code class="kbd kbd-sm">light-dark()</code> resolves where a token is used, not where it is declared,
      so pinning a theme on any element re-themes everything beneath it — no duplicated palette, no second
      stylesheet.
    </p>
    <div class="grid gap-4 sm:grid-cols-2">
      <div
        data-theme="plinth-light"
        data-testid="subtree-light"
        class="card gap-2 rounded-box bg-base-100 p-4 text-base-content"
      >
        <code class="font-mono text-xs opacity-50">data-theme="plinth-light"</code>
        <button type="button" class="btn w-fit btn-primary btn-sm">Primary</button>
      </div>
      <div
        data-theme="plinth-dark"
        data-testid="subtree-dark"
        class="card gap-2 rounded-box bg-base-100 p-4 text-base-content"
      >
        <code class="font-mono text-xs opacity-50">data-theme="plinth-dark"</code>
        <button type="button" class="btn w-fit btn-primary btn-sm">Primary</button>
      </div>
    </div>
  </section>
</main>
