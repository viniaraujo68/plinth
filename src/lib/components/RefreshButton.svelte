<script lang="ts">
  import { untrack } from "svelte";
  import type { ClassValue } from "svelte/elements";
  import { AsyncAction } from "../async-action.svelte.js";
  import { reportError } from "../error.js";

  interface IntervalOption {
    value: number;
    label: string;
  }

  interface Props {
    /** The reload itself. Awaited, so the spinner and the countdown follow the real request. */
    onRefresh: () => unknown | Promise<unknown>;
    /** Auto-refresh periods offered by the picker, in seconds. */
    intervals?: IntervalOption[];
    /** Period selected when auto-refresh is switched on. Defaults to the second option. */
    defaultInterval?: number;
    /**
     * When the data on screen last landed, as an epoch millisecond count. Left out, the control
     * times its own successful refreshes — which is wrong the moment the data also arrives from
     * somewhere else, such as a server-rendered first load.
     */
    lastSuccessAt?: number | null;
    /** Formatting locale for the timestamp. Defaults to the browser's. */
    locale?: string;
    class?: ClassValue;
  }

  const defaultIntervals: IntervalOption[] = [
    { value: 10, label: "10s" },
    { value: 30, label: "30s" },
    { value: 60, label: "1m" },
    { value: 300, label: "5m" },
  ];

  let {
    onRefresh,
    intervals = defaultIntervals,
    defaultInterval,
    lastSuccessAt,
    locale,
    class: cls,
  }: Props = $props();

  let auto = $state(false);
  // A seed, not a binding: once the user has picked a period, a re-render of the parent must not
  // yank it back to the default. `untrack` states that and keeps the compiler from warning.
  let periodSec = $state(
    untrack(() => defaultInterval ?? intervals[1]?.value ?? intervals[0]?.value ?? 30),
  );
  let ownLastSuccessAt = $state<number | null>(null);
  let nextRefreshAt = $state<number | null>(null);
  let now = $state(Date.now());
  let visible = $state(true);

  const action = new AsyncAction(async () => {
    await onRefresh();
    ownLastSuccessAt = Date.now();
  });

  const refresh = async () => {
    await action.run();
    if (action.isError) reportError(action.error);
  };

  const shownAt = $derived(lastSuccessAt === undefined ? ownLastSuccessAt : lastSuccessAt);

  // A hidden tab gets its timers throttled to once a minute or worse, so an unattended schedule
  // would drift and then fire a burst on focus. Suspending it outright is both honest and cheaper.
  $effect(() => {
    const track = () => {
      visible = document.visibilityState === "visible";
    };
    track();
    document.addEventListener("visibilitychange", track);
    return () => {
      document.removeEventListener("visibilitychange", track);
    };
  });

  // One second-resolution timer drives both the countdown and the firing, so what the user reads
  // is the schedule itself rather than a second clock that agrees with it only approximately.
  // The deadline is a plain local: writing it to state would make this effect depend on its own
  // output and re-run forever.
  $effect(() => {
    if (!auto || !visible) {
      nextRefreshAt = null;
      return;
    }

    const period = periodSec * 1000;
    let deadline = Date.now() + period;
    nextRefreshAt = deadline;
    now = Date.now();

    const id = setInterval(() => {
      now = Date.now();
      if (now < deadline) return;
      deadline = now + period;
      nextRefreshAt = deadline;
      void refresh();
    }, 1000);

    return () => {
      clearInterval(id);
      nextRefreshAt = null;
    };
  });

  const secondsLeft = $derived(
    nextRefreshAt === null ? null : Math.max(0, Math.ceil((nextRefreshAt - now) / 1000)),
  );

  const formatTime = (ms: number | null): string =>
    ms === null
      ? "--:--:--"
      : new Date(ms).toLocaleTimeString(locale, {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
</script>

<!--
@component
Freshness control: when the data last landed, a "refresh now" button, and an auto-refresh toggle
with a period picker.

It owns its schedule — this library ships no query layer to delegate one to — and suspends it
while the tab is hidden, resuming on the next visible second rather than firing a backlog. The
countdown replaces the timestamp while auto-refresh is armed, so the strip never changes width.

```svelte
<RefreshButton onRefresh={() => reload()} lastSuccessAt={loadedAt} />
```
-->

<div
  class={[
    "inline-flex h-8 items-center rounded-field border border-base-content/15 bg-base-100 pr-1 pl-2.5",
    cls,
  ]}
>
  <span class="flex items-center gap-1.5 text-base-content/55">
    <span
      class={[
        "size-1.5 rounded-full transition",
        secondsLeft === null
          ? "bg-base-content/30"
          : "animate-pulse bg-success ring-2 ring-success/25",
      ]}
    ></span>
    <span class="font-mono text-xs tabular-nums" data-testid="refresh-clock">
      {secondsLeft === null ? formatTime(shownAt) : `${secondsLeft}s`}
    </span>
  </span>

  <!-- Icons are inline SVG throughout the library: a component that renders an icon-font class
       would silently render nothing unless the consumer also installs that plugin in its own
       Tailwind chain. -->
  <button
    type="button"
    class="btn ml-1.5 btn-square btn-ghost btn-xs"
    title="Refresh now"
    aria-label="Refresh now"
    onclick={refresh}
  >
    <svg
      class={["size-3.5", action.isPending && "animate-spin"]}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  </button>

  <span class="mx-0.5 h-5 w-px bg-base-content/15"></span>

  <button
    type="button"
    class={["btn btn-square btn-ghost btn-xs", auto ? "text-primary" : "text-base-content/55"]}
    title={auto ? "Pause auto-refresh" : "Start auto-refresh"}
    aria-label={auto ? "Pause auto-refresh" : "Start auto-refresh"}
    aria-pressed={auto}
    onclick={() => {
      auto = !auto;
    }}
  >
    {#if auto}
      <svg class="size-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <rect x="6" y="4" width="4" height="16" rx="1" />
        <rect x="14" y="4" width="4" height="16" rx="1" />
      </svg>
    {:else}
      <svg class="size-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M7 4.5v15a1 1 0 0 0 1.53.85l11.5-7.5a1 1 0 0 0 0-1.7L8.53 3.65A1 1 0 0 0 7 4.5Z" />
      </svg>
    {/if}
  </button>

  {#if auto}
    <select
      class="select ml-0.5 w-18 select-ghost font-mono select-xs"
      aria-label="Auto-refresh interval"
      bind:value={periodSec}
    >
      {#each intervals as option (option.value)}
        <option value={option.value}>{option.label}</option>
      {/each}
    </select>
  {/if}
</div>
