<script lang="ts" generics="T">
  import { untrack } from "svelte";
  import Listbox from "../components/Listbox.svelte";
  import SegmentedControl from "../components/SegmentedControl.svelte";
  import { normalizeForSearch } from "../components/select.js";
  import type { FilterLabels } from "./filter-labels.js";
  import { isRuleActive, operatorsOf, type FilterableColumn } from "./filter.js";
  import type {
    Column,
    FilterOperator,
    FilterRule,
    NumberOperator,
    TextOperator,
  } from "./types.js";

  interface Props {
    columns: readonly Column<T>[];
    fields: readonly FilterableColumn<T>[];
    rule?: FilterRule;
    labels: FilterLabels;
    onapply: (rule: FilterRule) => void;
  }

  let { columns, fields, rule, labels, onapply }: Props = $props();

  const FIELD_SEARCH_THRESHOLD = 8;
  const CHOICE_SEARCH_THRESHOLD = 8;

  const initial = untrack(() => rule);

  let fieldKey = $state<string | null>(initial?.key ?? null);
  let fieldQuery = $state("");
  let operator = $state<FilterOperator>(
    initial?.operator ?? untrack(() => (fields[0] ? operatorsOf(fields[0].filter)[0] : "contains")),
  );
  let text = $state(typeof initial?.value === "string" ? initial.value : "");
  let amount = $state<number | null | undefined>(
    typeof initial?.value === "number" ? initial.value : null,
  );
  let choices = $state<string[]>(Array.isArray(initial?.value) ? [...initial.value] : []);

  const field = $derived(fields.find((candidate) => candidate.key === fieldKey));
  const operators = $derived(field ? operatorsOf(field.filter) : []);

  const shownFields = $derived.by(() => {
    const query = normalizeForSearch(fieldQuery.trim());
    if (query === "") return fields;
    return fields.filter((candidate) => normalizeForSearch(candidate.label).includes(query));
  });

  const draft = $derived.by((): FilterRule | undefined => {
    if (!field) return undefined;
    const { key, filter } = field;
    if (filter.kind === "choice") return { key, operator: "in", value: choices };
    if (filter.kind === "number")
      return typeof amount === "number"
        ? { key, operator: operator as NumberOperator, value: amount }
        : undefined;
    return { key, operator: operator as TextOperator, value: text };
  });

  const valid = $derived(draft !== undefined && isRuleActive(columns, draft));

  const pick = (candidate: FilterableColumn<T>) => {
    const keepOperator = operatorsOf(candidate.filter).includes(operator);
    fieldKey = candidate.key;
    if (!keepOperator) operator = operatorsOf(candidate.filter)[0];
    choices = [];
  };

  const toggleChoice = (value: string) => {
    choices = choices.includes(value)
      ? choices.filter((picked) => picked !== value)
      : [...choices, value];
  };

  const submit = (event: SubmitEvent) => {
    event.preventDefault();
    if (draft && valid) onapply(draft);
  };

  const focusOnMount = (node: HTMLElement) => {
    node.focus();
  };

  const kindGlyph = (column: FilterableColumn<T>) => {
    if (column.filter.kind === "number") return "#";
    if (column.filter.kind === "choice") return "≡";
    return "Aa";
  };
</script>

