<script lang="ts">
  import { page } from "$app/state";
  import { createParamsCodec, createUrlState, param } from "$lib/url-state/index.js";
  import { onMount } from "svelte";

  const GENRES = ["fiction", "history", "science", "poetry"] as const;
  type Genre = (typeof GENRES)[number];

  interface Book {
    title: string;
    genre: Genre;
    year: number;
  }

  const BOOKS: Book[] = [
    { title: "The Left Hand of Darkness", genre: "fiction", year: 1969 },
    { title: "The Guns of August", genre: "history", year: 1962 },
    { title: "A Brief History of Time", genre: "science", year: 1988 },
    { title: "Leaves of Grass", genre: "poetry", year: 1855 },
    { title: "Middlemarch", genre: "fiction", year: 1871 },
    { title: "The Structure of Scientific Revolutions", genre: "science", year: 1962 },
    { title: "SPQR", genre: "history", year: 2015 },
    { title: "Ariel", genre: "poetry", year: 1965 },
    { title: "The Dispossessed", genre: "fiction", year: 1974 },
    { title: "The Double Helix", genre: "science", year: 1968 },
    { title: "The Making of the English Working Class", genre: "history", year: 1963 },
    { title: "Beloved", genre: "fiction", year: 1987 },
    { title: "The Selfish Gene", genre: "science", year: 1976 },
    { title: "Harmonium", genre: "poetry", year: 1923 },
  ];

  const PAGE_SIZE = 4;

  const catalog = createParamsCodec({
    q: param.string({ default: "" }),
    genres: param.list(param.string({ oneOf: GENRES })),
    since: param.number({ integer: true }),
    page: param.number({ default: 1, min: 1, integer: true }),
  });

  const filters = createUrlState(catalog, { resetOnCommit: ["page"] });

  const matches = $derived(
    BOOKS.filter((book) => {
      const { q, genres, since } = filters.committed;
      if (q !== "" && !book.title.toLowerCase().includes(q.toLowerCase())) return false;
      if (genres.length > 0 && !genres.includes(book.genre)) return false;
      return since === undefined || book.year >= since;
    }),
  );
  const pageCount = $derived(Math.max(1, Math.ceil(matches.length / PAGE_SIZE)));
  const visible = $derived(
    matches.slice((filters.committed.page - 1) * PAGE_SIZE, filters.committed.page * PAGE_SIZE),
  );

  const turnPage = (delta: number) =>
    filters.update((state) => ({ ...state, page: Math.max(1, state.page + delta) }));

  const COLORS = [
    "amber",
    "azure",
    "beige",
    "burgundy",
    "cerulean",
    "charcoal",
    "coral",
    "crimson",
    "indigo",
    "ivory",
    "lavender",
    "magenta",
    "maroon",
    "ochre",
    "olive",
    "teal",
    "turquoise",
    "vermilion",
  ];

  const finder = createParamsCodec({ find: param.string({ default: "" }) });
  const search = createUrlState(finder, { replace: true });

  const found = $derived(
    COLORS.filter((color) => color.includes(search.committed.find.trim().toLowerCase())),
  );

  let hydrated = $state(false);
  onMount(() => (hydrated = true));
  const query = $derived(hydrated ? page.url.search : "");

  const show = (value: unknown) => JSON.stringify(value, null, 2);

  const WIRING = `import {
  createParamsCodec,
  createUrlState,
  param,
} from "@viniaraujo68/plinth/url-state";

const catalog = createParamsCodec({
  q: param.string({ default: "" }),
  genres: param.list(param.string({ oneOf: ["fiction", "history", "science", "poetry"] })),
  since: param.number({ integer: true }),
  page: param.number({ default: 1, min: 1, integer: true }),
});

const filters = createUrlState(catalog, { resetOnCommit: ["page"] });`;

  const HANDLERS = [
    { handler: 'param.string({ default: "" })', url: "?q=", reads: '""' },
    {
      handler: 'param.string({ oneOf: ["asc", "desc"], default: "asc" })',
      url: "?dir=up",
      reads: '"asc"',
    },
    {
      handler: "param.number({ default: 1, min: 1, integer: true })",
      url: "?page=2.5",
      reads: "1",
    },
    { handler: "param.number({ default: 1 })", url: "?page=abc", reads: "1" },
    { handler: "param.boolean({ default: false })", url: "?all=1", reads: "false" },
    { handler: "param.date()", url: "?from=2024-02-30", reads: "undefined" },
    { handler: "param.datetime()", url: "?at=yesterday", reads: "undefined" },
    { handler: "param.list(param.number())", url: "?id=1&id=x&id=3", reads: "[1, 3]" },
  ];

  const TYPING = `const search = createUrlState(finder, { replace: true });

const filters = createUrlState(catalog, {
  resetOnCommit: ["page"],
  replace: (previous, next) => changedParams(previous, next).every((name) => name === "q"),
});`;

  const TANSTACK = `import { createQuery } from "@tanstack/svelte-query";

const filters = createUrlState(catalog, { resetOnCommit: ["page"] });

const books = createQuery(() => ({
  queryKey: ["books", filters.key()],
  queryFn: () => api.get(\`/books?\${catalog.serialize(filters.normalized())}\`),
}));`;
</script>

