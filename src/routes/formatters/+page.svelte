<script lang="ts">
  import { onMount } from "svelte";
  import { createFormatters, type Formatters } from "$lib/formatters.js";

  const LOCALES = ["en-US", "pt-BR", "de-DE"] as const;

  // One factory per column, built once. This is exactly how an app holds them: the locale is
  // decided at the top and never travels through a call.
  const COLUMNS = LOCALES.map((locale) => ({ locale, fmt: createFormatters(locale) }));

  interface Row {
    call: string;
    render: (fmt: Formatters) => string | null;
  }

  const INSTANT = new Date("2026-08-29T18:04:05Z");

  const DATE_ROWS: Row[] = [
    { call: 'date(new Date("2026-08-29T18:04:05Z"))', render: (fmt) => fmt.date(INSTANT) },
    { call: 'datetime(new Date("2026-08-29T18:04:05Z"))', render: (fmt) => fmt.datetime(INSTANT) },
    { call: 'date("2026-01-31")', render: (fmt) => fmt.date("2026-01-31") },
    { call: "date(0)", render: (fmt) => fmt.date(0) },
    { call: "date(null)", render: (fmt) => fmt.date(null) },
  ];

  const NUMBER_ROWS: Row[] = [
    { call: "number(1234567.891)", render: (fmt) => fmt.number(1234567.891) },
    { call: 'number("0.5")', render: (fmt) => fmt.number("0.5") },
    { call: "number(-42)", render: (fmt) => fmt.number(-42) },
    { call: "percent(0.12345)", render: (fmt) => fmt.percent(0.12345) },
    { call: "percent(1)", render: (fmt) => fmt.percent(1) },
    { call: "percent(null)", render: (fmt) => fmt.percent(null) },
  ];

  const CURRENCY_ROWS: Row[] = [
    { call: 'currency(1234.5, "BRL")', render: (fmt) => fmt.currency(1234.5, "BRL") },
    { call: 'currency(1234.5, "USD")', render: (fmt) => fmt.currency(1234.5, "USD") },
    { call: 'currency(1234.5, "EUR")', render: (fmt) => fmt.currency(1234.5, "EUR") },
    { call: 'currency(1234.5, "JPY")', render: (fmt) => fmt.currency(1234.5, "JPY") },
    {
      call: 'currency(1234.5, "BRL", "plain")',
      render: (fmt) => fmt.currency(1234.5, "BRL", "plain"),
    },
    {
      call: 'currency(1234.5, "JPY", "plain")',
      render: (fmt) => fmt.currency(1234.5, "JPY", "plain"),
    },
    {
      call: 'currency(1234.5, "BRL", "axis")',
      render: (fmt) => fmt.currency(1234.5, "BRL", "axis"),
    },
    {
      call: 'currency(1234.5, "USD", "axis")',
      render: (fmt) => fmt.currency(1234.5, "USD", "axis"),
    },
    { call: 'currency(-89.9, "USD")', render: (fmt) => fmt.currency(-89.9, "USD") },
  ];

  const SECOND = 1000;
  const MINUTE = 60 * SECOND;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;

  const OFFSETS: { call: string; ms: number }[] = [
    { call: "2 s ago", ms: -2 * SECOND },
    { call: "45 s ago", ms: -45 * SECOND },
    { call: "90 s ago", ms: -90 * SECOND },
    { call: "3 h ago", ms: -3 * HOUR },
    { call: "1 d ago", ms: -DAY },
    { call: "9 d ago", ms: -9 * DAY },
    { call: "45 d ago", ms: -45 * DAY },
    { call: "400 d ago", ms: -400 * DAY },
    { call: "now", ms: 0 },
    { call: "in 30 s", ms: 30 * SECOND },
    { call: "in 2 h", ms: 2 * HOUR },
    { call: "in 1 d", ms: DAY },
    { call: "in 3 w", ms: 21 * DAY },
  ];

  // Every cell on this page is `Intl` output, and ICU data differs between the Node that
  // prerenders the site and the browser that hydrates it -- a currency symbol, a narrow space
  // before AM/PM. Rendering only after mount keeps the server markup and the first client render
  // identical (both empty), so a data mismatch can never turn into a hydration mismatch.
  let now = $state<Date | null>(null);

  // It doubles as the clock the relative-time table is read against. Each row is an offset from
  // it rather than a fixed instant, so the phrasings stay the ones the offsets name however long
  // the tab is left open.
  onMount(() => {
    now = new Date();
  });