{#if !field}
  <div class="plinth-filter-editor">
    {#if fields.length > FIELD_SEARCH_THRESHOLD}
      <input
        class="input w-full input-sm"
        type="search"
        placeholder={labels.searchFields}
        aria-label={labels.searchFields}
        bind:value={fieldQuery}
        {@attach focusOnMount}
      />
    {/if}
    <ul class="plinth-filter-fields" aria-label={labels.fields}>
      {#each shownFields as candidate (candidate.key)}
        <li>
          <button type="button" class="plinth-filter-field" onclick={() => pick(candidate)}>
            <span class="plinth-filter-glyph" aria-hidden="true">{kindGlyph(candidate)}</span>
            {candidate.label}
          </button>
        </li>
      {:else}
        <li class="plinth-filter-none">{labels.noFields}</li>
      {/each}
    </ul>
  </div>
{:else}
  <form class="plinth-filter-editor" onsubmit={submit}>
    <div class="plinth-filter-head">
      <button
        type="button"
        class="plinth-filter-back"
        aria-label={labels.back}
        onclick={() => (fieldKey = null)}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
      </button>
      <span class="plinth-filter-title">{field.label}</span>
    </div>

    {#if operators.length > 1}
      <SegmentedControl
        class="plinth-filter-operators"
        label={labels.operatorGroup(field as Column<never>)}
        options={operators.map((id) => ({
          id,
          label: labels.operator(id, field as Column<never>),
        }))}
        value={operator}
        onchange={(id) => (operator = id)}
      />
    {/if}

    {#if field.filter.kind === "number"}
      <input
        class="input w-full input-sm"
        type="number"
        aria-label={labels.value}
        placeholder={labels.value}
        min={field.filter.min}
        max={field.filter.max}
        step={field.filter.step ?? "any"}
        bind:value={amount}
        {@attach focusOnMount}
      />
    {:else if field.filter.kind === "text"}
      <input
        class="input w-full input-sm"
        type="text"
        aria-label={labels.value}
        placeholder={labels.value}
        bind:value={text}
        {@attach focusOnMount}
      />
    {:else}
      <Listbox
        class="plinth-filter-choices"
        aria-label={field.label}
        options={field.filter.options}
        value={choices}
        onpick={(option) => toggleChoice(option.value)}
        searchable={field.filter.options.length > CHOICE_SEARCH_THRESHOLD}
        searchPlaceholder={labels.search}
        emptyLabel={labels.noOptions}
        autofocus
      />
    {/if}

    <button type="submit" class="btn btn-primary btn-sm" disabled={!valid}>
      {labels.apply}
    </button>
  </form>
{/if}

<style>
  .plinth-filter-editor {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .plinth-filter-fields {
    display: flex;
    flex-direction: column;
    max-height: 16rem;
    overflow-y: auto;
  }

  .plinth-filter-field {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    width: 100%;
    padding: 0.375rem 0.5rem;
    border-radius: var(--radius-field, 0.5rem);
    font-size: 0.875rem;
    text-align: left;
    cursor: pointer;
  }

  .plinth-filter-field:hover,
  .plinth-filter-field:focus-visible {
    background: color-mix(in oklch, var(--color-base-content) 6%, transparent);
    outline: none;
  }

  .plinth-filter-glyph {
    display: inline-grid;
    place-items: center;
    width: 1.5rem;
    height: 1.25rem;
    border-radius: 0.25rem;
    background: color-mix(in oklch, var(--color-base-content) 7%, transparent);
    color: color-mix(in oklch, var(--color-base-content) 60%, transparent);
    font-size: 0.6875rem;
    font-weight: 600;
  }

  .plinth-filter-none {
    padding: 0.5rem;
    font-size: 0.875rem;
    color: color-mix(in oklch, var(--color-base-content) 55%, transparent);
  }

  .plinth-filter-head {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .plinth-filter-back {
    display: inline-grid;
    place-items: center;
    width: 1.5rem;
    height: 1.5rem;
    border-radius: var(--radius-field, 0.5rem);
    color: color-mix(in oklch, var(--color-base-content) 60%, transparent);
    cursor: pointer;
  }

  .plinth-filter-back:hover {
    background: color-mix(in oklch, var(--color-base-content) 6%, transparent);
  }

  .plinth-filter-back svg {
    width: 1rem;
    height: 1rem;
  }

  .plinth-filter-title {
    font-size: 0.875rem;
    font-weight: 600;
  }

  :global(.plinth-filter-operators) {
    width: 100%;
  }

  :global(.plinth-filter-operators .plinth-segmented-options) {
    display: grid;
    flex: 1;
    grid-auto-columns: minmax(0, 1fr);
    grid-auto-flow: column;
  }

  :global(.plinth-filter-operators .plinth-segment) {
    font-size: 0.875rem;
  }
</style>
