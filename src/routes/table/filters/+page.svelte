<script lang="ts">
  import { afterNavigate, replaceState } from "$app/navigation";
  import { page } from "$app/state";
  import { resolve } from "$app/paths";
  import type { ResolvedPathname } from "$app/types";
  import { withSearchParams } from "$lib/routing.svelte.js";
  import {
    DataTable,
    emptyFilter,
    filterFromParams,
    filterRows,
    filterToParams,
    type Column,
    type FilterGroup,
  } from "$lib/table/index.js";

  interface Player {
    id: number;
    name: string;
    matchdays: number;
    matches: number;
    wins: number;
    goals: number;
    assists: number;
  }

  const NAMES = [
    "Ana",
    "Bia",
    "Caio",
    "Duda",
    "Edu",
    "Fábio",
    "Gabi",
    "Hugo",
    "Íris",
    "João",
    "Kaio",
    "Lia",
    "Márcio",
    "Nina",
    "Otávio",
    "Paula",
    "Quim",
    "Rafa",
    "Sofia",
    "Téo",
    "Uli",
    "Vera",
    "Wes",
    "Zé",
  ];

  const PLAYERS: Player[] = NAMES.map((name, index) => {
    const seed = (index * 37 + 11) % 23;
    const matchdays = 2 + ((index * 7) % 17);
    const matches = matchdays * 3 + (seed % 4);
    return {
      id: index + 1,
      name,
      matchdays,
      matches,
      wins: Math.round(matches * (0.25 + (seed % 11) / 20)),
      goals: (seed * 3 + index) % 31,
      assists: (seed * 5 + index * 2) % 19,
    };
  });

  const winRate = (player: Player) => Math.round((player.wins / player.matches) * 100);

  const RANK = new Map(
    [...PLAYERS]
      .sort((a, b) => winRate(b) - winRate(a) || b.matches - a.matches)
      .map((player, index) => [player.id, index + 1]),
  );

  const PLAYER_OPTIONS = PLAYERS.map((player) => ({
    value: String(player.id),
    label: player.name,
  }));

  const columns: Column<Player>[] = [
    {
      key: "rank",
      label: "#",
      align: "center",
      sortBy: (player) => RANK.get(player.id),
      defaultSortDirection: "asc",
      cell: rank,
    },
    {
      key: "name",
      label: "Player",
      filter: { kind: "choice", value: (player) => player.id, options: PLAYER_OPTIONS },
    },
    {
      key: "winRate",
      label: "Win %",
      numeric: true,
      value: winRate,
      cell: percent,
      filter: { kind: "number", min: 0, max: 100, format: (value) => `${value}%` },
    },
    { key: "matchdays", label: "Days", numeric: true, filter: { kind: "number", min: 0 } },
    { key: "matches", label: "Matches", numeric: true, filter: { kind: "number", min: 0 } },
    { key: "goals", label: "Goals", numeric: true, filter: { kind: "number", min: 0 } },
    { key: "assists", label: "Assists", numeric: true, filter: { kind: "number", min: 0 } },
  ];

  let urlFilters = $state<FilterGroup>(emptyFilter());
  let restored = $state(false);

  afterNavigate(() => {
    urlFilters = filterFromParams(page.url.searchParams, columns);
    restored = true;
  });

  $effect(() => {
    if (!restored) return;
    const next = withSearchParams(page.url, filterToParams(urlFilters));
    if (next.searchParams.get("filter") === page.url.searchParams.get("filter")) return;
    const target = `${resolve("/table/filters")}${next.search}` as ResolvedPathname;
    replaceState(target, page.state);
  });

  const shown = $derived(filterRows(PLAYERS, columns, urlFilters));
  const shownGoals = $derived(shown.reduce((sum, player) => sum + player.goals, 0));

  let pagedFilters = $state<FilterGroup>(emptyFilter());
  let pageNumber = $state(1);
  let pageSize = $state(8);

  let remoteRows = $state<Player[]>([]);
  let remoteLoading = $state(false);
  let remoteError = $state<unknown>();
  let slow = $state(true);
  let failNext = $state(false);

  const loadRemote = async () => {
    remoteLoading = true;
    remoteError = undefined;
    await new Promise((resolve) => setTimeout(resolve, slow ? 1500 : 200));
    if (failNext) {
      remoteError = new Error("503 Service Unavailable");
      failNext = false;
    } else {
      remoteRows = PLAYERS.slice(0, 12);
    }
    remoteLoading = false;
  };

  const PT_OPERATORS: Record<string, string> = {
    in: "é",
    contains: "contém",
    eq: "=",
    gte: "≥",
    gt: ">",
    lte: "≤",
    lt: "<",
  };
