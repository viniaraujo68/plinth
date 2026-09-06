<script lang="ts">
  import type { Snippet } from "svelte";
  import type { ClassValue, HTMLButtonAttributes } from "svelte/elements";
  import OptionPanel from "./OptionPanel.svelte";
  import { nextSelectableIndex, type SelectOption } from "./select.js";

  type Props = Omit<
    HTMLButtonAttributes,
    "children" | "class" | "disabled" | "name" | "onchange" | "value"
  > & {
    /** The rows, in the order they are shown. `value` is the key, so it has to be unique. */
    options: readonly SelectOption[];
    /** The selected `value`, or `null`. Bindable, and also reported through {@link Props.onchange}. */
    value?: string | null;
    /** Shown on the trigger while nothing is selected, and as the closed control's accessible text. */
    placeholder?: string;
    /** Whether the selection can be taken back to `null`, through a ✕ on the trigger. */
    clearable?: boolean;
    disabled?: boolean;
    /** Custom rendering for a row. The default is the label. */
    option?: Snippet<[SelectOption]>;
    /** Accessible name of the clear button. A prop because the library ships no translations. */
    clearLabel?: string;
    /** Classes for the control — width, margins. The trigger is where every other attribute goes. */
    class?: ClassValue;
    /**
     * Submits the selection with a surrounding `<form>`, through a hidden input.
     *
     * It buys form participation and nothing else: no constraint validation, no `required`, and
     * no reset. A form that needs those wants a real `<select>`.
     */
    name?: string;
    onchange?: (value: string | null) => void;
  };

  let {
    options,
    value = $bindable(null),
    placeholder = "Select…",
    clearable = false,
    disabled = false,
    option,
    clearLabel = "Clear selection",
    class: className,
    name,
    onchange,
    ...rest
  }: Props = $props();

  // `popovertarget` and `aria-activedescendant` both need document-unique ids, and `$props.id()`
  // is the only source of one that is stable across server render and hydration.
  const uid = $props.id();
  const panelId = `plinth-select-${uid}`;
  const listboxId = `${panelId}-listbox`;
  const anchorName = `--${panelId}`;
  const optionId = (index: number) => `${panelId}-option-${index}`;

  let isOpen = $state(false);
  let highlightedValue = $state<string | null>(null);
  let trigger = $state<HTMLButtonElement>();
  let panel = $state<OptionPanel>();

  // The listbox is named by the trigger, so whatever the consumer labelled the trigger with names
  // both. That needs the trigger's real id, which is the consumer's when they gave it one.
  const triggerId = $derived(rest.id ?? `${panelId}-trigger`);

  const selected = $derived(options.find((candidate) => candidate.value === value) ?? null);
  const showClear = $derived(clearable && !disabled && value !== null && value !== undefined);

  // The highlight is held as a value rather than an index so that an option list that changes
  // under it cannot silently move it onto a different row.
  const highlighted = $derived.by(() => {
    const index = options.findIndex((candidate) => candidate.value === highlightedValue);

    return index >= 0 && !options[index]?.disabled ? index : nextSelectableIndex(options, 0, 1);
  });

  const activeOptionId = $derived(isOpen && highlighted >= 0 ? optionId(highlighted) : undefined);

  const commit = (next: string | null) => {
    if (next === value) return;

    value = next;
    onchange?.(next);
  };

  const choose = (candidate: SelectOption) => {
    if (candidate.disabled) return;

    commit(candidate.value);
    trigger?.focus();
    panel?.hide();
  };

  const clear = () => {
    commit(null);
    trigger?.focus();
  };

  const move = (delta: number) => {
    const next = nextSelectableIndex(options, highlighted + delta, delta);
    if (next !== -1) highlightedValue = options[next]?.value ?? null;
  };

  const onKeydown = (event: KeyboardEvent) => {
    if (disabled) return;

    // Enter and Space on the closed trigger are the button's own activation, which `popovertarget`
    // already turns into an open. Only the arrows have to ask for it.
    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp":
        event.preventDefault();
        if (!isOpen) trigger?.click();
        else move(event.key === "ArrowDown" ? 1 : -1);
        break;

      case "Home":
      case "End": {
        if (!isOpen) return;
        event.preventDefault();

        const forwards = event.key === "Home";
        const edge = nextSelectableIndex(
          options,
          forwards ? 0 : options.length - 1,
          forwards ? 1 : -1,
        );
        if (edge !== -1) highlightedValue = options[edge]?.value ?? null;
        break;
      }

      case "Enter":
      case " ": {
        if (!isOpen) return;
        // Ahead of the button's own activation, which would otherwise toggle the panel back open
        // in the same keystroke that picked a row.
        event.preventDefault();

        const candidate = options[highlighted];
        if (candidate) choose(candidate);
        break;
      }

      case "Tab":
        // The panel holds no focusable content, so the default Tab already continues from the
        // trigger; all that is left is to take the list off the screen with it.
        if (isOpen) panel?.hide();
        break;
    }
  };

  const onOpenChange = (open: boolean) => {
    isOpen = open;
    if (open) highlightedValue = value;
  };
