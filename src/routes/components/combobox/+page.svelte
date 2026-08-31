<script lang="ts">
  import { onMount } from "svelte";
  import { resolve } from "$app/paths";
  import Combobox from "$lib/components/Combobox.svelte";
  import Modal from "$lib/components/Modal.svelte";
  import { normalizeForSearch, type SelectOption } from "$lib/components/select.js";

  // Fifty-two, accented, and in no order anyone can guess: the list this control exists for. A
  // native `<select>` here is a scroll and a prefix-only type-ahead that resets after a second.
  const CITIES: readonly SelectOption[] = [
    { value: "angra-dos-reis", label: "Angra dos Reis" },
    { value: "aparecida", label: "Aparecida" },
    { value: "araruama", label: "Araruama" },
    { value: "armacao-dos-buzios", label: "Armação dos Búzios" },
    { value: "barra-mansa", label: "Barra Mansa" },
    { value: "belo-horizonte", label: "Belo Horizonte" },
    { value: "blumenau", label: "Blumenau" },
    { value: "brasilia", label: "Brasília" },
    { value: "cabo-frio", label: "Cabo Frio" },
    { value: "campinas", label: "Campinas" },
    { value: "campos-do-jordao", label: "Campos do Jordão" },
    { value: "caxias-do-sul", label: "Caxias do Sul" },
    { value: "chapeco", label: "Chapecó" },
    { value: "criciuma", label: "Criciúma" },
    { value: "cuiaba", label: "Cuiabá" },
    { value: "curitiba", label: "Curitiba" },
    { value: "diamantina", label: "Diamantina" },
    { value: "florianopolis", label: "Florianópolis" },
    { value: "fortaleza", label: "Fortaleza" },
    { value: "foz-do-iguacu", label: "Foz do Iguaçu" },
    { value: "goiania", label: "Goiânia" },
    { value: "gramado", label: "Gramado" },
    { value: "ilheus", label: "Ilhéus" },
    { value: "itajai", label: "Itajaí" },
    { value: "jericoacoara", label: "Jericoacoara" },
    { value: "joao-pessoa", label: "João Pessoa" },
    { value: "joinville", label: "Joinville" },
    { value: "juiz-de-fora", label: "Juiz de Fora" },
    { value: "londrina", label: "Londrina" },
    { value: "macae", label: "Macaé" },
    { value: "maceio", label: "Maceió" },
    { value: "manaus", label: "Manaus" },
    { value: "maringa", label: "Maringá" },
    { value: "natal", label: "Natal" },
    { value: "niteroi", label: "Niterói" },
    { value: "nova-friburgo", label: "Nova Friburgo" },
    { value: "olinda", label: "Olinda" },
    { value: "ouro-preto", label: "Ouro Preto" },
    { value: "paraty", label: "Paraty" },
    { value: "petropolis", label: "Petrópolis" },
    { value: "porto-alegre", label: "Porto Alegre" },
    { value: "porto-seguro", label: "Porto Seguro" },
    { value: "recife", label: "Recife" },
    { value: "ribeirao-preto", label: "Ribeirão Preto" },
    { value: "rio-de-janeiro", label: "Rio de Janeiro" },
    { value: "salvador", label: "Salvador" },
    { value: "santos", label: "Santos" },
    { value: "sao-luis", label: "São Luís" },
    { value: "sao-paulo", label: "São Paulo" },
    { value: "teresopolis", label: "Teresópolis" },
    { value: "uberlandia", label: "Uberlândia" },
    { value: "vitoria", label: "Vitória" },
  ];

  const AIRPORTS: readonly SelectOption[] = [
    { value: "GIG", label: "Rio de Janeiro — Galeão" },
    { value: "SDU", label: "Rio de Janeiro — Santos Dumont" },
    { value: "CGH", label: "São Paulo — Congonhas" },
    { value: "GRU", label: "São Paulo — Guarulhos" },
    { value: "VCP", label: "Campinas — Viracopos" },
    { value: "BSB", label: "Brasília" },
    { value: "CNF", label: "Belo Horizonte — Confins" },
    { value: "CWB", label: "Curitiba" },
    { value: "FLN", label: "Florianópolis" },
    { value: "POA", label: "Porto Alegre" },
    { value: "REC", label: "Recife" },
    { value: "SSA", label: "Salvador" },
    { value: "FOR", label: "Fortaleza" },
    { value: "NAT", label: "Natal" },
    { value: "BEL", label: "Belém" },
    { value: "MAO", label: "Manaus" },
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

  // Stands in for whatever an app would already have alongside its options -- a count, a status,
  // a price. Derived from the label so the page needs no fixture: the point is the row, not the
  // number in it.
  const ROUTES = new Map(CITIES.map((city) => [city.value, 2 + (city.label.length % 9)]));

  const COURIERS: readonly SelectOption[] = [
    { value: "standard", label: "Standard — 5 to 7 days" },
    { value: "express", label: "Express — 2 days" },
    { value: "overnight", label: "Overnight (not available for this address)", disabled: true },
    { value: "pickup", label: "Collect in store" },
    { value: "freight", label: "Freight (weight over 30 kg only)", disabled: true },
  ];

  let city = $state<string | null>("petropolis");
  let airport = $state<string | null>(null);
  let origin = $state<string | null>(null);
  let courier = $state<string | null>(null);
  let modalCity = $state<string | null>("teresopolis");

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
    <h1 class="text-3xl font-semibold tracking-tight">Combobox</h1>
    <p class="max-w-2xl text-base-content/70">
      A single-select control whose bar <em>is</em> the search field. Click it and type: there is no second
      field inside the panel and no threshold to cross, because a list this long is never going to be
      pointed at.
    </p>
    <p class="max-w-2xl text-base-content/70">
      Searching folds accents and matches anywhere in the label — <code class="kbd kbd-sm"
        >otavio</code
      >
      finds <code class="kbd kbd-sm">Otávio</code>, <code class="kbd kbd-sm">polis</code> finds
      <code class="kbd kbd-sm">Petrópolis</code> — which is the pair of things native type-ahead
      cannot do. For a list short enough to read at a glance,
      <a class="link" href={resolve("/components/select")}>Select</a> is the plainer control.
    </p>
    <p class="max-w-2xl text-base-content/70">
      The panel is a native popover, so it lives in the top layer — above a
      <a class="link" href={resolve("/components/modal")}>Modal</a>, out of every overflow and
      stacking context, with no z-index anywhere.
    </p>
  </header>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
      The bar is the field
    </h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      Fifty-two cities. Clicking the bar opens the list and selects whatever text is in it, so the
      first keystroke replaces it rather than appending to it. Escape, Tab, a click outside or
      simply leaving all put the selected label back — a control that claims to hold Petrópolis is
      never left showing <code class="kbd kbd-sm">petr</code>. Emptying it and leaving reverts too:
      clearing is the ✕, and only the ✕.
    </p>
    <div class="flex flex-col gap-1.5">
      <span id="city-label" class="label text-xs">Destination</span>
      <Combobox
        bind:value={city}
        options={CITIES}
        aria-labelledby="city-label"
        data-testid="city"
        placeholder="Search cities"
        emptyLabel="No city by that name"
        clearable
        class="max-w-sm"
      />
      <p class="text-sm text-base-content/70">
        Selected <span class="badge badge-soft badge-sm" data-testid="city-value"
          >{city ?? "none"}</span
        >
      </p>
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
      <Combobox
        bind:value={airport}
        options={AIRPORTS}
        filter={byCodeOrCity}
        aria-labelledby="airport-label"
        data-testid="airport"
        placeholder="Code or city"
        clearable
        class="max-w-sm"
      />
    </div>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
      Custom rows
    </h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      The <code class="kbd kbd-sm">option</code> snippet describes a row and only a row: the bar keeps
      holding the plain label, and the search keeps reading it, so a decorated list stays searchable.
    </p>
    <div class="flex flex-col gap-1.5">
      <span id="origin-label" class="label text-xs">Origin</span>
      <Combobox
        bind:value={origin}
        options={CITIES}
        aria-labelledby="origin-label"
        data-testid="origin"
        placeholder="Search cities"
        class="max-w-sm"
      >
        {#snippet option(row)}
          <span class="flex w-full items-center justify-between gap-3">
            <span class="truncate">{row.label}</span>
            <span class="badge badge-ghost badge-sm">{ROUTES.get(row.value)} routes</span>
          </span>
        {/snippet}
      </Combobox>
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
        <span id="courier-label" class="label text-xs">Courier</span>
        <Combobox
          bind:value={courier}
          options={COURIERS}
          aria-labelledby="courier-label"
          data-testid="courier"
          placeholder="Search methods"
          class="w-72"
        />
      </div>

      <div class="flex flex-col gap-1.5">
        <span id="locked-label" class="label text-xs">Hub (locked)</span>
        <Combobox
          options={AIRPORTS}
          value="GIG"
          disabled
          aria-labelledby="locked-label"
          data-testid="locked"
          class="w-64"
        />
      </div>
    </div>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
      Inside a modal
    </h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      A modal <code class="kbd kbd-sm">&lt;dialog&gt;</code> is itself in the top layer and makes the
      rest of the page inert, so a panel positioned with a z-index ends up under the backdrop. A popover
      joins the top layer above it, the field keeps the keyboard, and the first Escape is spent on the
      list rather than on the dialog.
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
          >{modalCity ?? "none"}</span
        >
      </span>
    </div>
  </section>
</main>

<Modal bind:this={filters} title="Filters" class="max-w-md">
  <div class="flex flex-col gap-1.5">
    <span id="modal-city-label" class="label text-xs">Destination</span>
    <Combobox
      bind:value={modalCity}
      options={CITIES}
      aria-labelledby="modal-city-label"
      data-testid="modal-city"
      placeholder="Search cities"
      clearable
    />
  </div>

  <p class="mt-4 text-sm text-base-content/60">
    The list opens over the backdrop, not under it, and Escape closes the list first and the modal
    second.
  </p>

  {#snippet footer()}
    <button type="button" class="btn btn-sm" onclick={() => filters?.close()}>Done</button>
  {/snippet}
</Modal>
