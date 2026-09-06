<script lang="ts">
  import { untrack, type Snippet } from "svelte";
  import type { ClassValue, HTMLInputAttributes } from "svelte/elements";
  import OptionPanel from "./OptionPanel.svelte";
  import { matchesSelectQuery, nextSelectableIndex, type SelectOption } from "./select.js";

  type Props = Omit<
    HTMLInputAttributes,
    | "children"
    | "class"
    | "disabled"
    | "name"
    | "onblur"
    | "onchange"
    | "onclick"
    | "onfocus"
    | "oninput"
    | "onkeydown"
    | "onpointerdown"
    | "type"
    | "value"
  > & {
    /** The rows, in the order they are shown. `value` is the key, so it has to be unique. */
    options: readonly SelectOption[];
    /** The selected `value`, or `null`. Bindable, and also reported through {@link Props.onchange}. */
    value?: string | null;
    /** Shown in the field while nothing is selected. */
    placeholder?: string;
    /** Whether the selection can be taken back to `null`, through a ✕ in the field. */
    clearable?: boolean;
    disabled?: boolean;
    /**
     * Matching for the typed query. The default is a substring of the label, case- AND
     * accent-insensitive, so `otavio` finds `Otávio`.
     *
     * Only consulted once something has been typed: an untouched field always shows every option,
     * which is one less case a custom matcher has to handle.
     */
    filter?: (option: SelectOption, query: string) => boolean;
    /** Custom rendering for a row. The default is the label. */
    option?: Snippet<[SelectOption]>;
    /** Shown in place of the list when the query matches nothing. */
    emptyLabel?: string;
    /** Accessible name of the clear button. A prop because the library ships no translations. */
    clearLabel?: string;
    /** Classes for the control — width, margins. The field is where every other attribute goes. */
    class?: ClassValue;
    /**
     * Submits the selection with a surrounding `<form>`, through a hidden input carrying the
     * selected `value` — never the text on screen, which is a label and, mid-query, not even that.
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
    placeholder = "Search…",
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

  // `aria-controls` and `aria-activedescendant` both need document-unique ids, and `$props.id()`
  // is the only source of one that is stable across server render and hydration.
  const uid = $props.id();
  const panelId = `plinth-combobox-${uid}`;
  const listboxId = `${panelId}-listbox`;
  const anchorName = `--${panelId}`;
  const optionId = (index: number) => `${panelId}-option-${index}`;

  const labelOf = (candidate: string | null) =>
    options.find((row) => row.value === candidate)?.label ?? "";

  let isOpen = $state(false);
  let highlightedValue = $state<string | null>(null);
  // Initialised rather than left to an effect: an effect never runs on the server, so a control
  // rendered with a selection would ship blank HTML and only fill in after hydration.
  let text = $state(labelOf(value));
  // Whether the text on screen is a query someone typed rather than the selected label put there
  // by the control. Until it is, the whole list is offered -- opening on a selection should not
  // filter everything else away just because one label happens to be in the field.
  let isQuery = $state(false);
  let input = $state<HTMLInputElement>();
  let panel = $state<OptionPanel>();
  // Focus opens the list -- unless a pointer is what brought the focus, in which case the click
  // does it instead. Opening on the focus a mousedown causes would put the panel up just in time
  // for the pointerup that follows to light-dismiss it again.
  let focusedByPointer = false;

  const inputId = $derived(rest.id ?? `${panelId}-input`);

  const selected = $derived(options.find((candidate) => candidate.value === value) ?? null);
  const showClear = $derived(clearable && !disabled && value !== null && value !== undefined);

  const query = $derived(isQuery ? text : "");
  const visible = $derived(
    query.trim() === "" ? options : options.filter((candidate) => filter(candidate, query)),
  );

  // The highlight is held as a value rather than an index so that filtering cannot silently move
  // it onto a different option: a row that stops matching takes the highlight back to the top of
  // what is left, which is what someone still typing expects, and no effect has to watch the query
  // to make it happen.
  const highlighted = $derived.by(() => {
    const index = visible.findIndex((candidate) => candidate.value === highlightedValue);

    return index >= 0 && !visible[index]?.disabled ? index : nextSelectableIndex(visible, 0, 1);
  });

  const activeOptionId = $derived(isOpen && highlighted >= 0 ? optionId(highlighted) : undefined);

  // Puts the selected label in the field and marks it as a label rather than a query. Whenever the
  // field still has the keyboard the label is also selected, which is the whole of what makes the
  // next keystroke a new query instead of an append: a caret parked after `Itaipava` turns `sao`
  // into `Itaipavasao`, which matches nothing. It is the same state a click on the bar leaves
  // behind, so every way back into a settled field behaves alike.
  //
  // Written straight to the element as well as to the state: `bind:value` lands a tick later and
  // puts the caret at the end when it does, which would undo the selection made here. The binding
  // then finds the element already holding the value and leaves it -- and the selection -- alone.
  const showSelectedLabel = () => {
    isQuery = false;
    text = selected?.label ?? "";

    if (input && document.activeElement === input) {
      input.value = text;
      input.select();
    }
  };

  // A selection made from outside -- a reset button, a value arriving with the data -- has to
  // reach the field too. Only while the list is closed: an open control's text belongs to whoever
  // is typing into it, and the close puts the label back anyway.
  $effect(() => {
    const label = selected?.label ?? "";

    untrack(() => {
      if (isOpen || label === text) return;
      showSelectedLabel();
    });
  });

  const commit = (next: string | null) => {
    if (next === value) return;

    value = next;
    onchange?.(next);
  };

  const open = () => {
    if (!disabled) panel?.show();
  };

  const choose = (candidate: SelectOption) => {
    if (candidate.disabled) return;

    commit(candidate.value);
    input?.focus();
    // The close is what writes the chosen label into the field: `commit` has already moved the
    // value, so the restore below reads the new one.
    panel?.hide();
  };

  const clear = () => {
    commit(null);
    text = "";
    isQuery = false;
    input?.focus();
  };

  const move = (delta: number) => {
    const next = nextSelectableIndex(visible, highlighted + delta, delta);
    if (next !== -1) highlightedValue = visible[next]?.value ?? null;
  };

  const onKeydown = (event: KeyboardEvent) => {
    if (disabled) return;

    // Escape is left alone on purpose: the panel is a popover, so the browser's close watcher
    // dismisses it -- and dismisses only it, leaving a surrounding modal open.
    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp":
        event.preventDefault();
        if (!isOpen) open();
        else move(event.key === "ArrowDown" ? 1 : -1);
        break;

      case "Home":
      case "End": {
        // In a text field these move the caret, which is what they should keep doing while there
        // is no list to walk.
        if (!isOpen) return;
        event.preventDefault();

        const forwards = event.key === "Home";
        const edge = nextSelectableIndex(
          visible,
          forwards ? 0 : visible.length - 1,
          forwards ? 1 : -1,
        );
        if (edge !== -1) highlightedValue = visible[edge]?.value ?? null;
        break;
      }

      case "Enter": {
        if (!isOpen) return;
        // A pick is not a submit: without this the Enter that chooses a row would also send the
        // form the control sits in.
        event.preventDefault();

        const candidate = visible[highlighted];
        if (candidate) choose(candidate);
        break;
      }

      case "Tab":
        if (isOpen) panel?.hide();
        break;
    }
  };

  const onInput = () => {
    isQuery = true;
    if (!isOpen) open();
  };

  const onFocus = () => {
    if (focusedByPointer) return;

    input?.select();
    open();
  };

  const onClick = () => {
    focusedByPointer = false;
    // Not a toggle: a click on the bar always leaves it open with the selected label in it and
    // that label selected, so the next keystroke replaces it. The panel light-dismisses itself on
    // the pointerup that precedes this click, which is why re-opening is the whole job here.
    open();
    input?.select();
  };

  const onBlur = () => {
    focusedByPointer = false;
    // Everything that closes the list restores the text, so a half-typed query never survives as
    // the label of a value the control does not hold.
    panel?.hide();
  };

  // Restoring the label belongs to the CLOSE and to nothing else. An open is just as often asked
  // for by the keystroke that starts a query -- typing into a field Escape had closed -- and
  // restoring there would overwrite that very character with the label and leave the caret after
  // it, so the second keystroke would append. Nothing needs restoring on the way in anyway: every
  // close already did it, and the effect above keeps a closed field in step.
  const onOpenChange = (nowOpen: boolean) => {
    isOpen = nowOpen;
    highlightedValue = nowOpen ? value : null;
    if (!nowOpen) showSelectedLabel();
  };
</script>

<!--
@component
A single-select combobox whose control bar IS the search field: click it and type, with no second
field appearing anywhere. For a short list that is quicker to point at than to type at, `Select`
is the one to reach for.

Searching is accent-insensitive — typing `otavio` finds `Otávio` — and matches anywhere in the
label, which is the pair of things native type-ahead cannot do. `filter` replaces the matcher.

The text in the field is a view of the selection, never a value of its own: Escape, Tab, a click
outside, a blur and a pick all put the selected label back, and every label written into a field
that still has the keyboard is selected — as focusing and clicking select it — so typing straight
on starts a new query instead of appending to a label. Emptying the field and leaving therefore
reverts rather than clears — clearing is the ✕, and only the ✕. `name` submits the selected `value`
through a hidden input, so the text on screen is never what a form receives.

The panel is a native popover: it sits in the top layer, above a `Modal` and out of every overflow
and stacking context, with no z-index anywhere. The input carries `role="combobox"` with
`aria-autocomplete="list"` and `aria-activedescendant`, so focus stays in the field while the
arrows walk the list.

```svelte
<span id="airport-label">Airport</span>
<Combobox
  bind:value={airport}
  options={AIRPORTS}
  aria-labelledby="airport-label"
  placeholder="Search airports"
  clearable
  class="max-w-sm"
/>
```
-->

<div class={["plinth-combobox relative flex", className]}>
  <input
    {...rest}
    bind:this={input}
    bind:value={text}
    id={inputId}
    type="text"
    class={[
      "select min-h-11 w-full",
      showClear && "pe-16",
      // daisyUI dims the text of a disabled `<select>` through a rule that only reaches a real
      // `select` element, so a disabled field would otherwise keep full-contrast text on the
      // greyed-out surface it already gets.
      disabled && "text-base-content/40",
    ]}
    role="combobox"
    {disabled}
    {placeholder}
    autocomplete="off"
    autocorrect="off"
    spellcheck="false"
    aria-haspopup="listbox"
    aria-autocomplete="list"
    aria-expanded={isOpen}
    aria-controls={isOpen ? listboxId : undefined}
    aria-activedescendant={activeOptionId}
    style:anchor-name={anchorName}
    onpointerdown={() => (focusedByPointer = true)}
    onfocus={onFocus}
    onclick={onClick}
    onblur={onBlur}
    oninput={onInput}
    onkeydown={onKeydown}
  />

  {#if showClear}
    <!-- The end padding above is what keeps the text from running under it, and the mousedown is
         swallowed so that clearing never costs the field its focus. -->
    <button
      type="button"
      class="btn absolute inset-y-0 end-7 my-auto btn-circle size-8 btn-ghost text-xs"
      aria-label={clearLabel}
      onmousedown={(event) => event.preventDefault()}
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
  anchor={input}
  {value}
  {highlighted}
  {optionId}
  {option}
  {emptyLabel}
  options={visible}
  labelledBy={inputId}
  class="plinth-combobox-panel"
  onopenchange={onOpenChange}
  onhighlight={(candidate) => (highlightedValue = candidate)}
  onchoose={choose}
/>
