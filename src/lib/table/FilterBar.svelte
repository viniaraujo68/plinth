<script lang="ts" generics="T">
  import { tick } from "svelte";
  import type { ClassValue } from "svelte/elements";
  import Dropdown from "../components/Dropdown.svelte";
  import { DEFAULT_FILTER_LABELS, type FilterLabels } from "./filter-labels.js";
  import {
    addNode,
    emptyFilter,
    filterableColumns,
    isFilterEmpty,
    isGroup,
    isRuleActive,
    removeNode,
    replaceNode,
    setCombinator,
    type FilterableColumn,
    type NodePath,
  } from "./filter.js";
  import FilterRuleEditor from "./FilterRuleEditor.svelte";
  import type { Column, FilterCombinator, FilterGroup, FilterRule } from "./types.js";

  interface Props {
    columns: readonly Column<T>[];
    filter?: FilterGroup;
    onchange?: (filter: FilterGroup) => void;
    groups?: boolean;
    labels?: Partial<FilterLabels>;
    class?: ClassValue;
  }

  let {
    columns,
    filter = $bindable(emptyFilter()),
    onchange,
    groups = true,
    labels,
    class: className,
  }: Props = $props();

  const text = $derived({ ...DEFAULT_FILTER_LABELS, ...labels });
  const fields = $derived(filterableColumns(columns));
  const byKey = $derived(new Map(fields.map((column) => [column.key, column])));
  const hasRules = $derived(!isFilterEmpty(columns, filter));

  const dropdowns: Record<string, ReturnType<typeof Dropdown> | undefined> = $state({});

  const pathKey = (path: NodePath) => path.join(".");

  const commit = (next: FilterGroup) => {
    filter = next;
    onchange?.(next);
  };

  const other = (combinator: FilterCombinator): FilterCombinator =>
    combinator === "and" ? "or" : "and";

  const add = (groupPath: NodePath, rule: FilterRule) => {
    commit(addNode(filter, groupPath, rule));
    dropdowns[`add:${pathKey(groupPath)}`]?.close();
  };

  const edit = (path: NodePath, rule: FilterRule) => {
    commit(replaceNode(filter, path, rule));
    dropdowns[`edit:${pathKey(path)}`]?.close();
  };

  const addGroup = async () => {
    const path = [filter.children.length];
    commit(addNode(filter, [], emptyFilter(other(filter.combinator))));
    await tick();
    dropdowns[`add:${pathKey(path)}`]?.open();
  };

  const valueText = (column: FilterableColumn<T>, rule: FilterRule): string => {
    const columnFilter = column.filter;
    if (Array.isArray(rule.value)) {
      if (columnFilter.kind !== "choice") return rule.value.join(", ");
      const labelOf = new Map(columnFilter.options.map((option) => [option.value, option.label]));
      return rule.value.map((value) => labelOf.get(value) ?? value).join(", ");
    }
    if (typeof rule.value === "number" && columnFilter.kind === "number" && columnFilter.format)
      return columnFilter.format(rule.value);
    return String(rule.value);
  };

  const operatorText = (column: FilterableColumn<T>, rule: FilterRule) =>
    text.operator(rule.operator, column as Column<never>);

  const describe = (column: FilterableColumn<T>, rule: FilterRule) =>
    `${column.label} ${operatorText(column, rule)} ${valueText(column, rule)}`;
</script>

