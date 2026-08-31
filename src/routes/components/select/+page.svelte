<script lang="ts">
  import { onMount } from "svelte";
  import { resolve } from "$app/paths";
  import Modal from "$lib/components/Modal.svelte";
  import Select from "$lib/components/Select.svelte";
  import { normalizeForSearch, type SelectOption } from "$lib/components/select.js";

  // Four: under the threshold, so the panel stays a plain list.
  const SIZES: readonly SelectOption[] = [
    { value: "s", label: "Small" },
    { value: "m", label: "Medium" },
    { value: "l", label: "Large" },
    { value: "xl", label: "Extra large" },
  ];

  // Eleven, and accented: the filter this component was written for. Typing `otavio` has to find
  // `Otávio Rocha`, which is the one thing a native select cannot do.
  const LOCALS: readonly SelectOption[] = [
    { value: "araras", label: "Araras" },
    { value: "bingen", label: "Bingen" },
    { value: "castelanea", label: "Castelânea" },
    { value: "centro", label: "Centro" },
    { value: "correas", label: "Corrêas" },
    { value: "itaipava", label: "Itaipava" },
    { value: "mosela", label: "Mosela" },
    { value: "nogueira", label: "Nogueira" },
    { value: "otavio-rocha", label: "Otávio Rocha" },
    { value: "quitandinha", label: "Quitandinha" },
    { value: "sao-goncalo", label: "São Gonçalo" },
  ];

  const OPEN_ITEMS = new Map([
    ["araras", 3],
    ["bingen", 0],
    ["castelanea", 12],
    ["centro", 41],
    ["correas", 7],
    ["itaipava", 18],
    ["mosela", 2],
    ["nogueira", 5],
    ["otavio-rocha", 9],
    ["quitandinha", 26],
    ["sao-goncalo", 1],
  ]);

  const AIRPORTS: readonly SelectOption[] = [
    { value: "GIG", label: "Rio de Janeiro — Galeão" },
    { value: "SDU", label: "Rio de Janeiro — Santos Dumont" },
    { value: "CGH", label: "São Paulo — Congonhas" },
    { value: "GRU", label: "São Paulo — Guarulhos" },
    { value: "BSB", label: "Brasília" },
    { value: "CNF", label: "Belo Horizonte — Confins" },
    { value: "POA", label: "Porto Alegre" },
    { value: "REC", label: "Recife" },
    { value: "SSA", label: "Salvador" },
    { value: "FOR", label: "Fortaleza" },
  ];

  const SHIPPING: readonly SelectOption[] = [
    { value: "standard", label: "Standard — 5 to 7 days" },
    { value: "express", label: "Express — 2 days" },
    { value: "overnight", label: "Overnight (not available for this address)", disabled: true },
    { value: "pickup", label: "Collect in store" },
    { value: "freight", label: "Freight (weight over 30 kg only)", disabled: true },
  ];

  // The escape hatch: a code list is searched by its code as well as its name, which the default
  // matcher deliberately does not do -- a value is an identifier, not something a user reads.
  const byCodeOrCity = (option: SelectOption, query: string) => {
    const needle = normalizeForSearch(query);

    return (
      normalizeForSearch(option.label).includes(needle) ||
      normalizeForSearch(option.value).includes(needle)
    );
  };

  let size = $state<string | null>("m");
  let local = $state<string | null>(null);
  let busiest = $state<string | null>("centro");
  let airport = $state<string | null>(null);
  let shipping = $state<string | null>(null);
  let modalLocal = $state<string | null>("itaipava");

  let filters = $state<Modal>();

  // This page is prerendered, so the opener exists in the HTML before there is a modal to open.
  // Disabling it until hydration turns a click in that gap into a wait rather than into nothing.
  let ready = $state(false);
  onMount(() => {
    ready = true;
  });
</script>

