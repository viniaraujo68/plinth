<script lang="ts" generics="O extends SelectOption = SelectOption">
  import type { Snippet } from "svelte";
  import type { Attachment } from "svelte/attachments";
  import type { ClassValue, HTMLAttributes } from "svelte/elements";
  import {
    filterOptions,
    isTypedKey,
    nearestSelectableIndex,
    nextSelectableIndex,
    Typeahead,
    typeaheadMatch,
    type SelectOption,
  } from "./select.js";

  type Props = Omit<
    HTMLAttributes<HTMLDivElement>,
    "children" | "class" | "onkeydown" | "role" | "tabindex"
  > & {
    /** The rows, in order. A new list keeps the highlighted row, or its position once it is gone. */
    options: readonly O[];
    /**
     * The checked rows: one value, or an array for a list that picks several. A single value is
     * where the highlight starts, and it goes back there whenever the value changes.
     */
    value?: string | readonly string[] | null;
    /** A row was picked, by a click, Enter or Space. A disabled row is never reported. */
    onpick: (option: O) => void;
    /** Adds a search box above the list, which then holds the focus. */
    searchable?: boolean;
    /** The search text. Bindable. */
    query?: string;
    /** What the search reads for a row. Defaults to its label. */
    searchText?: (option: O) => string;
    searchPlaceholder?: string;
    /** Shown in place of the rows when there are none to show. */
    emptyLabel?: string;
    /** Marks the list busy, and shows `loadingLabel` while it has no rows. */
    loading?: boolean;
    loadingLabel?: string;
    /** Takes the focus as the popover or dialog holding the list opens. */
    autofocus?: boolean;
    /** Marks the checked rows with a ✓. Turn it off for a list of actions rather than a choice. */
    checkmarks?: boolean;
    /**
     * Renders a row in place of its label. The row is already a `role="option"` button, so the
     * snippet must not hold buttons, links or anything else interactive.
     */
    option?: Snippet<[O]>;
    /** Classes for the whole control. The list is where every other attribute goes. */
    class?: ClassValue;
  };

  let {
    options,
    value = null,
    onpick,
    searchable = false,
    query = $bindable(""),
    searchText = (candidate) => candidate.label,
    searchPlaceholder = "Search…",
    emptyLabel = "No matches",
    loading = false,
    loadingLabel = "Loading…",
    autofocus = false,
    checkmarks = true,
    option,
    class: className,
    ...rest
  }: Props = $props();

  const uid = $props.id();
  const listId = $derived(rest.id ?? `plinth-listbox-${uid}`);
  const optionId = (index: number) => `${listId}-option-${index}`;

  const visible = $derived(searchable ? filterOptions(options, query, searchText) : options);
  const multiple = $derived(Array.isArray(value));
  const checked = $derived(new Set<string | null>([value].flat()));

  let highlighted = $state.raw<{ value: string; index: number; from: typeof value }>();

  const activeIndex = $derived.by(() => {
    if (highlighted && (multiple || highlighted.from === value)) {
      const kept = visible.findIndex(
        (candidate) => candidate.value === highlighted!.value && !candidate.disabled,
      );
      return kept >= 0 ? kept : nearestSelectableIndex(visible, highlighted.index);
    }
    const start = multiple
      ? -1
      : visible.findIndex((candidate) => candidate.value === value && !candidate.disabled);
    return start >= 0 ? start : nearestSelectableIndex(visible, 0);
  });

  const activeId = $derived(activeIndex >= 0 ? optionId(activeIndex) : undefined);

  const scrollToActive: Attachment<HTMLElement> = (list) => {
    const row = list.children[activeIndex] as HTMLElement | undefined;
    if (!row) return;
    const bottom = row.offsetTop + row.offsetHeight - list.clientHeight;
    if (row.offsetTop < list.scrollTop) list.scrollTop = row.offsetTop;
    else if (bottom > list.scrollTop) list.scrollTop = bottom;
  };

  const scrollOnResize: Attachment<HTMLElement> = (list) => {
    const observer = new ResizeObserver(() => scrollToActive(list));
    observer.observe(list);
    return () => observer.disconnect();
  };

  const highlight = (index: number) => {
    const candidate = visible[index];
    if (candidate) highlighted = { value: candidate.value, index, from: value };
  };

  const pick = (index: number) => {
    const candidate = visible[index];
    if (!candidate || candidate.disabled) return;
    highlight(index);
    onpick(candidate);
  };

  const typeahead = new Typeahead();
  const jumpTo = (char: string) =>
    highlight(typeaheadMatch(visible, activeIndex, typeahead.add(char)));

  const onkeydown = (event: KeyboardEvent) => {
    if (event.isComposing) return;
    switch (event.key) {
      case "ArrowDown":
        highlight(nextSelectableIndex(visible, activeIndex + 1, 1));
        break;
      case "ArrowUp":
        highlight(nextSelectableIndex(visible, activeIndex - 1, -1));
        break;
      case "Home":
        if (searchable) return;
        highlight(nextSelectableIndex(visible, 0, 1));
        break;
      case "End":
        if (searchable) return;
        highlight(nextSelectableIndex(visible, visible.length - 1, -1));
        break;
      case " ":
        if (searchable) return;
        if (typeahead.typing) {
          jumpTo(" ");
          break;
        }
        pick(activeIndex);
        break;
      case "Enter":
        pick(activeIndex);
        break;
      default:
        if (searchable || !isTypedKey(event)) return;
        jumpTo(event.key);
    }
    event.preventDefault();
  };
