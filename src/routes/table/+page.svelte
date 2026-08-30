<script lang="ts">
  import { createFormatters } from "$lib/formatters.js";
  import { DataTable, type Column, type SortState } from "$lib/table/index.js";

  interface Peak {
    id: string;
    name: string;
    range: string;
    /** Metres above sea level. */
    height: number;
    /** `null` for a summit nobody has stood on, which is what makes the nulls-last rule visible. */
    firstAscent: Date | null;
    grade: "walk-up" | "technical" | "extreme";
  }

  const peak = (
    id: string,
    name: string,
    range: string,
    height: number,
    firstAscent: string | null,
    grade: Peak["grade"],
  ): Peak => ({
    id,
    name,
    range,
    height,
    firstAscent: firstAscent === null ? null : new Date(firstAscent),
    grade,
  });

  const PEAKS: Peak[] = [
    peak("everest", "Everest", "Mahalangur Himal", 8849, "1953-05-29", "extreme"),
    peak("k2", "K2", "Baltoro Karakoram", 8611, "1954-07-31", "extreme"),
    peak("denali", "Denali", "Alaska Range", 6190, "1913-06-07", "technical"),
    peak("kilimanjaro", "Kilimanjaro", "Eastern Rift", 5895, "1889-10-06", "walk-up"),
    peak("matterhorn", "Matterhorn", "Pennine Alps", 4478, "1865-07-14", "technical"),
    peak("fuji", "Fuji", "Fuji Volcanic", 3776, null, "walk-up"),
    peak("olympus", "Olympus", "Olympus Massif", 2917, "1913-08-02", "walk-up"),
  ];

  // Pinned to one locale rather than the visitor's, so the prerendered HTML and the hydrated page
  // agree on every string in the table.
  const format = createFormatters("en-US", { date: { dateStyle: "medium" } });

  /** Ordering a badge needs a rank; the label alone would sort alphabetically, which means nothing. */
  const RANK: Record<Peak["grade"], number> = { "walk-up": 0, technical: 1, extreme: 2 };
  const GRADE_CLASS: Record<Peak["grade"], string> = {
    "walk-up": "badge-success",
    technical: "badge-warning",
    extreme: "badge-error",
  };

  const columns: Column<Peak>[] = $derived([
    { key: "name", label: "Peak" },
    { key: "range", label: "Range" },
    { key: "height", label: "Elevation", numeric: true, cell: elevation, sortBy: (r) => r.height },
    { key: "firstAscent", label: "First ascent", cell: ascent, sortBy: (r) => r.firstAscent },
    { key: "grade", label: "Grade", align: "center", cell: grade, sortBy: (r) => RANK[r.grade] },
  ]);

  let sort = $state<SortState | undefined>({ key: "height", direction: "desc" });
  let selected = $state<Peak | undefined>();
  let useCardSnippet = $state(false);
</script>

{#snippet elevation(peak: Peak)}
  {format.number(peak.height)} m
{/snippet}

{#snippet ascent(peak: Peak)}
  {#if peak.firstAscent}
    {format.date(peak.firstAscent)}
  {:else}
    <span class="text-base-content/50">Unclimbed</span>
  {/if}
{/snippet}

{#snippet grade(peak: Peak)}
  <span class="badge badge-sm {GRADE_CLASS[peak.grade]}">{peak.grade}</span>
{/snippet}

{#snippet peakCard(peak: Peak)}
  <div class="flex items-baseline justify-between gap-3">
    <span class="font-semibold">{peak.name}</span>
    <span class="tabular-nums">{format.number(peak.height)} m</span>
  </div>
  <div class="flex items-baseline justify-between gap-3 text-sm text-base-content/60">
    <span>{peak.range}</span>
    {@render grade(peak)}
  </div>
{/snippet}

<main class="mx-auto flex w-full max-w-5xl flex-col gap-12 p-6 sm:p-10">
  <header class="flex flex-col gap-3">
    <h1 class="text-3xl font-semibold tracking-tight">DataTable</h1>
    <p class="max-w-2xl text-base-content/70">
      Columns described once, as data; rows ordered in the browser. Below a breakpoint the same DOM
      becomes a list of cards — the header row collapses into a strip of sort pills and every cell
      prints its column's label beside its value. Which form renders is a container query on the
      table's own wrapper, so there is no resize listener, no
      <code class="kbd kbd-sm">matchMedia</code>, and nothing that can flash the wrong layout on the
      first paint.
    </p>
    <p class="max-w-2xl text-base-content/70">
      It is deliberately not a data grid. No filtering, no column visibility, no virtualization, no
      saved views — a table that needs those needs a different component.
    </p>
  </header>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
      Sortable, wide
    </h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      Click a header to sort, click it again to reverse; there is no third, unsorted step to walk
      through. A numeric column opens on its largest value, a text column on its first — "top by
      elevation" is what a number column is almost always there to answer. Fuji has no first ascent
      on record, so it sits at the end of that column in
      <em>both</em> directions: a blank is never the answer to "which was first".
    </p>
    <p class="max-w-2xl text-sm text-base-content/70">
      Elevation, first ascent and grade all render through a per-column cell snippet and sort
      through <code class="kbd kbd-sm">sortBy</code>, which is the split that keeps a formatted date
      ordered by its instant and a badge ordered by its severity rather than by its spelling.
    </p>

    <div class="rounded-box border border-base-content/10 bg-base-100 p-2" data-testid="wide">
      <DataTable
        rows={PEAKS}
        {columns}
        rowKey={(peak) => peak.id}
        bind:sort
        class="table-zebra"
        label="Peaks"
        onRowClick={(peak) => (selected = peak)}
      />
    </div>

    <p class="text-sm text-base-content/60">
      Sorted by <code class="kbd kbd-sm" data-testid="sort-state"
        >{sort ? `${sort.key} ${sort.direction}` : "nothing"}</code
      >
      · last row clicked:
      <code class="kbd kbd-sm" data-testid="selected">{selected?.name ?? "none"}</code>
    </p>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
      Narrow — card form
    </h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      The same component, the same columns, the same bound sort state as above — the only difference
      is the width of the box. Sorting from the pills here moves the rows in the wide table too.
    </p>

    <label class="flex w-fit items-center gap-2 text-sm">
      <input
        type="checkbox"
        class="toggle toggle-sm"
        data-testid="card-snippet"
        bind:checked={useCardSnippet}
      />
      Use a <code class="kbd kbd-sm">card</code> snippet instead of label/value pairs
    </label>

    <div
      class="w-[375px] max-w-full rounded-box border border-base-content/15 p-2"
      data-testid="narrow"
    >
      <DataTable
        rows={PEAKS}
        {columns}
        rowKey={(peak) => peak.id}
        bind:sort
        label="Peaks, narrow"
        card={useCardSnippet ? peakCard : undefined}
      />
    </div>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">Empty</h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      The headers stay: a table that emptied out because of a filter still has to let the reader
      change their mind about the order they will see the next rows in.
    </p>
    <div
      class="rounded-box border border-base-content/10 bg-base-100 p-2"
      data-testid="empty-table"
    >
      <DataTable rows={[]} {columns} rowKey={(peak) => peak.id} label="No peaks">
        {#snippet empty()}
          <span data-testid="empty-message">No peaks match this filter.</span>
        {/snippet}
      </DataTable>
    </div>
  </section>
</main>