</script>

<!--
@component
A single-select listbox: a trigger showing the current selection, and a top-layer panel listing
the options. For a list long enough that scrolling it stops being reasonable, `Combobox` is the
one to reach for — it types into the control bar itself.

It is built on the native popover API, so re-clicking the trigger, clicking outside and pressing
Escape all dismiss it without a listener of our own, and the panel sits in the top layer — above a
`Modal`, and out of every overflow and stacking context on the page — with no z-index anywhere.

Clearing is a ✕ on the trigger rather than a blank row in the list, so an empty selection can
never be mistaken for a real option.

The trigger carries `role="combobox"` and every attribute passed in, which is where an
`aria-labelledby` pointing at the consumer's own `<label>` goes. Focus never leaves it: the rows
are pointed at by `aria-activedescendant` instead of being focused. `class` styles the control —
the width belongs to the wrapper, since the panel matches it.

```svelte
<span id="size-label">Size</span>
<Select
  bind:value={size}
  options={SIZES}
  aria-labelledby="size-label"
  placeholder="Any size"
  clearable
  class="max-w-xs"
/>
```
-->

<div class={["plinth-select relative flex", className]}>
  <button
    {...rest}
    bind:this={trigger}
    id={triggerId}
    type="button"
    class={[
      "select min-h-11 w-full justify-start text-start",
      showClear && "pe-16",
      // One class and not two: daisyUI dims the text of a disabled `<select>` through a rule that
      // only reaches a real `select` element, and two Tailwind opacities on the same property
      // would be settled by their order in the stylesheet rather than by the order written here.
      disabled ? "text-base-content/40" : !selected && "text-base-content/50",
    ]}
    role="combobox"
    {disabled}
    popovertarget={panelId}
    aria-haspopup="listbox"
    aria-expanded={isOpen}
    aria-controls={isOpen ? listboxId : undefined}
    aria-activedescendant={activeOptionId}
    style:anchor-name={anchorName}
    onkeydown={onKeydown}
  >
    <span class="truncate">{selected?.label ?? placeholder}</span>
  </button>

  {#if showClear}
    <!-- Outside the trigger, because `.select` clips its overflow and a button may not nest in a
         button. The end padding above is what keeps the label from running under it. -->
    <button
      type="button"
      class="btn absolute inset-y-0 end-7 my-auto btn-circle size-8 btn-ghost text-xs"
      aria-label={clearLabel}
      onclick={clear}
    >
      ✕
    </button>
  {/if}

  {#if name}
    <input type="hidden" {name} value={value ?? ""} />
  {/if}
</div>

<OptionPanel
  bind:this={panel}
  id={panelId}
  {anchorName}
  {listboxId}
  anchor={trigger}
  {options}
  {value}
  {highlighted}
  {optionId}
  {option}
  labelledBy={triggerId}
  class="plinth-select-panel"
  onopenchange={onOpenChange}
  onhighlight={(candidate) => (highlightedValue = candidate)}
  onchoose={choose}
/>
