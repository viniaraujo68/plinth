<script lang="ts">
  import { flushSync, type Snippet } from "svelte";
  import type { ClassValue, HTMLButtonAttributes } from "svelte/elements";
  import { matchesSelectQuery, SELECT_SEARCH_THRESHOLD, type SelectOption } from "./select.js";

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
    /**
     * Whether the panel carries a search field. Left unset it decides for itself, on the option
     * count against {@link SELECT_SEARCH_THRESHOLD} — a three-option select is faster to point at
     * than to type at, and a fifty-option one is unusable without typing.
     */
    searchable?: boolean;
    searchPlaceholder?: string;
    /** Whether the selection can be taken back to `null`, through a ✕ on the trigger. */
    clearable?: boolean;
    disabled?: boolean;
    /**
     * Matching for the search field. The default is a substring of the label, case- AND
     * accent-insensitive, so `otavio` finds `Otávio`.
     *
     * Only consulted for a non-blank query: an empty field always shows every option, which is one
     * less case a custom matcher has to handle.
     */
    filter?: (option: SelectOption, query: string) => boolean;
    /** Custom rendering for a row. The default is the label. */
    option?: Snippet<[SelectOption]>;
    /** Shown in place of the list when the query matches nothing. */
    emptyLabel?: string;
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
    searchable,
    searchPlaceholder = "Search",
    clearable = false,
    disabled = false,
    filter = matchesSelectQuery,
    option,
    emptyLabel = "No matches",
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
  let isMounted = $state(false);
  let query = $state("");
  let highlightedValue = $state<string | null>(null);
  let trigger = $state<HTMLButtonElement>();
  let panel = $state<HTMLDivElement>();
  let searchInput = $state<HTMLInputElement>();
  let focusWasInsidePanel = false;

  // The listbox is named by the trigger, so whatever the consumer labelled the trigger with names
  // both. That needs the trigger's real id, which is the consumer's when they gave it one.
  const triggerId = $derived(rest.id ?? `${panelId}-trigger`);

  const selected = $derived(options.find((candidate) => candidate.value === value) ?? null);
  const showSearch = $derived(searchable ?? options.length >= SELECT_SEARCH_THRESHOLD);
  const showClear = $derived(clearable && !disabled && value !== null && value !== undefined);

  const visible = $derived(
    query.trim() === "" ? options : options.filter((candidate) => filter(candidate, query)),
  );

  /** The first selectable row from `from`, walking in `delta`'s direction; `-1` when there is none. */
  const seek = (from: number, delta: number) => {
    for (let index = from; index >= 0 && index < visible.length; index += delta) {
      const candidate = visible[index];
      if (candidate && !candidate.disabled) return index;
    }

    return -1;
  };

  // The highlight is held as a value rather than an index so that filtering cannot silently move
  // it onto a different option: a row that stops matching takes the highlight back to the top of
  // what is left, which is what someone still typing expects, and no effect has to watch the query
  // to make it happen.
  const highlighted = $derived.by(() => {
    const index = visible.findIndex((candidate) => candidate.value === highlightedValue);

    return index >= 0 && !visible[index]?.disabled ? index : seek(0, 1);
  });

  const activeOptionId = $derived(isOpen && highlighted >= 0 ? optionId(highlighted) : undefined);

  // The highlight is an attribute on the trigger, not a focus ring the browser scrolls to on its
  // own, so keeping it on screen is ours to do. `nearest` is what makes it a nudge of the list
  // rather than a jump of the page.
  $effect(() => {
    const id = activeOptionId;
    if (id === undefined) return;

    document.getElementById(id)?.scrollIntoView({ block: "nearest", inline: "nearest" });
  });

  const commit = (next: string | null) => {
    if (next === value) return;

    value = next;
    onchange?.(next);
  };

  const hide = () => panel?.hidePopover();

  const choose = (candidate: SelectOption) => {
    if (candidate.disabled) return;

    commit(candidate.value);
    // Ahead of the hide, so the panel is never the thing focus is taken from -- see `onToggle`.
    trigger?.focus();
    hide();
  };

  const clear = () => {
    commit(null);
    trigger?.focus();
  };

  const move = (delta: number) => {
    const next = seek(highlighted + delta, delta);
    if (next !== -1) highlightedValue = visible[next]?.value ?? null;
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
        const edge = seek(forwards ? 0 : visible.length - 1, forwards ? 1 : -1);
        if (edge !== -1) highlightedValue = visible[edge]?.value ?? null;
        break;
      }

      case "Enter":
      case " ": {
        // Space types a space into the search field; it only selects when the trigger itself is
        // the one being typed at, which is the searchless list.
        if (!isOpen || (event.key === " " && event.currentTarget !== trigger)) return;
        event.preventDefault();

        const candidate = visible[highlighted];
        if (candidate) choose(candidate);
        break;
      }

      case "Tab":
        // Moving focus out first is what makes the default Tab continue from the trigger rather
        // than from a field that is about to stop being rendered.
        if (isOpen) {
          trigger?.focus();
          hide();
        }
        break;
    }
  };

  /* A hidden popover stops rendering entirely, which freezes any exit transition mid-flight and
     means its `transitionend` never arrives. Asking the element whether it is actually visible is
     the only reading that holds for both an animated and an instant close. */
  const unmountWhenHidden = () => {
    if (panel && !panel.checkVisibility({ opacityProperty: true, visibilityProperty: true }))
      isMounted = false;
  };

  const onBeforeToggle = (event: ToggleEvent) => {
    if (event.newState === "open") {
      isMounted = true;
      query = "";
      highlightedValue = value;
      return;
    }

    // `beforetoggle` is synchronous, so this is the last moment the panel still holds whatever it
    // was holding. `toggle` arrives a task later, by which time a click that light-dismissed the
    // panel has already moved focus somewhere of its own.
    focusWasInsidePanel = panel?.contains(document.activeElement) ?? false;
  };

  const onToggle = (event: ToggleEvent) => {
    isOpen = event.newState === "open";

    if (isOpen) {
      isMounted = true;
      // The `toggle` event that normally mounts the content is asynchronous, so a keyboard open --
      // which never fires the pointerdown that pre-mounts -- would otherwise have no field to
      // focus yet. Flushing here keeps both routes into the panel identical.
      flushSync();
      searchInput?.focus();
      return;
    }

    // Focus that simply fell on the floor when the panel stopped rendering belongs back on the
    // trigger; focus that a click deliberately put elsewhere does not. A modal `<dialog>` is the
    // second resting place a dropped focus lands on, alongside the body.
    const active = document.activeElement;
    const dropped =
      active === null || active === document.body || active instanceof HTMLDialogElement;

    if (focusWasInsidePanel && dropped) trigger?.focus();
    focusWasInsidePanel = false;
    unmountWhenHidden();
  };
