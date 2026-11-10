<script lang="ts">
  import { untrack } from "svelte";
  import type { ClassValue } from "svelte/elements";
  import SegmentedControl from "./SegmentedControl.svelte";
  import {
    anchorSelection,
    buildRange,
    createReAnchor,
    CUSTOM_PRESET_ID,
    DEFAULT_PRESETS,
    isoToLocalInput,
    isValidDayRange,
    isValidRange,
    localInputToIso,
    parseDay,
    selectionFor,
    type DateRange,
    type DateRangeMode,
    type DateRangePreset,
  } from "./date-range.js";

  interface Props {
    class?: ClassValue;
    /**
     * `"datetime"` (the default) picks a window of instants, emitted as UTC ISO strings, with
     * date-and-time fields. `"date"` picks a span of calendar days, emitted as `YYYY-MM-DD`, with
     * date fields either of which may stay empty to leave that side open.
     */
    mode?: DateRangeMode;
    /**
     * The selected window — UTC ISO instants, or days in `"date"` mode. Bindable, and also reported
     * through {@link Props.onchange} — a consumer needs one or the other, never both.
     *
     * It is an output, not an input: a relative preset overwrites it on every anchor. Passing one
     * in only seeds the picker: it opens on the preset that names that window right now, or on
     * custom with the pair in the fields.
     */
    value?: DateRange;
    /** The buttons offered. `id` may not be `"custom"`, which the picker reserves. */
    presets?: readonly DateRangePreset[];
    /**
     * Which button starts selected — a preset id, or `"custom"`. Defaults to the preset matching a
     * seeded `value`, to custom when none does, and to the first preset when there is no `value`.
     */
    preset?: string;
    /**
     * How often a relative range slides forward, in milliseconds. `0` turns re-anchoring off.
     *
     * A dashboard left open overnight should still be showing the last 24 hours in the morning,
     * which is the whole reason this is on by default.
     */
    reAnchorMs?: number;
    /** Names the preset group for assistive technology. */
    label?: string;
    /**
     * Label of the button that switches to the typed pair. The id behind it stays
     * {@link CUSTOM_PRESET_ID} whatever this says, so `preset="custom"` keeps working.
     */
    customLabel?: string;
    /** Label of the start field. */
    fromLabel?: string;
    /** Label of the end field. */
    toLabel?: string;
    /** Shown, as an alert, while the typed pair is out of order. */
    invalidRangeLabel?: string;
    onchange?: (value: DateRange) => void;
  }

  let {
    class: cls,
    mode = "datetime",
    value = $bindable(),
    presets = DEFAULT_PRESETS,
    preset,
    reAnchorMs = 60_000,
    label = "Date range",
    customLabel = "Custom",
    fromLabel = "From",
    toLabel = "To",
    invalidRangeLabel = "The start must not be after the end.",
    onchange,
  }: Props = $props();

  const uid = $props.id();
  const fromId = `plinth-range-from-${uid}`;
  const toId = `plinth-range-to-${uid}`;
  const errorId = `plinth-range-error-${uid}`;

  // The selection is the picker's own state rather than a bound prop: the pair is the entire
  // output, and a second bound value would be a second thing for a consumer to keep in step.
  let selection = $state(
    untrack(
      () =>
        preset ??
        (value
          ? selectionFor(value, presets, Date.now(), mode)
          : (presets[0]?.id ?? CUSTOM_PRESET_ID)),
    ),
  );

  // Wall-clock text for the two fields. Empty until custom mode is entered, because reading the
  // local zone is a client-only measurement -- seeding these at init would make a prerendered
  // page paint the build machine's offset and then correct itself on hydration.
  let customFrom = $state("");
  let customTo = $state("");

  const isCustom = $derived(selection === CUSTOM_PRESET_ID);
  const days = $derived(mode === "date");

  const options = $derived([
    ...presets.map(({ id, label }) => ({ id, label })),
    { id: CUSTOM_PRESET_ID, label: customLabel },
  ]);

  const emit = (next: DateRange) => {
    if (value?.from === next.from && value?.to === next.to) return;

    value = next;
    onchange?.(next);
  };

  const anchor = () => {
    const next = anchorSelection(selection, presets, Date.now(), mode);
    if (next) emit(next);
  };

  const seedCustomFields = (range: DateRange | undefined) => {
    const toField = days ? parseDay : isoToLocalInput;
    customFrom = toField(range?.from) ?? "";
    customTo = toField(range?.to) ?? "";
  };

  /**
   * The typed pair, read back: `undefined` while either field is not yet a value — half typed —
   * and otherwise the pair with whether it is in order. In `"date"` mode an empty field is a value,
   * an open end, where in `"datetime"` mode it is not yet one.
   */
  const typedPair = (): { range: DateRange; ordered: boolean } | undefined => {
    if (days) {
      const from = parseDay(customFrom);
      const to = parseDay(customTo);
      if (from === null || to === null) return undefined;
      return { range: { from, to }, ordered: isValidDayRange(from, to) };
    }

    const from = localInputToIso(customFrom);
    const to = localInputToIso(customTo);
    if (from === null || to === null) return undefined;
    return { range: { from, to }, ordered: isValidRange(from, to) };
  };

  const enterCustom = () => {
    const current = value ?? (presets[0] ? buildRange(presets[0], Date.now(), mode) : undefined);

    seedCustomFields(current);
    selection = CUSTOM_PRESET_ID;

    // The fields only hold whole minutes, so the range they now show is not quite the one that
    // was emitted. Re-emitting the truncated pair is what keeps the value and the two fields the
    // user is about to edit from disagreeing by up to a minute.
    commitCustom();
  };

  const commitCustom = () => {
    const pair = typedPair();
    if (pair?.ordered) emit(pair.range);
  };

  const rangeError = $derived.by(() => {
    if (!isCustom) return null;

    // A half-typed field is not yet wrong, so it says nothing rather than flashing an error at
    // someone who is still filling the form in.
    const pair = typedPair();
    if (pair === undefined) return null;

    return pair.ordered ? null : invalidRangeLabel;
  });

  const pick = (id: string) => {
    if (id === CUSTOM_PRESET_ID) enterCustom();
    else selection = id;
  };

  $effect(() => {
    const intervalMs = reAnchorMs;
    if (selection === CUSTOM_PRESET_ID) return;

    // `presets` is read inside the anchor, untracked: a consumer who passes an array literal
    // hands over a new identity on every render, and tracking it would turn each emit into
    // another render into another anchor.
    untrack(anchor);
    if (intervalMs <= 0) return;

    const clock = createReAnchor({ intervalMs, onAnchor: () => untrack(anchor) });
    const onVisibilityChange = () => clock.setHidden(document.hidden);

    clock.setHidden(document.hidden);
    clock.start();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      clock.stop();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  });

  $effect(() => {
    if (selection !== CUSTOM_PRESET_ID) return;

    // Covers the one path into custom mode that is not a click: a picker mounted with
    // `preset="custom"`. Seeding without emitting, because a value the consumer supplied is
    // theirs to keep -- the click path is the one that re-emits.
    untrack(() => {
      if (!customFrom && !customTo) seedCustomFields(value);
    });
  });
