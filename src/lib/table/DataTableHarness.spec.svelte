<script lang="ts">
  import { untrack } from "svelte";
  import DataTable from "./DataTable.svelte";
  import type { Column, SortState } from "./types.js";

  interface Language {
    id: string;
    name: string;
    year: number;
    typing: string;
  }

  const DEFAULT_ROWS: Language[] = [
    { id: "rs", name: "Rust", year: 2010, typing: "static" },
    { id: "py", name: "Python", year: 1991, typing: "dynamic" },
    { id: "ts", name: "TypeScript", year: 2012, typing: "static" },
  ];

  interface Props {
    /** Drives the container query: the table's form is a function of this box, nothing else. */
    width?: string;
    rows?: Language[];
    withCard?: boolean;
    initialSort?: SortState;
  }

  let { width = "60rem", rows = DEFAULT_ROWS, withCard = false, initialSort }: Props = $props();

  // Seeding state from a prop is the point here: the spec sets the starting order and then the
  // table owns it. `untrack` says so out loud, since reading a prop into `$state` warns otherwise.
  let sort = $state<SortState | undefined>(untrack(() => initialSort));
  let clicked = $state<string>("");

  const columns: Column<Language>[] = $derived([
    { key: "name", label: "Language" },
    { key: "year", label: "Year", numeric: true },
    { key: "typing", label: "Typing", cell: typingBadge },
    { key: "actions", label: "Actions", sortable: false },
  ]);
</script>

<!--
@component
Test-only host for `DataTable`. It owns the sizing box the container query reads, the bound sort
state a spec needs to observe, and a per-column cell snippet — none of which a spec can express
through `render` alone. Named `*.spec.svelte` so packaging drops it.
-->

{#snippet typingBadge(row: Language)}
  <span data-testid="typing-badge">{row.typing.toUpperCase()}</span>
{/snippet}

<div data-testid="sort-state">{sort ? `${sort.key}:${sort.direction}` : "none"}</div>
<div data-testid="clicked">{clicked}</div>

<div style:width>
  <DataTable
    {rows}
    {columns}
    rowKey={(row) => row.id}
    bind:sort
    label="Languages"
    onRowClick={(row) => (clicked = row.id)}
    card={withCard ? languageCard : undefined}
  >
    {#snippet empty()}
      <span data-testid="empty">Nothing to show</span>
    {/snippet}
  </DataTable>
</div>

{#snippet languageCard(row: Language)}
  <span data-testid="language-card">{row.name} ({row.year})</span>
{/snippet}
