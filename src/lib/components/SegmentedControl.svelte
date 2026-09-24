<script lang="ts" generics="Id extends string">
  import type { ClassValue } from "svelte/elements";
  import type { SegmentedOption } from "./segmented.js";

  interface Props {
    /** The choices, in the order they are shown. `id` is the value, so it has to be unique. */
    options: readonly SegmentedOption<Id>[];
    /** The chosen `id`. Bindable, and also reported through {@link Props.onchange}. */
    value: Id;
    /** Accessible name of the group. A prop because the library ships no translations. */
    label: string;
    /**
     * Visible text before the buttons — "Show:", "Goals and assists:". It is not the accessible
     * name; `label` is, so a caption can be as terse as it likes without a screen reader hearing
     * half a sentence.
     */
    caption?: string;
    /** `sm` is for a control inside a card header, where the default height would dominate. */
    size?: "sm" | "md";
    /** Classes for the wrapper — spacing, alignment. */
    class?: ClassValue;
    /** Called with the new `id` only when it actually changes; re-picking the current one is silent. */
    onchange?: (id: Id) => void;
  }

  let {
    options,
    value = $bindable(),
    label,
    caption,
    size = "md",
    class: className,
    onchange,
  }: Props = $props();

  const pick = (id: Id) => {
    if (id === value) return;
    value = id;
    onchange?.(id);
  };
</script>

<!--
@component
A row of mutually exclusive buttons: one of them is the current choice, and pressing another
moves the choice there. It is the control for a small, fixed set of views of the same thing —
"total, per match, per day" — where a `Select` would hide options that are cheaper to see.

Each button is a toggle button (`aria-pressed`) inside a labelled `group`, rather than a radio
group: a radio group moves the choice with the arrow keys as focus moves, which re-renders
whatever the control drives on every keystroke, where Tab and Enter let a keyboard user look at the
options before committing to one.

The colours come from two custom properties with library defaults, so an app with its own
contrast-tuned inks can hand them in without restyling the component:
`--segmented-ink` for the resting text, `--segmented-ink-selected` for the chosen one.

```svelte
<SegmentedControl
  bind:value={unit}
  label="Unit"
  caption="Goals:"
  options={[
    { id: "total", label: "Total" },
    { id: "match", label: "Per match" },
  ]}
/>
```
-->

<div class={["plinth-segmented", className]} data-size={size}>
  {#if caption}<span class="plinth-segmented-caption">{caption}</span>{/if}
  <div class="plinth-segmented-options" role="group" aria-label={label}>
    {#each options as option (option.id)}
      <button
        type="button"
        class="plinth-segment"
        class:plinth-segment-selected={option.id === value}
        aria-pressed={option.id === value}
        disabled={option.disabled}
        onclick={() => pick(option.id)}
      >
        {option.label}
      </button>
    {/each}
  </div>
</div>

<style>
  .plinth-segmented {
    --segmented-ink-default: color-mix(in oklch, var(--color-base-content) 70%, transparent);

    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.375rem 0.5rem;
  }

  .plinth-segmented-caption {
    font-size: 0.72rem;
    color: var(--segmented-ink, var(--segmented-ink-default));
  }

  .plinth-segmented-options {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3125rem;
  }

  .plinth-segment {
    min-height: 2rem;
    padding: 0.25rem 0.6875rem;
    border: 1px solid color-mix(in oklch, var(--color-base-content) 15%, transparent);
    /* The theme's field radius rather than a pill, like the table's sort pills: these are
       controls, and they should match the buttons and inputs they sit among. */
    border-radius: var(--radius-field, 0.5rem);
    background: var(--color-base-100);
    color: var(--segmented-ink, var(--segmented-ink-default));
    font-size: 0.78rem;
    cursor: pointer;
  }

  .plinth-segment:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .plinth-segment-selected {
    border-color: var(--color-primary);
    background: color-mix(in oklch, var(--color-primary) 14%, transparent);
    color: var(--segmented-ink-selected, var(--color-primary));
    font-weight: 600;
  }

  [data-size="sm"] .plinth-segment {
    min-height: 1.625rem;
    padding: 0.125rem 0.5rem;
    font-size: 0.7rem;
  }

  /* 40px on a phone: at the default height a segment is too small a target for a thumb. */
  @media (max-width: 35rem) {
    [data-size="md"] .plinth-segment {
      min-height: 2.5rem;
    }
  }
</style>