</script>

<!--
@component
A list to pick from in place: click a row, or walk it with the arrows, Home and End or the first
letters of a label, and pick with Enter or Space. `value` checks the selected row and the highlight
starts on it; an array of values checks several, for a list that picks many. Disabled rows show,
and the keyboard and the pointer step over them.

`searchable` adds a search box that keeps the focus while the arrows walk the list under it. It
folds case and accents, and a row matches when it contains every word typed; `searchText` decides
what it reads, so a row can be found by text it does not show.

The focus stays inside: on the search box, or on the list itself. The highlighted row is pointed at
with `aria-activedescendant` and never focused. Put the list in a popover with `autofocus` and it
takes the focus as the popover opens — which is what a `Dropdown` does with it.

```svelte
<Listbox options={statuses} value={status} onpick={(row) => (status = row.value)} aria-label="Status" />
```
-->

<div class={["plinth-listbox flex flex-col", className]}>
  {#if searchable}
    <input
      bind:value={query}
      type="text"
      class="input mb-1 w-full input-sm"
      placeholder={searchPlaceholder}
      autocomplete="off"
      spellcheck="false"
      {autofocus}
      role="combobox"
      aria-expanded="true"
      aria-controls={listId}
      aria-activedescendant={activeId}
      aria-autocomplete="list"
      aria-label={searchPlaceholder}
      oninput={() => (highlighted = undefined)}
      {onkeydown}
    />
  {/if}

  <div
    {...rest}
    {@attach scrollToActive}
    {@attach scrollOnResize}
    id={listId}
    role="listbox"
    tabindex={searchable ? -1 : 0}
    aria-busy={loading || undefined}
    aria-multiselectable={multiple || undefined}
    aria-activedescendant={searchable ? undefined : activeId}
    autofocus={!searchable && autofocus}
    class="pointer-events-auto relative max-h-64 overflow-y-auto overscroll-contain p-1 focus-visible:outline-none"
    onkeydown={searchable ? undefined : onkeydown}
    onmousedown={(event) => {
      event.preventDefault();
      if (!searchable) event.currentTarget.focus();
    }}
  >
    {#each visible as candidate, index (candidate.value)}
      <button
        type="button"
        id={optionId(index)}
        role="option"
        tabindex="-1"
        disabled={candidate.disabled}
        aria-selected={checked.has(candidate.value)}
        aria-disabled={candidate.disabled}
        class={[
          "flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-field px-3 py-2 text-start text-sm",
          index === activeIndex && "bg-base-content/10",
          candidate.disabled && "cursor-not-allowed opacity-40",
        ]}
        onpointermove={() => {
          if (!candidate.disabled && index !== activeIndex) highlight(index);
        }}
        onclick={() => pick(index)}
      >
        <span class="min-w-0 flex-1 wrap-anywhere">
          {#if option}{@render option(candidate)}{:else}{candidate.label}{/if}
        </span>
        {#if checkmarks}
          <span class="flex-none text-xs" aria-hidden="true">
            {checked.has(candidate.value) ? "✓" : ""}
          </span>
        {/if}
      </button>
    {/each}
  </div>

  {#if visible.length === 0}
    <p role="status" class="px-3 py-4 text-center text-sm text-base-content/60">
      {loading ? loadingLabel : emptyLabel}
    </p>
  {/if}
</div>
