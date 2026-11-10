<script lang="ts">
  import { untrack } from "svelte";
  import DataTable from "./DataTable.svelte";
  import type { Column, FilterGroup } from "./types.js";

  interface Player {
    id: number;
    name: string;
    matches: number;
    goals: number;
    assists: number;
  }

  const PLAYERS: Player[] = [
    { id: 1, name: "Ana", matches: 12, goals: 9, assists: 2 },
    { id: 2, name: "Bia", matches: 4, goals: 1, assists: 11 },
    { id: 3, name: "Caio", matches: 18, goals: 3, assists: 4 },
    { id: 4, name: "Duda", matches: 20, goals: 15, assists: 6 },
    { id: 5, name: "Edu", matches: 9, goals: 6, assists: 1 },
  ];

  interface Props {
    initialFilters?: FilterGroup;
    pageSize?: number;
    initialPage?: number;
    filterBar?: boolean;
    loading?: boolean;
    error?: unknown;
    rows?: Player[];
  }

  let {
    initialFilters = { combinator: "and", children: [] },
    pageSize,
    initialPage = 1,
    filterBar = true,
    loading = false,
    error,
    rows = PLAYERS,
  }: Props = $props();

  let filters = $state(untrack(() => initialFilters));
  let page = $state(untrack(() => initialPage));
  let retries = $state(0);

  const columns: Column<Player>[] = [
    { key: "rank", label: "#", sortable: false, cell: rank },
    {
      key: "name",
      label: "Player",
      filter: {
        kind: "choice",
        value: (row) => row.id,
        options: PLAYERS.map((player) => ({ value: String(player.id), label: player.name })),
      },
    },
    { key: "matches", label: "Matches", numeric: true, filter: { kind: "number" } },
    { key: "goals", label: "Goals", numeric: true, filter: { kind: "number" } },
    {
      key: "assists",
      label: "Assists",
      numeric: true,
      filter: { kind: "number", format: (value) => `${value} ast` },
    },
  ];
</script>

{#snippet rank(_player: Player, index: number)}
  {index + 1}
{/snippet}

<div style:width="60rem">
  <DataTable
    {rows}
    {columns}
    rowKey={(row) => row.id}
    sort={{ key: "goals", direction: "desc" }}
    bind:filters
    bind:page
    {pageSize}
    {filterBar}
    {loading}
    {error}
    onRetry={() => (retries += 1)}
    paginatorLabels={{ page: (n) => `Página ${n}` }}
  />
</div>

<output data-testid="filters">{JSON.stringify(filters)}</output>
<output data-testid="page">{page}</output>
<output data-testid="retries">{retries}</output>
