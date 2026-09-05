<script lang="ts">
  import { untrack } from "svelte";
  import type { ClassValue } from "svelte/elements";
  import {
    anchorSelection,
    buildRange,
    createReAnchor,
    CUSTOM_PRESET_ID,
    DEFAULT_PRESETS,
    isoToLocalInput,
    isValidRange,
    localInputToIso,
    type DateRange,
    type DateRangePreset,
  } from "./date-range.js";

  interface Props {
    class?: ClassValue;
    /**
     * The selected window, as UTC ISO instants. Bindable, and also reported through
     * {@link Props.onchange} — a consumer needs one or the other, never both.
     *
     * It is an output, not an input: a relative preset overwrites it on every anchor. Passing one
     * in only seeds the picker, and only alongside `preset="custom"`.
     */
    value?: DateRange;
    /** The buttons offered. `id` may not be `"custom"`, which the picker reserves. */
    presets?: readonly DateRangePreset[];
    /**
     * Which button starts selected — a preset id, or `"custom"`. Defaults to the first preset, or
     * to custom when `value` was seeded without naming a preset.
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
    untrack(() => preset ?? (value ? CUSTOM_PRESET_ID : (presets[0]?.id ?? CUSTOM_PRESET_ID))),
  );

  // Wall-clock text for the two fields. Empty until custom mode is entered, because reading the
  // local zone is a client-only measurement -- seeding these at init would make a prerendered
  // page paint the build machine's offset and then correct itself on hydration.
  let customFrom = $state("");
  let customTo = $state("");

  const isCustom = $derived(selection === CUSTOM_PRESET_ID);

  const emit = (next: DateRange) => {
    if (value?.from === next.from && value?.to === next.to) return;

    value = next;
    onchange?.(next);
  };

  const anchor = () => {
    const next = anchorSelection(selection, presets, Date.now());
    if (next) emit(next);
  };

  const seedCustomFields = (range: DateRange | undefined) => {
    customFrom = isoToLocalInput(range?.from) ?? "";
    customTo = isoToLocalInput(range?.to) ?? "";
  };

  const enterCustom = () => {
    const current = value ?? (presets[0] ? buildRange(presets[0]) : undefined);

    seedCustomFields(current);
    selection = CUSTOM_PRESET_ID;

    // The fields only hold whole minutes, so the range they now show is not quite the one that
    // was emitted. Re-emitting the truncated pair is what keeps the value and the two fields the
    // user is about to edit from disagreeing by up to a minute.
    commitCustom();
  };

  const commitCustom = () => {
    const from = localInputToIso(customFrom);
    const to = localInputToIso(customTo);

    if (from === null || to === null || !isValidRange(from, to)) return;

    emit({ from, to });
  };

  const rangeError = $derived.by(() => {
    if (!isCustom) return null;

    const from = localInputToIso(customFrom);
    const to = localInputToIso(customTo);

    // A half-typed field is not yet wrong, so it says nothing rather than flashing an error at
    // someone who is still filling the form in.
    if (from === null || to === null) return null;

    return isValidRange(from, to) ? null : invalidRangeLabel;
  });

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
A from/to picker built as a plain form control: relative presets, a custom pair of local
date-times, and `{ from, to }` as UTC ISO strings on the way out. It fetches nothing, knows no
query parameter, and reads no URL — what the pair means is the consumer's business.

A relative preset re-anchors on a timer (`reAnchorMs`, 60s by default, `0` to disable), so a
dashboard left open keeps sliding forward. The timer suspends while the tab is hidden and fires
once on return. A custom range is never touched by it.

The two custom fields are `<input type="datetime-local">`, which means they are wall-clock time in
the viewer's own zone with no offset attached, while the emitted pair stays in UTC. The conversion
runs to whole minutes in both directions; see `isoToLocalInput` / `localInputToIso`.

Every word it renders is a prop with an English default — `label`, `customLabel`, `fromLabel`,
`toLabel` and `invalidRangeLabel` — because the library ships no translations. Only the wording
moves: the custom button keeps the reserved `"custom"` id whatever `customLabel` says. The preset
buttons are labelled by the list itself, through `DateRangePreset.label`.

```svelte
<DateRangePicker bind:value={range} preset="24h" onchange={(r) => load(r)} />
```
-->

<div class={["flex flex-wrap items-end gap-x-4 gap-y-3", cls]}>
  <div class="join" role="group" aria-label={label}>
    {#each presets as option (option.id)}
      <button
        type="button"
        class="btn join-item min-h-11"
        class:btn-primary={selection === option.id}
        aria-pressed={selection === option.id}
        onclick={() => (selection = option.id)}
      >
        {option.label}
      </button>
    {/each}

    <button
      type="button"
      class="btn join-item min-h-11"
      class:btn-primary={isCustom}
      aria-pressed={isCustom}
      onclick={enterCustom}
    >
      {customLabel}
    </button>
  </div>

  {#if isCustom}
    <div class="flex flex-wrap items-end gap-x-4 gap-y-3">
      <div class="flex flex-col gap-1">
        <label class="label text-xs" for={fromId}>{fromLabel}</label>
        <input
          id={fromId}
          class="input min-h-11"
          class:input-error={rangeError !== null}
          type="datetime-local"
          value={customFrom}
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
          type="datetime-local"
          value={customTo}
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