{#snippet plus()}
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2.25"
    stroke-linecap="round"
    aria-hidden="true"
  >
    <path d="M12 5v14M5 12h14" />
  </svg>
{/snippet}

{#snippet cross()}
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2.25"
    stroke-linecap="round"
    aria-hidden="true"
  >
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
{/snippet}

{#snippet connector(group: FilterGroup, path: NodePath)}
  <button
    type="button"
    class="plinth-filter-connector"
    data-combinator={group.combinator}
    aria-label={text.toggleCombinator(other(group.combinator))}
    onclick={() => commit(setCombinator(filter, path, other(group.combinator)))}
  >
    {text.combinator(group.combinator)}
  </button>
{/snippet}

{#snippet chip(rule: FilterRule, path: NodePath)}
  {@const column = byKey.get(rule.key)!}
  {@const description = describe(column, rule)}
  <span class="plinth-filter-chip">
    <Dropdown
      bind:this={dropdowns[`edit:${pathKey(path)}`]}
      class="plinth-filter-chip-body"
      panelClass="plinth-filter-panel"
      aria-label={text.edit(description)}
    >
      <span class="plinth-filter-chip-field">{column.label}</span>
      <span class="plinth-filter-chip-operator">{operatorText(column, rule)}</span>
      <span class="plinth-filter-chip-value">{valueText(column, rule)}</span>
      {#snippet content()}
        <FilterRuleEditor
          {columns}
          {fields}
          {rule}
          labels={text}
          onapply={(next) => edit(path, next)}
        />
      {/snippet}
    </Dropdown>
    <button
      type="button"
      class="plinth-filter-chip-remove"
      aria-label={text.remove(description)}
      onclick={() => commit(removeNode(filter, path))}
    >
      {@render cross()}
    </button>
  </span>
{/snippet}

{#snippet addButton(path: NodePath, labelled: boolean)}
  <Dropdown
    bind:this={dropdowns[`add:${pathKey(path)}`]}
    class={["plinth-filter-add", labelled && "plinth-filter-add-labelled"]}
    panelClass="plinth-filter-panel"
    aria-label={text.add}
  >
    {@render plus()}
    {#if labelled}<span>{text.add}</span>{/if}
    {#snippet content()}
      <FilterRuleEditor {columns} {fields} labels={text} onapply={(rule) => add(path, rule)} />
    {/snippet}
  </Dropdown>
{/snippet}

{#snippet groupBody(group: FilterGroup, path: NodePath)}
  {@const visible = group.children
    .map((node, index) => ({ node, index }))
    .filter(({ node }) => isGroup(node) || isRuleActive(columns, node))}
  {#each visible as { node, index }, position (index)}
    {#if position > 0}{@render connector(group, path)}{/if}
    {#if isGroup(node)}
      <span class="plinth-filter-group" role="group" aria-label={text.group}>
        {@render groupBody(node, [...path, index])}
        {@render addButton([...path, index], false)}
        <button
          type="button"
          class="plinth-filter-group-remove"
          aria-label={text.removeGroup}
          onclick={() => commit(removeNode(filter, [...path, index]))}
        >
          {@render cross()}
        </button>
      </span>
    {:else}
      {@render chip(node, [...path, index])}
    {/if}
  {/each}
{/snippet}

<div class={["plinth-filter-bar", className]}>
  {@render groupBody(filter, [])}
  {@render addButton([], true)}
  {#if groups}
    <button type="button" class="plinth-filter-add plinth-filter-add-labelled" onclick={addGroup}>
      {@render plus()}
      <span>{text.addGroup}</span>
    </button>
  {/if}
  {#if hasRules || filter.children.length > 0}
    <button
      type="button"
      class="plinth-filter-clear"
      onclick={() => commit(emptyFilter(filter.combinator))}
    >
      {text.clear}
    </button>
  {/if}
</div>

<style>
  .plinth-filter-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.375rem;
    min-width: 0;
    max-width: 100%;
    font-size: 0.8125rem;
  }

  .plinth-filter-chip {
    display: inline-flex;
    align-items: stretch;
    min-width: 0;
    max-width: 100%;
    border: 1px solid color-mix(in oklch, var(--color-base-content) 14%, transparent);
    border-radius: var(--radius-field, 0.5rem);
    background: var(--color-base-100);
    box-shadow: 0 1px 0 color-mix(in oklch, var(--color-base-content) 4%, transparent);
  }

  .plinth-filter-chip:hover {
    border-color: color-mix(in oklch, var(--color-base-content) 24%, transparent);
  }

  :global(.plinth-filter-chip-body) {
    display: inline-flex;
    align-items: baseline;
    gap: 0.3em;
    min-width: 0;
    overflow: hidden;
    padding: 0.2rem 0.25rem 0.2rem 0.55rem;
    border-radius: var(--radius-field, 0.5rem) 0 0 var(--radius-field, 0.5rem);
    cursor: pointer;
  }

  :global(.plinth-filter-chip-body:focus-visible) {
    outline: 2px solid var(--color-primary);
    outline-offset: 1px;
  }

  .plinth-filter-chip-field {
    flex: none;
    color: color-mix(in oklch, var(--color-base-content) 62%, transparent);
  }

  .plinth-filter-chip-operator {
    flex: none;
    color: var(--color-primary);
    font-weight: 600;
  }

  .plinth-filter-chip-value {
    min-width: 0;
    max-width: 16rem;
    overflow: hidden;
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .plinth-filter-chip-remove,
  .plinth-filter-group-remove {
    display: inline-grid;
    place-items: center;
    flex: none;
    width: 1.5rem;
    color: color-mix(in oklch, var(--color-base-content) 45%, transparent);
    cursor: pointer;
  }

  .plinth-filter-chip-remove {
    border-radius: 0 var(--radius-field, 0.5rem) var(--radius-field, 0.5rem) 0;
  }

  .plinth-filter-chip-remove:hover,
  .plinth-filter-group-remove:hover {
    color: var(--color-error);
    background: color-mix(in oklch, var(--color-error) 10%, transparent);
  }

  .plinth-filter-chip-remove :global(svg),
  .plinth-filter-group-remove :global(svg) {
    width: 0.75rem;
    height: 0.75rem;
  }

  .plinth-filter-connector {
    padding: 0.05rem 0.4rem;
    border-radius: 999px;
    font-size: 0.6875rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    cursor: pointer;
    transition:
      background-color 120ms,
      color 120ms;
  }

  .plinth-filter-connector[data-combinator="and"] {
    background: color-mix(in oklch, var(--color-base-content) 7%, transparent);
    color: color-mix(in oklch, var(--color-base-content) 65%, transparent);
  }

  .plinth-filter-connector[data-combinator="or"] {
    background: color-mix(in oklch, var(--color-primary) 14%, transparent);
    color: var(--color-primary);
  }

  .plinth-filter-connector:hover {
    background: color-mix(in oklch, var(--color-primary) 22%, transparent);
    color: var(--color-primary);
  }

  .plinth-filter-group {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.375rem;
    min-width: 0;
    max-width: 100%;
    padding: 0.2rem 0.2rem 0.2rem 0.45rem;
    border: 1px dashed color-mix(in oklch, var(--color-primary) 40%, transparent);
    border-radius: calc(var(--radius-field, 0.5rem) + 0.2rem);
    background: color-mix(in oklch, var(--color-primary) 5%, transparent);
  }

  .plinth-filter-group-remove {
    height: 1.5rem;
    border-radius: var(--radius-field, 0.5rem);
  }

  :global(.plinth-filter-add) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    min-width: 1.6rem;
    height: 1.6rem;
    padding: 0 0.3rem;
    border: 1px dashed color-mix(in oklch, var(--color-base-content) 25%, transparent);
    border-radius: var(--radius-field, 0.5rem);
    color: color-mix(in oklch, var(--color-base-content) 65%, transparent);
    cursor: pointer;
    transition:
      border-color 120ms,
      color 120ms,
      background-color 120ms;
  }

  :global(.plinth-filter-add-labelled) {
    padding: 0 0.6rem 0 0.45rem;
  }

  :global(.plinth-filter-add:hover),
  :global(.plinth-filter-add[aria-expanded="true"]) {
    border-color: var(--color-primary);
    background: color-mix(in oklch, var(--color-primary) 6%, transparent);
    color: var(--color-primary);
  }

  :global(.plinth-filter-add svg) {
    width: 0.8rem;
    height: 0.8rem;
  }

  .plinth-filter-clear {
    padding: 0 0.4rem;
    color: color-mix(in oklch, var(--color-base-content) 55%, transparent);
    cursor: pointer;
  }

  .plinth-filter-clear:hover {
    color: var(--color-error);
    text-decoration: underline;
  }

  :global(.plinth-filter-panel) {
    width: 17rem;
    max-height: 26rem;
    margin: 0.3rem 0 0;
    padding: 0.5rem;
    overflow-y: auto;
    border: 1px solid color-mix(in oklch, var(--color-base-content) 10%, transparent);
    border-radius: var(--radius-box, 1rem);
    background: var(--color-base-100);
    box-shadow:
      0 10px 30px -10px color-mix(in oklch, var(--color-base-content) 30%, transparent),
      0 2px 6px -2px color-mix(in oklch, var(--color-base-content) 12%, transparent);
  }
</style>