<main class="mx-auto flex w-full max-w-4xl flex-col gap-12 p-6 sm:p-10">
  <header class="flex flex-col gap-3">
    <h1 class="text-3xl font-semibold tracking-tight">Select</h1>
    <p class="max-w-2xl text-base-content/70">
      A single-select combobox for the list a native <code class="kbd kbd-sm">&lt;select&gt;</code>
      stops being usable on. Native type-ahead only matches a prefix and resets after a second, so an
      eleven-item filter is genuinely hard to get through; this one searches substrings, ignores accents,
      and grows the search field by itself once the list is long enough to need it.
    </p>
    <p class="max-w-2xl text-base-content/70">
      The panel is a native popover, so it lives in the top layer — above a
      <a class="link" href={resolve("/components/modal")}>Modal</a>, out of every overflow and
      stacking context, with no z-index anywhere — and the browser owns dismissing it.
    </p>
  </header>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
      Short list — no search
    </h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      Four options are faster to point at than to type at, so no field is rendered. The threshold is
      eight, and <code class="kbd kbd-sm">searchable</code> overrules it either way.
    </p>
    <div class="flex flex-col gap-1.5">
      <span id="size-label" class="label text-xs">Size</span>
      <Select
        bind:value={size}
        options={SIZES}
        aria-labelledby="size-label"
        data-testid="size"
        class="max-w-xs"
      />
    </div>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
      Long list — search and clear
    </h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      Eleven options, so the field appears on its own. Type <code class="kbd kbd-sm">otavio</code>
      or <code class="kbd kbd-sm">sao</code> — unaccented input finds the accented label, because the
      default matcher folds both sides to their base letters. Clearing is the ✕, never a blank row in
      the list.
    </p>
    <div class="flex flex-col gap-1.5">
      <span id="local-label" class="label text-xs">Local</span>
      <Select
        bind:value={local}
        options={LOCALS}
        aria-labelledby="local-label"
        data-testid="local"
        placeholder="Every local"
        searchPlaceholder="Search locals"
        emptyLabel="No local by that name"
        clearable
        class="max-w-xs"
      />
      <p class="text-sm text-base-content/70">
        Selected <span class="badge badge-soft badge-sm" data-testid="local-value"
          >{local ?? "none"}</span
        >
      </p>
    </div>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
      Custom rows
    </h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      The <code class="kbd kbd-sm">option</code> snippet describes a row and only a row: the trigger keeps
      showing the plain label, and searching keeps reading it, so a decorated list stays searchable.
    </p>
    <div class="flex flex-col gap-1.5">
      <span id="busiest-label" class="label text-xs">Busiest local</span>
      <Select
        bind:value={busiest}
        options={LOCALS}
        aria-labelledby="busiest-label"
        data-testid="busiest"
        class="max-w-xs"
      >
        {#snippet option(row)}
          <span class="flex w-full items-center justify-between gap-3">
            <span class="truncate">{row.label}</span>
            <span class="badge badge-ghost badge-sm">{OPEN_ITEMS.get(row.value) ?? 0}</span>
          </span>
        {/snippet}
      </Select>
    </div>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
      Custom filter
    </h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      The default searches the label, because the value is an identifier and not something a person
      reads. When it happens to be both — an airport code — <code class="kbd kbd-sm">filter</code>
      is the escape hatch. Try <code class="kbd kbd-sm">gig</code> and then
      <code class="kbd kbd-sm">rio</code>.
    </p>
    <div class="flex flex-col gap-1.5">
      <span id="airport-label" class="label text-xs">Airport</span>
      <Select
        bind:value={airport}
        options={AIRPORTS}
        filter={byCodeOrCity}
        aria-labelledby="airport-label"
        data-testid="airport"
        placeholder="Any airport"
        searchPlaceholder="Code or city"
        clearable
        class="max-w-sm"
      />
    </div>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
      Disabled — the control and the rows
    </h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      A disabled option stays visible and stays legible, so the reason it is out of reach can be
      written into its own label. The keyboard steps over it, and so does the mouse highlight.
    </p>
    <div class="flex flex-wrap items-end gap-6">
      <div class="flex flex-col gap-1.5">
        <span id="shipping-label" class="label text-xs">Shipping</span>
        <Select
          bind:value={shipping}
          options={SHIPPING}
          aria-labelledby="shipping-label"
          data-testid="shipping"
          placeholder="Choose a method"
          class="w-72"
        />
      </div>

      <div class="flex flex-col gap-1.5">
        <span id="locked-label" class="label text-xs">Region (locked)</span>
        <Select
          options={SIZES}
          value="m"
          disabled
          aria-labelledby="locked-label"
          data-testid="locked"
          class="w-48"
        />
      </div>
    </div>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
      Inside a modal
    </h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      The case a hand-rolled dropdown gets wrong. A modal
      <code class="kbd kbd-sm">&lt;dialog&gt;</code> is itself in the top layer and makes the rest of
      the page inert, so a panel positioned with a z-index ends up under the backdrop. A popover joins
      the top layer above it, and its search field keeps the focus.
    </p>
    <div class="flex flex-wrap items-center gap-4">
      <button
        type="button"
        class="btn btn-primary btn-sm"
        data-testid="open-filters"
        disabled={!ready}
        onclick={() => filters?.show()}
      >
        Open filters
      </button>
      <span class="text-sm text-base-content/70">
        Chosen <span class="badge badge-soft badge-sm" data-testid="modal-value"
          >{modalLocal ?? "none"}</span
        >
      </span>
    </div>
  </section>
</main>

<Modal bind:this={filters} title="Filters" class="max-w-md">
  <div class="flex flex-col gap-1.5">
    <span id="modal-local-label" class="label text-xs">Local</span>
    <Select
      bind:value={modalLocal}
      options={LOCALS}
      aria-labelledby="modal-local-label"
      data-testid="modal-local"
      placeholder="Every local"
      clearable
    />
  </div>

  <p class="mt-4 text-sm text-base-content/60">
    The panel opens over the backdrop, not under it, and Escape closes the panel first and the modal
    second.
  </p>

  {#snippet footer()}
    <button type="button" class="btn btn-sm" onclick={() => filters?.close()}>Done</button>
  {/snippet}
</Modal>