{#snippet pane(title: string, value: string, testid: string)}
  <div
    class="flex min-w-0 flex-col gap-2 rounded-box border border-base-content/10 bg-base-100 p-4"
  >
    <span class="text-xs font-medium tracking-wide text-base-content/50 uppercase">{title}</span>
    <pre class="overflow-x-auto font-mono text-xs" data-testid={testid}>{value}</pre>
  </div>
{/snippet}

<main class="mx-auto flex w-full max-w-5xl flex-col gap-12 p-6 sm:p-10">
  <header class="flex flex-col gap-3">
    <h1 class="text-3xl font-semibold tracking-tight">URL state</h1>
    <p class="max-w-2xl text-base-content/70">
      Filters, sorting and paging that live in the address bar, so a link reopens the screen its
      sender was looking at and the back button undoes a search. A form edits a
      <code class="kbd kbd-sm">draft</code>; <code class="kbd kbd-sm">commit()</code> makes it the
      <code class="kbd kbd-sm">committed</code> state and writes it to the URL. A navigation that changes
      the owned params flows back in.
    </p>
    <p class="max-w-2xl text-base-content/70">
      It is state, not a query layer: nothing here fetches. <code class="kbd kbd-sm">key()</code> is the
      string a fetch should be keyed by, and whatever the app fetches with reads it.
    </p>
  </header>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
      A form that waits for Apply
    </h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      Type, tick and edit freely: the list and the URL only move on Apply. The page buttons are the
      eager field — they commit through <code class="kbd kbd-sm">update()</code> straight away and
      leave the half-typed filters alone. Applying a filter returns to page 1, because the state was
      created with <code class="kbd kbd-sm">resetOnCommit: ["page"]</code>.
    </p>

    <div class="grid gap-6 lg:grid-cols-2">
      <form
        class="flex flex-col gap-4 self-start rounded-box border border-base-content/10 bg-base-100 p-4"
        onsubmit={(event) => {
          event.preventDefault();
          filters.commit();
        }}
      >
        <label class="flex flex-col gap-1">
          <span class="text-xs text-base-content/50">Title contains</span>
          <input
            class="input w-full input-sm"
            placeholder="e.g. history"
            bind:value={filters.draft.q}
            data-testid="filter-q"
          />
        </label>

        <fieldset class="flex flex-col gap-1">
          <legend class="text-xs text-base-content/50">Genres</legend>
          <div class="flex flex-wrap gap-x-4 gap-y-1">
            {#each GENRES as genre (genre)}
              <label class="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  class="checkbox checkbox-sm"
                  value={genre}
                  bind:group={filters.draft.genres}
                />
                {genre}
              </label>
            {/each}
          </div>
        </fieldset>

        <label class="flex flex-col gap-1">
          <span class="text-xs text-base-content/50">Published since</span>
          <input
            type="number"
            class="input w-32 input-sm"
            placeholder="any year"
            bind:value={filters.draft.since}
            data-testid="filter-since"
          />
        </label>

        <div class="flex flex-wrap items-center gap-2">
          <button class="btn btn-primary btn-sm" disabled={!filters.isDirty} data-testid="apply">
            Apply
          </button>
          <button
            type="button"
            class="btn btn-sm"
            disabled={!filters.isDirty}
            onclick={filters.revert}
            data-testid="revert"
          >
            Revert
          </button>
          <button
            type="button"
            class="btn btn-ghost btn-sm"
            onclick={filters.reset}
            data-testid="clear"
          >
            Clear
          </button>
        </div>
      </form>

      <div class="flex flex-col gap-3">
        <ul class="flex flex-col divide-y divide-base-content/10" data-testid="results">
          {#each visible as book (book.title)}
            <li class="flex items-baseline justify-between gap-3 py-2">
              <span class="font-medium" data-testid="result">{book.title}</span>
              <span class="text-xs text-base-content/50">{book.genre} · {book.year}</span>
            </li>
          {:else}
            <li class="py-2 text-sm text-base-content/50">Nothing on this page.</li>
          {/each}
        </ul>
        <div class="flex items-center gap-2 text-sm">
          <button
            type="button"
            class="btn btn-square btn-sm"
            aria-label="Previous page"
            disabled={filters.committed.page <= 1}
            onclick={() => turnPage(-1)}
            data-testid="page-prev"
          >
            <svg
              viewBox="0 0 24 24"
              class="size-4"
              fill="none"
              stroke="currentColor"
              stroke-width="2"><path d="m15 18-6-6 6-6" /></svg
            >
          </button>
          <span data-testid="page-number">Page {filters.committed.page} of {pageCount}</span>
          <button
            type="button"
            class="btn btn-square btn-sm"
            aria-label="Next page"
            disabled={filters.committed.page >= pageCount}
            onclick={() => turnPage(1)}
            data-testid="page-next"
          >
            <svg
              viewBox="0 0 24 24"
              class="size-4"
              fill="none"
              stroke="currentColor"
              stroke-width="2"><path d="m9 18 6-6-6-6" /></svg
            >
          </button>
          <span class="text-base-content/50">{matches.length} matching</span>
        </div>
      </div>
    </div>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
      Draft, committed, key
    </h2>
    <div class="flex flex-wrap items-center gap-3">
      <span
        class={["badge badge-soft", filters.isDirty ? "badge-warning" : "badge-success"]}
        data-testid="dirty"
      >
        {filters.isDirty ? "draft differs from committed" : "draft matches committed"}
      </span>
      <code class="text-xs break-all" data-testid="url">URL: {query || "(no query string)"}</code>
    </div>
    <div class="grid gap-4 md:grid-cols-3">
      {@render pane("draft", show(filters.draft), "draft")}
      {@render pane("committed", show(filters.committed), "committed")}
      {@render pane("key()", JSON.stringify(filters.key()), "key")}
    </div>
    <p class="max-w-2xl text-sm text-base-content/70">
      <code class="kbd kbd-sm">key()</code> is the committed state normalized and serialized:
      defaults, empty values and anything invalid are dropped, so two URLs that mean the same thing
      share one key. The same comparison decides whether a URL change is worth syncing in — add an
      unrelated
      <code class="kbd kbd-sm">?tab=</code> or reorder the params and the draft above keeps its edits.
    </p>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
      Search as you type
    </h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      A second state on the same page, owning only <code class="kbd kbd-sm">?find=</code>. Every
      keystroke commits, and <code class="kbd kbd-sm">replace: true</code> rewrites the current history
      entry instead of pushing one per letter, so the back button leaves the page rather than deleting
      the search a character at a time. The filters above keep their params: each state writes only the
      params it owns.
    </p>
    <div class="flex flex-col gap-3 rounded-box border border-base-content/10 bg-base-100 p-4">
      <label class="flex flex-col gap-1">
        <span class="text-xs text-base-content/50">Find a colour</span>
        <input
          class="input w-64 input-sm"
          placeholder="e.g. ma"
          value={search.draft.find}
          oninput={(event) => {
            const find = event.currentTarget.value;
            search.update((state) => ({ ...state, find }));
          }}
          data-testid="find"
        />
      </label>
      <ul class="flex flex-wrap gap-2" data-testid="found">
        {#each found as color (color)}
          <li class="badge badge-outline">{color}</li>
        {:else}
          <li class="text-sm text-base-content/50">No colour matches.</li>
        {/each}
      </ul>
    </div>
    <p class="max-w-2xl text-sm text-base-content/70">
      <code class="kbd kbd-sm">replace</code> also takes a function of the previous and next owned
      params, for a state that should replace while one field is being typed and push for everything
      else. <code class="kbd kbd-sm">changedParams</code> names the params that differ:
    </p>
    <pre class="overflow-x-auto rounded-box bg-base-200 p-4 text-xs leading-relaxed"><code
        >{TYPING}</code
      ></pre>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
      Feeding a query layer
    </h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      The library carries no cache and no fetching. An app that uses TanStack Query puts
      <code class="kbd kbd-sm">key()</code> in the <code class="kbd kbd-sm">queryKey</code>: the
      query refetches when the committed state changes meaningfully and never while the draft is
      being edited.
    </p>
    <pre class="overflow-x-auto rounded-box bg-base-200 p-4 text-xs leading-relaxed"><code
        >{TANSTACK}</code
      ></pre>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
      Param handlers
    </h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      A hand-edited or stale URL never breaks the page: a value a handler cannot read falls back to
      the field's default, and a value equal to the default is left out of the URL.
    </p>
    <div class="overflow-x-auto rounded-box border border-base-content/10">
      <table class="table table-sm">
        <thead>
          <tr><th scope="col">Handler</th><th scope="col">URL</th><th scope="col">Reads as</th></tr>
        </thead>
        <tbody>
          {#each HANDLERS as row (row.handler + row.url)}
            <tr>
              <td class="font-mono text-xs whitespace-nowrap">{row.handler}</td>
              <td class="font-mono text-xs whitespace-nowrap">{row.url}</td>
              <td class="font-mono text-xs">{row.reads}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">Wiring</h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      Call <code class="kbd kbd-sm">createUrlState</code> while a component initializes: it listens to
      the URL through an effect. That effect only runs in the browser, so a server-rendered or prerendered
      page — this one included — renders the defaults and picks the URL up once it hydrates.
    </p>
    <pre class="overflow-x-auto rounded-box bg-base-200 p-4 text-xs leading-relaxed"><code
        >{WIRING}</code
      ></pre>
  </section>
</main>
