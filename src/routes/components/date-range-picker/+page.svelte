<script lang="ts">
  import DateRangePicker from "$lib/components/DateRangePicker.svelte";
  import { isoToLocalInput, type DateRange } from "$lib/components/date-range.js";

  // Short enough to watch. The component's own default is 60s, which is the right number for a
  // dashboard and the wrong one for a demo nobody would sit through.
  const DEMO_REANCHOR_MS = 5_000;

  let range = $state<DateRange>();
  let emitCount = $state(0);
  let lastEmitAt = $state<number>();

  // Nothing here is read before hydration: the page is prerendered, and both the local-zone
  // readings and the countdown would otherwise be painted with the build machine's clock.
  let now = $state<number>();

  $effect(() => {
    now = Date.now();
    const ticker = setInterval(() => (now = Date.now()), 250);

    return () => clearInterval(ticker);
  });

  const spanMinutes = $derived(
    range ? Math.round((Date.parse(range.to) - Date.parse(range.from)) / 60_000) : undefined,
  );

  const countdown = $derived.by(() => {
    if (lastEmitAt === undefined || now === undefined) return "—";

    const seconds = Math.max(0, Math.ceil((lastEmitAt + DEMO_REANCHOR_MS - now) / 1000));

    return seconds === 0 ? "due — or never, if the range is custom" : `in ${seconds}s`;
  });

  const record = (next: DateRange) => {
    range = next;
    emitCount += 1;
    lastEmitAt = Date.now();
  };

  let quietRange = $state<DateRange>({
    from: "2026-01-01T00:00:00.000Z",
    to: "2026-01-31T23:59:00.000Z",
  });

  const QUARTER_PRESETS = [
    { id: "15m", label: "15 min", durationMs: 900_000 },
    { id: "12h", label: "12 h", durationMs: 43_200_000 },
    { id: "90d", label: "90 d", durationMs: 7_776_000_000 },
  ];
</script>

<main class="mx-auto flex w-full max-w-4xl flex-col gap-12 p-6 sm:p-10">
  <header class="flex flex-col gap-3">
    <h1 class="text-3xl font-semibold tracking-tight">DateRangePicker</h1>
    <p class="max-w-2xl text-base-content/70">
      A form control and nothing more: relative presets, a custom pair of local date-times, and
      <code class="kbd kbd-sm">{"{ from, to }"}</code> as UTC ISO strings on the way out. It fetches nothing,
      serialises no query parameter and reads no URL — what the pair means is entirely the consumer's
      business.
    </p>
  </header>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
      Presets, custom, and the value it emits
    </h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      A relative preset is a duration measured back from now, so it re-anchors on a timer and the
      window keeps sliding forward. This demo re-anchors every {DEMO_REANCHOR_MS / 1000} seconds instead
      of the default 60, so the counter below moves while you read. Pick
      <strong>Custom</strong> and it stops for good: a window the user typed is theirs.
    </p>

    <div class="card flex flex-col gap-5 rounded-box bg-base-200 p-4" data-testid="live-demo">
      <DateRangePicker bind:value={range} reAnchorMs={DEMO_REANCHOR_MS} onchange={record} />

      <dl class="grid grid-cols-[auto_1fr] items-baseline gap-x-6 gap-y-2 text-sm">
        <dt class="text-base-content/60">from</dt>
        <dd class="font-mono tabular-nums" data-testid="emitted-from">{range?.from ?? "—"}</dd>

        <dt class="text-base-content/60">to</dt>
        <dd class="font-mono tabular-nums" data-testid="emitted-to">{range?.to ?? "—"}</dd>

        <dt class="text-base-content/60">span</dt>
        <dd class="tabular-nums" data-testid="emitted-span">
          {spanMinutes === undefined ? "—" : `${spanMinutes} min`}
        </dd>

        <dt class="text-base-content/60">your local zone</dt>
        <dd class="font-mono" data-testid="emitted-local">
          {isoToLocalInput(range?.from) ?? "—"} → {isoToLocalInput(range?.to) ?? "—"}
        </dd>

        <dt class="text-base-content/60">emits</dt>
        <dd class="tabular-nums" data-testid="emit-count">{emitCount}</dd>

        <dt class="text-base-content/60">last emit</dt>
        <dd class="font-mono tabular-nums" data-testid="last-emit">
          {lastEmitAt === undefined ? "—" : new Date(lastEmitAt).toLocaleTimeString()}
        </dd>

        <dt class="text-base-content/60">next anchor</dt>
        <dd class="tabular-nums" data-testid="countdown">{countdown}</dd>
      </dl>
    </div>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
      Local fields, UTC value
    </h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      The two custom fields are
      <code class="kbd kbd-sm">&lt;input type="datetime-local"&gt;</code>, which is wall-clock time
      in your own zone with no offset attached — the browser will not tell you which zone it meant,
      and appending a <code class="kbd kbd-sm">Z</code> to what it reports shifts the instant by
      your whole offset. The conversion runs explicitly in both directions:
      <code class="kbd kbd-sm">localInputToIso</code>
      reads the field as local time and returns UTC,
      <code class="kbd kbd-sm">isoToLocalInput</code> goes back. The field's default
      <code class="kbd kbd-sm">step</code> is 60, so the round trip is to whole minutes — switching to
      Custom re-emits the truncated pair rather than leaving the value a few seconds away from the fields
      showing it.
    </p>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
      A different list, seeded custom, no timer
    </h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      The preset list is a prop — replace it, do not fork the component. This one starts in custom
      mode from a seeded range, with <code class="kbd kbd-sm">{"reAnchorMs={0}"}</code> turning the timer
      off entirely. Reverse the two fields and the pair stops being emitted until they are in order again.
    </p>

    <div class="card flex flex-col gap-5 rounded-box bg-base-200 p-4" data-testid="quiet-demo">
      <DateRangePicker
        bind:value={quietRange}
        presets={QUARTER_PRESETS}
        preset="custom"
        reAnchorMs={0}
        label="Reporting window"
      />

      <dl class="grid grid-cols-[auto_1fr] items-baseline gap-x-6 gap-y-2 text-sm">
        <dt class="text-base-content/60">from</dt>
        <dd class="font-mono tabular-nums" data-testid="quiet-from">{quietRange.from}</dd>

        <dt class="text-base-content/60">to</dt>
        <dd class="font-mono tabular-nums" data-testid="quiet-to">{quietRange.to}</dd>
      </dl>
    </div>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">The rules</h2>
    <ul class="flex max-w-2xl list-disc flex-col gap-2 pl-5 text-sm text-base-content/70">
      <li>
        <strong>Out goes a pair, and only a pair.</strong> Two UTC ISO strings, through
        <code class="kbd kbd-sm">bind:value</code>
        or <code class="kbd kbd-sm">onchange</code>. Strings rather than
        <code class="kbd kbd-sm">Date</code>s because the value's job is to travel: it survives JSON
        both ways and sorts with a plain comparison.
      </li>
      <li>
        <strong>A relative preset owns the value.</strong> It overwrites it on every anchor, so a
        range passed in only seeds the picker, and only alongside
        <code class="kbd kbd-sm">preset="custom"</code>.
      </li>
      <li>
        <strong>The timer suspends with the tab.</strong> A hidden document stops the interval and coming
        back fires one anchor immediately, rather than the burst of catch-up ticks a plain interval would
        deliver.
      </li>
      <li>
        <strong><code class="kbd kbd-sm">"custom"</code> is reserved.</strong> A preset may not use it
        as an id; it is the selection value that means "the user typed both ends".
      </li>
    </ul>
  </section>
</main>