</script>

{#snippet rank(player: Player)}
  <span
    class={[
      "tabular-nums",
      RANK.get(player.id)! <= 3 ? "font-semibold text-primary" : "text-base-content/50",
    ]}
  >
    {RANK.get(player.id)}
  </span>
{/snippet}

{#snippet percent(player: Player)}
  {winRate(player)}%
{/snippet}

<main class="mx-auto flex w-full max-w-5xl flex-col gap-12 p-6 sm:p-10">
  <header class="flex flex-col gap-3">
    <a class="link text-sm link-hover" href={resolve("/table")}>‹ DataTable</a>
    <h1 class="text-3xl font-semibold tracking-tight">Filtering and paging</h1>
    <p class="max-w-2xl text-base-content/70">
      A column that declares a <code class="kbd kbd-sm">filter</code> takes part in filtering:
      <code class="kbd kbd-sm">text</code>, <code class="kbd kbd-sm">number</code> or
      <code class="kbd kbd-sm">choice</code>. The filter is plain data — one bindable
      <code class="kbd kbd-sm">filters</code> group with a combinator,
      <code class="kbd kbd-sm">and</code>
      or <code class="kbd kbd-sm">or</code>, over rules of
      <code class="kbd kbd-sm">{"{ key, operator, value }"}</code> and nested groups — so the table's
      chip bar, the app's own code and the URL all read and write the same thing.
    </p>
    <p class="max-w-2xl text-base-content/70">
      A rule never matches a missing value, a rule on a column that cannot filter is ignored, and a
      pick that is no longer an option is dropped — which is what makes a stale link harmless.
      Pagination is just as optional: <code class="kbd kbd-sm">pageSize</code> turns it on.
    </p>
  </header>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
      Chip bar, kept in the URL
    </h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      <em>Filter</em> lists the filterable columns; pick one, then an operator and a value. A chip
      opens its own editor in place and × removes it. The word between two chips is the group's
      combinator — click it to switch between <em>and</em> and <em>or</em>. <em>Group</em> starts a
      nested group with the other combinator: try "Matches ≥ 30" and then a group with "Goals ≥ 20"
      or "Assists ≥ 15". The filter is written to the address bar with
      <code class="kbd kbd-sm">filterToParams</code> and read back on load with
      <code class="kbd kbd-sm">filterFromParams</code>, so reloading or sharing the link keeps it.
    </p>
    <p class="max-w-2xl text-sm text-base-content/70">
      The <code class="kbd kbd-sm">#</code> column is the player's place in the whole group, worked out
      before any filter, which is what a ranking means: filtering down to three players does not make
      the third one second.
    </p>

    <div class="rounded-box border border-base-content/10 bg-base-100 p-2" data-testid="url-table">
      <DataTable
        rows={PLAYERS}
        {columns}
        rowKey={(player) => player.id}
        sort={{ key: "rank", direction: "asc" }}
        bind:filters={urlFilters}
        label="Ranking"
        columnsLabel="Columns"
      />
    </div>

    <p class="text-sm text-base-content/60">
      <code class="kbd kbd-sm">filterRows</code> outside the table:
      <span data-testid="url-summary"
        >{shown.length} of {PLAYERS.length} players, {shownGoals} goals</span
      >
    </p>
    <pre
      class="overflow-x-auto rounded-box bg-base-200 p-3 text-xs"
      data-testid="url-rules">{JSON.stringify(urlFilters, null, 2)}</pre>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
      Paged, in another language
    </h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      <code class="kbd kbd-sm">pageSize</code> slices the filtered, sorted rows and puts a
      <code class="kbd kbd-sm">Paginator</code> under the table;
      <code class="kbd kbd-sm">page</code>
      and <code class="kbd kbd-sm">pageSize</code> are bindable. A change made from the chip bar
      goes back to page 1, and a page past the end is clamped rather than shown empty. Every word in
      the chip bar and the paginator comes in through
      <code class="kbd kbd-sm">filterLabels</code> and
      <code class="kbd kbd-sm">paginatorLabels</code> — here in Portuguese.
    </p>

    <div
      class="rounded-box border border-base-content/10 bg-base-100 p-2"
      data-testid="paged-table"
    >
      <DataTable
        rows={PLAYERS}
        {columns}
        rowKey={(player) => player.id}
        sort={{ key: "goals", direction: "desc" }}
        bind:filters={pagedFilters}
        bind:page={pageNumber}
        bind:pageSize
        pageSizes={[5, 8, 20]}
        label="Artilharia"
        filterLabels={{
          add: "Filtrar",
          addGroup: "Grupo",
          clear: "Limpar",
          apply: "Aplicar",
          back: "Voltar aos campos",
          fields: "Campos",
          searchFields: "Buscar campo…",
          search: "Buscar…",
          noFields: "Nenhum campo",
          noOptions: "Nenhuma opção",
          value: "Valor",
          group: "Grupo de filtros",
          combinator: (combinator) => (combinator === "and" ? "e" : "ou"),
          toggleCombinator: (next) =>
            next === "and" ? "Exigir todas as condições" : "Aceitar qualquer condição",
          operator: (operator) => PT_OPERATORS[operator] ?? operator,
          operatorGroup: (column) => `Comparação de ${column.label}`,
          remove: (description) => `Remover filtro ${description}`,
          removeGroup: "Remover grupo",
          edit: (description) => `Editar filtro ${description}`,
        }}
        loadingLabel="Carregando…"
        paginatorLabels={{
          navigation: "Paginação",
          previous: "Página anterior",
          next: "Próxima página",
          page: (n) => `Página ${n}`,
          pageSize: "Itens por página",
          summary: (first, last, total) => `Mostrando ${first} a ${last} de ${total}`,
        }}
      />
    </div>

    <p class="text-sm text-base-content/60">
      Page <code class="kbd kbd-sm" data-testid="paged-page">{pageNumber}</code> of size
      <code class="kbd kbd-sm" data-testid="paged-size">{pageSize}</code>
    </p>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
      Loading and failure
    </h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      <code class="kbd kbd-sm">loading</code> draws a thin bar over the table and sets
      <code class="kbd kbd-sm">aria-busy</code>; with no rows yet it shows placeholder rows, and
      with rows already there it keeps them on screen, dimmed, so a refresh does not blank the page.
      <code class="kbd kbd-sm">error</code> replaces the body with a message and, when
      <code class="kbd kbd-sm">onRetry</code> is given, a retry button —
      <code class="kbd kbd-sm">errorState</code> takes over the whole body when the app has its own panel.
    </p>

    <div class="flex flex-wrap items-center gap-4 text-sm">
      <button type="button" class="btn btn-sm" onclick={loadRemote} disabled={remoteLoading}>
        Load
      </button>
      <label class="flex items-center gap-2">
        <input type="checkbox" class="toggle toggle-sm" bind:checked={slow} /> Slow network
      </label>
      <label class="flex items-center gap-2">
        <input type="checkbox" class="toggle toggle-sm" bind:checked={failNext} /> Fail the next load
      </label>
    </div>

    <div
      class="rounded-box border border-base-content/10 bg-base-100 p-2"
      data-testid="remote-table"
    >
      <DataTable
        rows={remoteRows}
        {columns}
        rowKey={(player) => player.id}
        sort={{ key: "rank", direction: "asc" }}
        loading={remoteLoading}
        error={remoteError}
        onRetry={loadRemote}
        label="Ranking, loaded"
      >
        {#snippet empty()}
          Nothing loaded yet — press Load.
        {/snippet}
      </DataTable>
    </div>
  </section>
</main>
