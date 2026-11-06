<script lang="ts" generics="O extends SelectOption = SelectOption">
  import type { Snippet } from "svelte";
  import type { ClassValue } from "svelte/elements";
  import Dropdown from "./Dropdown.svelte";
  import Listbox from "./Listbox.svelte";
  import type { SelectOption } from "./select.js";

  interface Props {
    /** The rows, in the order they are listed. `value` is the key, so it has to be unique. */
    options: readonly O[];
    /** The picked values, in the order they were picked. Bindable, and reported through `onchange`. */
    value?: string[];
    onchange?: (value: string[]) => void;
    /** Shown in the field while nothing is picked. */
    placeholder?: string;
    /** What the search reads for a row. Defaults to its label. */
    searchText?: (option: O) => string;
    searchPlaceholder?: string;
    /** Shown in place of the list when the search matches nothing. */
    emptyLabel?: string;
    /**
     * Shows a spinner, a placeholder chip for each pick whose option has not arrived yet, and
     * `loadingLabel` in an empty list.
     */
    loading?: boolean;
    loadingLabel?: string;
    disabled?: boolean;
    /** Blocks the surrounding form's submission while nothing is picked. */
    required?: boolean;
    /** Submits every picked value under this name with a surrounding `<form>`. */
    name?: string;
    /** The field's id, for a `<label for>`. */
    id?: string;
    "aria-label"?: string;
    "aria-labelledby"?: string;
    /** Accessible name of a chip's remove button. */
    removeLabel?: (label: string) => string;
    /** Renders a chip's content in place of its label. */
    chip?: Snippet<[O]>;
    /**
     * Renders a row in place of its label. The row is already a `role="option"` button, so the
     * snippet must not hold buttons, links or anything else interactive.
     */
    option?: Snippet<[O]>;
    /** Classes for the field — width, margins. */
    class?: ClassValue;
  }

  let {
    options,
    value = $bindable([]),
    onchange,
    placeholder = "Select…",
    searchText,
    searchPlaceholder,
    emptyLabel,
    loading = false,
    loadingLabel,
    disabled = false,
    required = false,
    name,
    id,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledby,
    removeLabel = (label) => `Remove ${label}`,
    chip,
    option,
    class: className,
  }: Props = $props();

  const uid = $props.id();
  const triggerId = $derived(id ?? `plinth-multiselect-${uid}`);
  const listboxId = `plinth-multiselect-${uid}-listbox`;

  let dropdown = $state<ReturnType<typeof Dropdown>>();
  let isOpen = $state(false);

  const picks = $derived([...new Set(value)]);
  const byValue = $derived(new Map(options.map((candidate) => [candidate.value, candidate])));
  const isLocked = (picked: string) => byValue.get(picked)?.disabled === true;

  const commit = (next: string[]) => {
    value = next;
    onchange?.(next);
  };

  const remove = (picked: string) => commit(picks.filter((other) => other !== picked));

  const toggle = (picked: O) => {
    if (picks.includes(picked.value)) remove(picked.value);
    else commit([...picks, picked.value]);
  };

  const focusField = () => document.getElementById(triggerId)?.focus({ preventScroll: true });

  const onkeydown = (event: KeyboardEvent) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      dropdown?.open();
    } else if (event.key === "Backspace" && !event.repeat) {
      const last = picks.findLast((picked) => !isLocked(picked));
      if (last === undefined) return;
      event.preventDefault();
      remove(last);
    }
  };
</script>

<!--
@component
Picks several options. The field shows the picks as removable chips, in the order they were made;
opening it lists every option under a search box, with the picked ones checked, and Enter or a
click checks or unchecks a row without closing the list. The search folds case and accents, and a
row matches when it contains every word typed.

A disabled option cannot be checked or unchecked: picked, it is locked, and its chip has no ✕. On
the field, the arrows open the list and Backspace removes the last pick that is not locked. The
chips' remove buttons are not Tab stops; from the keyboard, a pick is unchecked in the list.