</script>

<main class="mx-auto flex w-full max-w-5xl flex-col gap-12 p-6 sm:p-10">
  <header class="flex flex-col gap-3">
    <h1 class="text-3xl font-semibold tracking-tight">Formatters</h1>
    <p class="max-w-3xl text-base-content/70">
      <code class="kbd kbd-sm">createFormatters(locale)</code> returns the six formatters an app
      keeps reaching for. None of them decides a locale or a currency on its own: the locale is
      fixed once, at the factory, and the currency code travels per call. The
      <code class="kbd kbd-sm">Intl</code> instances live in the factory closure, so formatting a thousand
      rows resolves locale data once.
    </p>
    <p class="max-w-3xl text-base-content/70">
      Same calls, three locales, side by side. Values are in whole units — an app that stores
      integer cents divides by 100 before it gets here.
    </p>
  </header>

  {#snippet table(caption: string, rows: Row[])}
    <section class="flex flex-col gap-4">
      <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
        {caption}
      </h2>
      <div class="overflow-x-auto rounded-box bg-base-200 p-1">
        <table class="table table-sm">
          <thead>
            <tr>
              <th class="font-normal">Call</th>
              {#each COLUMNS as column (column.locale)}
                <th class="font-mono font-normal">{column.locale}</th>
              {/each}
            </tr>
          </thead>
          <tbody>
            {#each rows as row (row.call)}
              <tr>
                <td class="font-mono text-xs whitespace-nowrap text-base-content/70">{row.call}</td>
                {#each COLUMNS as column (column.locale)}
                  <td class="font-mono whitespace-nowrap tabular-nums">
                    {#if now}
                      {@const value = row.render(column.fmt)}
                      {#if value === null}
                        <span class="text-base-content/40 italic">null</span>
                      {:else}
                        {value}
                      {/if}
                    {/if}
                  </td>
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </section>
  {/snippet}

  {@render table("Dates", DATE_ROWS)}
  {@render table("Numbers and percentages", NUMBER_ROWS)}
  {@render table("Currency", CURRENCY_ROWS)}

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
      Relative time
    </h2>
    <p class="max-w-3xl text-sm text-base-content/70">
      The largest unit that fits, truncated rather than rounded, so an event 90 seconds old reads as
      one minute and never as two. The phrasing is the locale's own —
      <code class="kbd kbd-sm">numeric: "auto"</code> spends "yesterday" and "last week" where the language
      has them.
    </p>
    <div class="overflow-x-auto rounded-box bg-base-200 p-1">
      <table class="table table-sm">
        <thead>
          <tr>
            <th class="font-normal">Offset</th>
            {#each COLUMNS as column (column.locale)}
              <th class="font-mono font-normal">{column.locale}</th>
            {/each}
          </tr>
        </thead>
        <tbody>
          {#each OFFSETS as offset (offset.call)}
            <tr>
              <td class="font-mono text-xs whitespace-nowrap text-base-content/70">{offset.call}</td
              >
              {#each COLUMNS as column (column.locale)}
                <td class="whitespace-nowrap">
                  {#if now}
                    {column.fmt.relativeTime(new Date(now.getTime() + offset.ms), now)}
                  {/if}
                </td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
      Missing values
    </h2>
    <p class="max-w-3xl text-sm text-base-content/70">
      A nullish value formats to <code class="kbd kbd-sm">null</code>, never to
      <code class="kbd kbd-sm">"0"</code> or an invented dash, and the two call signatures keep that
      out of the way: a value that cannot be null types as a
      <code class="kbd kbd-sm">string</code>, so only a nullable one needs
      <code class="kbd kbd-sm">?? "—"</code> at the call site. A real zero is a value and formats as one.
    </p>
  </section>
</main>
