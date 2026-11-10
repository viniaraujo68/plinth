<script lang="ts">
  import { createI18n, LocaleToggle } from "$lib/i18n/index.js";

  // An app builds this once, at module level, in a file of its own; it is built here only so the
  // page is self-contained. `storageKey: null` keeps the demo from remembering a pick.
  const i18n = createI18n({
    dictionaries: {
      pt: {
        "demo.greeting": "Olá, {name}!",
        "demo.matchdays": { one: "{count} dia de pelada", other: "{count} dias de pelada" },
        "demo.onlyHere": "Esta frase só existe em português.",
      },
      en: {
        "demo.greeting": "Hello, {name}!",
        "demo.matchdays": { one: "{count} matchday", other: "{count} matchdays" },
      },
    },
    tags: { pt: "pt-BR", en: "en-US" },
    fallback: "pt",
    unmatched: "en",
    storageKey: null,
  });

  const { t } = i18n;

  let count = $state(1);
  const today = new Date(2026, 10, 10);
</script>

<main class="mx-auto flex w-full max-w-4xl flex-col gap-12 p-6 sm:p-10">
  <header class="flex flex-col gap-3">
    <h1 class="text-3xl font-semibold tracking-tight">i18n</h1>
    <p class="max-w-2xl text-base-content/70">
      The app's own strings in more than one language. <code class="kbd kbd-sm">createI18n</code>
      takes a flat dictionary per locale and returns the current locale as state, a
      <code class="kbd kbd-sm">t()</code> that reads it, and the tag
      <code class="kbd kbd-sm">Intl</code>
      wants. The library still ships no translations of its own: its components take every word through
      props, and those props are where the app's <code class="kbd kbd-sm">t()</code> calls go.
    </p>
  </header>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">Switching</h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      <code class="kbd kbd-sm">LocaleToggle</code> is a
      <code class="kbd kbd-sm">SegmentedControl</code>
      over the locales on offer. Every <code class="kbd kbd-sm">t()</code> on the page re-renders
      when it switches, and so does <code class="kbd kbd-sm">&lt;html lang&gt;</code>. The first
      visit starts on the browser's language, matched by language when the region differs; a later
      one, on the reader's last pick.
    </p>
    <div class="flex flex-col gap-4 rounded-box border border-base-content/10 p-6">
      <LocaleToggle {i18n} label="Language" />
      <p class="text-lg font-semibold" data-testid="greeting">
        {t("demo.greeting", { name: "Ada" })}
      </p>
      <p class="text-sm text-base-content/70" data-testid="date">
        {today.toLocaleDateString(i18n.tag, { dateStyle: "full" })}
      </p>
    </div>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
      Plurals and fallback
    </h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      A value can be a <code class="kbd kbd-sm">one</code>/<code class="kbd kbd-sm">other</code>
      pair, picked by the <code class="kbd kbd-sm">count</code> parameter — zero takes
      <code class="kbd kbd-sm">other</code>, so it reads "0 dias", not the "0 dia" CLDR would give
      Portuguese. A key the current dictionary lacks is read from the fallback one rather than shown
      as its own name.
    </p>
    <div class="flex flex-col gap-4 rounded-box border border-base-content/10 p-6">
      <label class="flex items-center gap-3 text-sm">
        <span class="text-base-content/60">count</span>
        <input
          type="number"
          min="0"
          class="input w-24 input-sm"
          bind:value={count}
          data-testid="count"
        />
      </label>
      <p data-testid="plural">{t("demo.matchdays", { count })}</p>
      <p class="text-sm text-base-content/70" data-testid="fallback">{t("demo.onlyHere")}</p>
    </div>
  </section>
</main>