It is a `Dropdown` with a `Listbox` inside, so the focus moves into the search box as the list
opens and comes back to the field as it closes. Shift+Tab from the search box reaches the field
with the list still open, and an arrow key sends the focus back in.

`required` blocks the surrounding form while nothing is picked, and `name` submits one entry per
pick.

```svelte
<MultiSelect options={people} bind:value={members} aria-label="Members">
  {#snippet chip(person)}{person.label}{/snippet}
</MultiSelect>
```
-->

<div
  class={[
    "plinth-multiselect select relative flex h-auto min-h-11 w-full flex-wrap items-center gap-1 py-1",
    picks.length > 0 && "ps-1.5",
    disabled && "cursor-not-allowed border-base-200 bg-base-200 text-base-content/40",
    className,
  ]}
  onfocusout={(event) => {
    const next = event.relatedTarget;
    if (next instanceof Node && !event.currentTarget.contains(next)) dropdown?.close();
  }}
>
  {#each picks as picked (picked)}
    {@const pickedOption = byValue.get(picked)}
    {@const label = pickedOption?.label ?? picked}
    {#if !pickedOption && loading}
      <span class="h-6.5 w-20 skeleton rounded-field"></span>
    {:else}
      <span
        class="pointer-events-none relative z-1 inline-flex max-w-full items-center gap-1 rounded-field border border-base-content/15 bg-base-200 py-0.5 ps-2 pe-1 text-sm"
      >
        <span class="min-w-0 truncate">
          {#if pickedOption && chip}{@render chip(pickedOption)}{:else}{label}{/if}
        </span>
        {#if !disabled && !isLocked(picked)}
          <button
            type="button"
            tabindex="-1"
            class="pointer-events-auto flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-full text-base-content/50 hover:bg-base-content/10 hover:text-base-content"
            aria-label={removeLabel(label)}
            onclick={() => {
              remove(picked);
              focusField();
            }}
          >
            <svg
              class="size-3"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              aria-hidden="true"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        {/if}
      </span>
    {/if}
  {:else}
    <span class="min-w-0 truncate text-base-content/50">{placeholder}</span>
  {/each}

  {#if loading}
    <span class="loading ms-auto loading-xs self-center loading-spinner"></span>
  {/if}

  <Dropdown
    bind:this={dropdown}
    bind:expanded={isOpen}
    id={triggerId}
    role="combobox"
    class="absolute inset-0 cursor-pointer rounded-field focus-visible:outline-none disabled:cursor-not-allowed"
    panelClass="rounded-box border border-base-content/10 bg-base-100 p-1 whitespace-normal text-base-content shadow-lg"
    matchWidth
    {disabled}
    aria-label={ariaLabel}
    aria-labelledby={ariaLabelledby}
    aria-haspopup="listbox"
    aria-controls={isOpen ? listboxId : undefined}
    {onkeydown}
  >
    <span class="sr-only">
      {picks.flatMap((picked) => byValue.get(picked)?.label ?? (loading ? [] : picked)).join(", ")}
    </span>

    {#snippet content()}
      <Listbox
        id={listboxId}
        {options}
        value={picks}
        onpick={toggle}
        searchable
        {searchText}
        {searchPlaceholder}
        {emptyLabel}
        {loading}
        {loadingLabel}
        autofocus
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledby}
        {option}
      />
    {/snippet}
  </Dropdown>

  {#if name}
    {#each picks as picked (picked)}
      <input type="hidden" {name} value={picked} {disabled} />
    {/each}
  {/if}

  {#if required}
    <input
      class="sr-only"
      tabindex="-1"
      aria-hidden="true"
      {disabled}
      {required}
      value={picks.join(",")}
      onfocus={focusField}
    />
  {/if}
</div>

<style>
  .plinth-multiselect:has(> :global([aria-expanded="true"])) {
    background-image:
      linear-gradient(135deg, #0000 50%, currentColor 50%),
      linear-gradient(45deg, currentColor 50%, #0000 50%);
  }
</style>