</script>

<!--
@component
A from/to picker built as a plain form control: presets, a custom pair the reader types, and
`{ from, to }` on the way out. It fetches nothing, knows no query parameter, and reads no URL — what
the pair means is the consumer's business.

It works in one of two modes. `"datetime"`, the default, is a window of instants: the custom
fields are `<input type="datetime-local">`, wall-clock time in the viewer's own zone, while the
emitted pair stays in UTC — the conversion runs to whole minutes in both directions; see
`isoToLocalInput` / `localInputToIso`. `"date"` is a span of calendar days: the fields are
`<input type="date">`, the pair is `YYYY-MM-DD`, and an empty end leaves that side open.

A preset is a duration back from now ("24h") or a window computed from the calendar ("this month",
built with `thisMonth`, `lastMonth`, `lastMonths` and `allTime`). Either re-anchors on a timer
(`reAnchorMs`, 60s by default, `0` to disable), so a dashboard left open keeps sliding forward and
"this month" turns into the next one. The timer suspends while the tab is hidden and fires once on
return. A custom range is never touched by it.

Every word it renders is a prop with an English default — `label`, `customLabel`, `fromLabel`,
`toLabel` and `invalidRangeLabel` — because the library ships no translations. Only the wording
moves: the custom button keeps the reserved `"custom"` id whatever `customLabel` says. The preset
buttons are labelled by the list itself, through `DateRangePreset.label`.

```svelte
<DateRangePicker bind:value={range} preset="24h" onchange={(r) => load(r)} />

<DateRangePicker
  mode="date"
  presets={[allTime("All time"), thisMonth("This month"), lastMonth("Last month")]}
  onchange={(r) => load(r)}
/>
```
-->

<div class={["flex flex-wrap items-end gap-x-4 gap-y-3", cls]}>
  <!-- A segmented control rather than a joined row: a calendar picker easily offers six windows,
       and a joined row cannot wrap onto a second line at phone width. -->
  <SegmentedControl {options} value={selection} {label} onchange={pick} />

  {#if isCustom}
    <div class="flex flex-wrap items-end gap-x-4 gap-y-3">
      <div class="flex flex-col gap-1">
        <label class="label text-xs" for={fromId}>{fromLabel}</label>
        <input
          id={fromId}
          class="input min-h-11"
          class:input-error={rangeError !== null}
          type={days ? "date" : "datetime-local"}
          value={customFrom}
          max={days && customTo ? customTo : undefined}
          aria-invalid={rangeError !== null}
          aria-describedby={rangeError === null ? undefined : errorId}
          oninput={({ currentTarget }) => {
            customFrom = currentTarget.value;
            commitCustom();
          }}
        />
      </div>

      <div class="flex flex-col gap-1">
        <label class="label text-xs" for={toId}>{toLabel}</label>
        <input
          id={toId}
          class="input min-h-11"
          class:input-error={rangeError !== null}
          type={days ? "date" : "datetime-local"}
          value={customTo}
          min={days && customFrom ? customFrom : undefined}
          aria-invalid={rangeError !== null}
          aria-describedby={rangeError === null ? undefined : errorId}
          oninput={({ currentTarget }) => {
            customTo = currentTarget.value;
            commitCustom();
          }}
        />
      </div>
    </div>
  {/if}

  {#if rangeError !== null}
    <p id={errorId} class="basis-full text-sm text-error" role="alert">{rangeError}</p>
  {/if}
</div>