</script>

<!--
@component
A single-select combobox: a trigger, a top-layer panel, and an optional search field that appears
by itself once the list is long enough to need one.

It is built on the native popover API, so re-clicking the trigger, clicking outside and pressing
Escape all dismiss it without a listener of our own, and the panel sits in the top layer — above a
`Modal`, and out of every overflow and stacking context on the page — with no z-index anywhere.

Searching is accent-insensitive: typing `otavio` finds `Otávio`. That is the default matcher, and
`filter` replaces it. Clearing is a ✕ on the trigger rather than a blank row in the list, so an
empty selection can never be mistaken for a real option.

The trigger carries `role="combobox"` and every attribute passed in, which is where an
`aria-labelledby` pointing at the consumer's own `<label>` goes. `class` styles the control
instead — the width belongs to the wrapper, since the panel matches it.

```svelte
<span id="local-label">Local</span>
<Select
  bind:value={local}
  options={LOCALS}
  aria-labelledby="local-label"
  placeholder="Every local"
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
    aria-activedescendant={showSearch ? undefined : activeOptionId}
    style:anchor-name={anchorName}
    onpointerdown={() => (isMounted = true)}
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

<div
  bind:this={panel}
  popover
  id={panelId}
  class="plinth-select-panel flex flex-col overflow-hidden rounded-box border border-base-content/10 bg-base-100 shadow-lg"
  style:position-anchor={anchorName}
  onbeforetoggle={onBeforeToggle}
  ontoggle={onToggle}
  ontransitionend={unmountWhenHidden}
  ontransitioncancel={unmountWhenHidden}
>
  {#if isMounted}
    {#if showSearch}
      <div class="flex-none border-b border-base-content/10 p-2">
        <input
          bind:this={searchInput}
          bind:value={query}
          type="text"
          class="input w-full input-sm"
          placeholder={searchPlaceholder}
          autocomplete="off"
          autocorrect="off"
          spellcheck="false"
          aria-controls={listboxId}
          aria-activedescendant={activeOptionId}
          aria-autocomplete="list"
          onkeydown={onKeydown}
        />
      </div>
    {/if}

    <div
      id={listboxId}
      role="listbox"
      aria-labelledby={triggerId}
      class="max-h-64 min-h-0 flex-1 overflow-y-auto overscroll-contain p-1"
    >
      {#each visible as candidate, index (candidate.value)}
        <button
          type="button"
          id={optionId(index)}
          role="option"
          tabindex="-1"
          disabled={candidate.disabled}
          aria-selected={candidate.value === value}
          aria-disabled={candidate.disabled}
          class={[
            "flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-field px-3 py-2 text-start text-sm",
            // A tint of the foreground rather than a step of the surface: base-200 is lighter than
            // base-100 in a light theme and darker in a dark one, so a surface step reads as
            // "raised" in one and "recessed" in the other.
            index === highlighted && "bg-base-content/10",
            candidate.disabled && "cursor-not-allowed opacity-40",
          ]}
          onpointermove={() => (highlightedValue = candidate.value)}
          onclick={() => choose(candidate)}
        >
          <span class="min-w-0 flex-1 truncate">
            {#if option}{@render option(candidate)}{:else}{candidate.label}{/if}
          </span>
          <span class="flex-none text-xs" aria-hidden="true">
            {candidate.value === value ? "✓" : ""}
          </span>
        </button>
      {/each}

      {#if visible.length === 0}
        <p class="px-3 py-4 text-center text-sm text-base-content/60">{emptyLabel}</p>
      {/if}
    </div>
  {/if}
</div>

<style>
  [popover] {
    position-area: bottom;
    position-try: top;
    /* The panel is the trigger's list, so it is the trigger's width -- an option that fits the
       closed control fits the open one. */
    width: anchor-size(width);
    /* Overriding the UA's `margin: auto`, which would otherwise centre the panel in the whole
       region below the anchor instead of hanging it just under the trigger. The inline margins
       stay auto so the panel keeps sitting over the anchor. */
    margin-block: 0.25rem;
  }

  /* A closed popover is hidden by a rule in the UA stylesheet, which every author rule outranks --
     including any `display` a utility class on the panel might carry. Restating the rule here puts
     it at a specificity a utility cannot reach, while leaving an exit transition possible for a
     caller who asks for one with `transition-behavior: allow-discrete`. */
  [popover]:not(:popover-open) {
    display: none;
  }
</style>
