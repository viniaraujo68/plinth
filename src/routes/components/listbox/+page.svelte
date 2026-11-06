<script lang="ts">
  import Dropdown from "$lib/components/Dropdown.svelte";
  import Listbox from "$lib/components/Listbox.svelte";
  import type { SelectOption } from "$lib/components/select.js";

  const STATUSES: readonly SelectOption[] = [
    { value: "draft", label: "Draft" },
    { value: "review", label: "In review" },
    { value: "scheduled", label: "Scheduled" },
    { value: "published", label: "Published" },
    { value: "archived", label: "Archived (read only)", disabled: true },
  ];

  interface Supplier extends SelectOption {
    taxId: string;
  }

  const SUPPLIERS: readonly Supplier[] = [
    { value: "acme", label: "Acme Industrial", taxId: "12.345.678/0001-99" },
    { value: "globex", label: "Globex Logística", taxId: "98.765.432/0001-55" },
    { value: "initech", label: "Initech Serviços", taxId: "11.222.333/0001-81" },
    { value: "umbrella", label: "Umbrella Química", taxId: "44.555.666/0001-12" },
    { value: "soylent", label: "Soylent Alimentos", taxId: "77.888.999/0001-40" },
    { value: "stark", label: "Stark Engenharia", taxId: "22.333.444/0001-07" },
  ];

  const WEEKDAYS: readonly SelectOption[] = [
    { value: "mon", label: "Monday" },
    { value: "tue", label: "Tuesday" },
    { value: "wed", label: "Wednesday" },
    { value: "thu", label: "Thursday" },
    { value: "fri", label: "Friday" },
    { value: "sat", label: "Saturday" },
    { value: "sun", label: "Sunday" },
  ];

  const ACTIONS: readonly SelectOption[] = [
    { value: "duplicate", label: "Duplicate" },
    { value: "move", label: "Move to…" },
    { value: "export", label: "Export as CSV" },
    { value: "delete", label: "Delete" },
  ];

  let status = $state<string | null>("review");
  let supplier = $state<string | null>(null);
  let weekdays = $state<string[]>(["mon", "wed"]);
  let lastAction = $state("—");

  let actions = $state<ReturnType<typeof Dropdown>>();

  const digits = (text: string) => text.replace(/\D/g, "");
</script>

<main class="mx-auto flex w-full max-w-4xl flex-col gap-12 p-6 sm:p-10">
  <header class="flex flex-col gap-3">
    <h1 class="text-3xl font-semibold tracking-tight">Listbox</h1>
    <p class="max-w-2xl text-base-content/70">
      A list to pick from in place, with no trigger and no panel of its own: click a row, or walk it
      with the arrows, Home and End or the first letters of a label, and pick with Enter or Space.
      The focus stays on the list, or on its search box, and the highlighted row is pointed at with
      <code class="kbd kbd-sm">aria-activedescendant</code>.
    </p>
  </header>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">One pick</h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      <code class="kbd kbd-sm">value</code> checks a row, and the highlight starts on it. Type
      <code class="kbd kbd-sm">p</code> to jump to Published; a disabled row stays readable and is stepped
      over.
    </p>
    <div class="flex flex-wrap items-start gap-6">
      <Listbox
        options={STATUSES}
        value={status}
        onpick={(row) => (status = row.value)}
        aria-label="Status"
        class="w-64 rounded-box border border-base-content/10 bg-base-100"
      />
      <span class="text-sm text-base-content/70">
        Status <span class="badge badge-soft badge-sm" data-testid="status-value">{status}</span>
      </span>
    </div>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">Search</h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      <code class="kbd kbd-sm">searchable</code> puts a search box over the list. It folds case and
      accents, and a row matches when it holds every word typed, in any order.
      <code class="kbd kbd-sm">searchText</code> decides what it reads, so here a supplier is also found
      by its tax id typed without punctuation.
    </p>
    <div class="flex flex-wrap items-start gap-6">
      <Listbox
        options={SUPPLIERS}
        value={supplier}
        onpick={(row) => (supplier = row.value)}
        searchable
        searchText={(row) => `${row.label} ${row.taxId} ${digits(row.taxId)}`}
        searchPlaceholder="Name or tax id"
        aria-label="Supplier"
        class="w-80 rounded-box border border-base-content/10 bg-base-100 p-1"
      >
        {#snippet option(row)}
          <span class="flex flex-col">
            <span>{row.label}</span>
            <span class="font-mono text-xs text-base-content/60">{row.taxId}</span>
          </span>
        {/snippet}
      </Listbox>
      <span class="text-sm text-base-content/70">
        Supplier <span class="badge badge-soft badge-sm" data-testid="supplier-value"
          >{supplier ?? "none"}</span
        >
      </span>
    </div>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
      Several at once
    </h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      An array <code class="kbd kbd-sm">value</code> checks every row it names and marks the list multi-selectable.
      Picking a row is the caller's to read as a check or an uncheck, and the highlight stays where it
      was.
    </p>
    <div class="flex flex-wrap items-start gap-6">
      <Listbox
        options={WEEKDAYS}
        value={weekdays}
        onpick={(row) =>
          (weekdays = weekdays.includes(row.value)
            ? weekdays.filter((day) => day !== row.value)
            : [...weekdays, row.value])}
        aria-label="Weekdays"
        class="w-64 rounded-box border border-base-content/10 bg-base-100"
      />
      <span class="text-sm text-base-content/70">
        Days <span class="badge badge-soft badge-sm" data-testid="weekdays-value"
          >{weekdays.join(", ") || "none"}</span
        >
      </span>
    </div>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
      Inside a Dropdown
    </h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      With <code class="kbd kbd-sm">autofocus</code>, the list takes the focus as the panel opens,
      from a click or from the keyboard, and the arrows work straight away. Without check marks it
      reads as a menu of actions rather than a choice.
    </p>
    <div class="flex flex-wrap items-center gap-4">
      <Dropdown
        bind:this={actions}
        class="btn btn-sm"
        panelClass="w-56 rounded-box border border-base-content/10 bg-base-100 shadow-lg"
      >
        Actions
        {#snippet content()}
          <Listbox
            options={ACTIONS}
            onpick={(row) => {
              lastAction = row.label;
              actions?.close();
            }}
            checkmarks={false}
            autofocus
            aria-label="Actions"
          />
        {/snippet}
      </Dropdown>
      <span class="text-sm text-base-content/70">
        Last action <span class="badge badge-soft badge-sm" data-testid="last-action"
          >{lastAction}</span
        >
      </span>
    </div>
  </section>
</main>
