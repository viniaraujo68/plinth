<script lang="ts">
  import JsonView from "$lib/components/JsonView.svelte";
  import VirtualJsonView from "$lib/components/VirtualJsonView.svelte";
  import SegmentedControl from "$lib/components/SegmentedControl.svelte";

  type Size = "50" | "1000" | "10000";
  type Depth = "none" | "0" | "1" | "2" | "3";

  const SIZES = [
    { id: "50", label: "50" },
    { id: "1000", label: "1,000" },
    { id: "10000", label: "10,000" },
  ] as const;

  const DEPTHS = [
    { id: "none", label: "None" },
    { id: "0", label: "0" },
    { id: "1", label: "1" },
    { id: "2", label: "2" },
    { id: "3", label: "3" },
  ] as const;

  const CARRIERS = [
    "Northwind Freight",
    "Blue Heron Post",
    "Granite Logistics",
    "Saltmarsh Couriers",
  ];
  const STATUSES = ["label_created", "in_transit", "out_for_delivery", "delivered", "held"];
  const CITIES = [
    { city: "Porto", country: "PT" },
    { city: "Ghent", country: "BE" },
    { city: "Tampere", country: "FI" },
    { city: "Valencia", country: "ES" },
    { city: "Leipzig", country: "DE" },
  ];
  const NAMES = ["Ines Varela", "Tomas Brandt", "Aino Lehto", "Marta Sol", "Pieter Claes"];
  const PRODUCTS = [
    { sku: "TEA-001", name: "Smoked oolong, 100 g", unitPrice: 9.5 },
    { sku: "MUG-014", name: "Stoneware mug, slate glaze", unitPrice: 18 },
    { sku: "KTL-203", name: "Gooseneck kettle", unitPrice: 64.9 },
    { sku: "FLT-310", name: "Paper filters, pack of 100", unitPrice: 4.25 },
  ];

  const countNodes = (value: unknown): number => {
    if (Array.isArray(value))
      return 1 + value.reduce<number>((sum, item) => sum + countNodes(item), 0);
    if (value !== null && typeof value === "object")
      return 1 + Object.values(value).reduce<number>((sum, item) => sum + countNodes(item), 0);
    return 1;
  };

  const shipment = (index: number, revision: number) => {
    const pick = <T,>(list: readonly T[], salt: number) =>
      list[(index * 7 + salt * 3) % list.length];
    const place = pick(CITIES, 1);
    const parcels = Array.from({ length: 1 + (index % 3) }, (_, position) => {
      const product = PRODUCTS[(index + position) % PRODUCTS.length];
      return { sku: product.sku, name: product.name, qty: 1 + ((index + position) % 4) };
    });
    return {
      id: `SHP-${String(10240 + index)}`,
      carrier: pick(CARRIERS, 2),
      status: STATUSES[(index + revision) % STATUSES.length],
      createdAt: new Date(Date.UTC(2026, 9, 1 + (index % 28), 8 + (index % 10))).toISOString(),
      weightKg: Math.round((0.4 + (index % 9) * 0.35) * 100) / 100,
      insured: index % 4 === 0,
      recipient: { name: pick(NAMES, 4), city: place.city, country: place.country },
      parcels,
      trackingUrl:
        index % 5 === 0 ? null : `https://tracking.example.test/${String(10240 + index)}`,
    };
  };

  const buildDocument = (target: number, revision: number) => {
    const payload = {
      export: {
        id: "exp-2026-11-10-eu",
        generatedAt: "2026-11-10T09:30:00.000Z",
        revision,
        warehouse: { code: "LIS-02", name: "Lisbon riverside", dock: 4 },
      },
      totals: { shipments: 0, parcels: 0 },
      shipments: [] as ReturnType<typeof shipment>[],
    };
    let nodes = countNodes(payload);
    while (nodes < target) {
      const next = shipment(payload.shipments.length, revision);
      payload.shipments.push(next);
      payload.totals.parcels += next.parcels.length;
      nodes += countNodes(next);
    }
    payload.totals.shipments = payload.shipments.length;
    return payload;
  };

  let size = $state<Size>("50");
  let depth = $state<Depth>("2");
  let revision = $state(1);
  let renderer = $state<"all" | "virtual">("all");
  let selected = $state<{ path: string; value: unknown }>();

  const shipments = $derived(buildDocument(Number(size), revision));
  const nodeCount = $derived(countNodes(shipments));
  const collapseDepth = $derived(depth === "none" ? undefined : Number(depth));

  const ROOM = {
    name: "Studio B",
    bookedAt: new Date("2026-11-12T14:00:00.000Z"),
    seats: new Set(["A1", "A2"]),
    rates: new Map([["hour", 30]]),
    attendees: 4n,
    notes: undefined,
    describe: () => "Studio B",
    parent: undefined as unknown,
  };
  const BUILDING = { name: "Harbour House", rooms: [ROOM] };
  ROOM.parent = BUILDING;
</script>

<main class="mx-auto flex w-full max-w-4xl flex-col gap-12 p-6 sm:p-10">
  <header class="flex flex-col gap-3">
    <h1 class="text-3xl font-semibold tracking-tight">JsonView</h1>
    <p class="max-w-2xl text-base-content/70">
      A read-only JSON viewer: syntax colours from the theme, folding per node, a search that sees
      inside folded content, and a copy that hands over the document rather than what the screen
      abbreviates. Copying everything gives exactly what
      <code class="kbd kbd-sm">JSON.stringify(value, null, 2)</code> prints.
    </p>
  </header>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
      A shipment export
    </h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      Click inside the viewer and press <kbd class="kbd kbd-sm">Ctrl</kbd> +
      <kbd class="kbd kbd-sm">F</kbd> to search its keys and values; Enter and Shift + Enter walk
      the matches and unfold whatever hides them. Refreshing the values keeps every fold where it
      was, since a node is known by its path. <code class="kbd kbd-sm">JsonView</code> renders every
      line, so the largest size shows what that costs once everything is expanded;
      <code class="kbd kbd-sm">VirtualJsonView</code> takes the same props and renders only the rows
      in view, through <code class="kbd kbd-sm">VirtualList</code>.
    </p>

    <div class="flex flex-wrap items-center gap-4">
      <SegmentedControl
        bind:value={size}
        options={SIZES}
        label="Document size"
        caption="Nodes:"
        size="sm"
      />
      <SegmentedControl
        bind:value={depth}
        options={DEPTHS}
        label="collapseDepth"
        caption="collapseDepth:"
        size="sm"
      />
      <SegmentedControl
        bind:value={renderer}
        options={[
          { id: "all", label: "JsonView" },
          { id: "virtual", label: "VirtualJsonView" },
        ]}
        label="Renderer"
        caption="Renderer:"
        size="sm"
      />
      <button
        type="button"
        class="btn btn-sm"
        data-testid="refresh"
        onclick={() => (revision += 1)}
      >
        Refresh values
      </button>
    </div>

    {#key `${depth}:${renderer}`}
      {#if renderer === "virtual"}
        <VirtualJsonView
          value={shipments}
          {collapseDepth}
          class="h-[28rem]"
          onselect={(path, value) => (selected = { path, value })}
        />
      {:else}
        <JsonView
          value={shipments}
          {collapseDepth}
          class="h-[28rem]"
          onselect={(path, value) => (selected = { path, value })}
        />
      {/if}
    {/key}

    <div class="flex flex-wrap gap-x-6 gap-y-1 text-sm text-base-content/70">
      <span>
        Nodes <span class="font-mono tabular-nums" data-testid="node-count">{nodeCount}</span>
      </span>
      <span>
        Selected
        <code class="font-mono" data-testid="selected-path">{selected?.path ?? "—"}</code>
      </span>
      {#if selected}
        <code class="max-w-full truncate font-mono text-xs" data-testid="selected-value"
          >{JSON.stringify(selected.value)}</code
        >
      {/if}
    </div>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
      Values JSON cannot hold
    </h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      The viewer shows what <code class="kbd kbd-sm">JSON.stringify</code> would write, so what is
      on screen is what gets copied. A <code class="kbd kbd-sm">Date</code> goes through its
      <code class="kbd kbd-sm">toJSON</code> and shows as an ISO string; a
      <code class="kbd kbd-sm">Set</code> and a <code class="kbd kbd-sm">Map</code> have no
      enumerable properties, so they show as <code class="kbd kbd-sm">{"{}"}</code>; undefined and
      functions are left out. Two things stringify would throw on are shown instead: a bigint as its
      digits, and a reference back to an ancestor as a marker.
    </p>
    <JsonView value={BUILDING} class="max-h-80" />
  </section>
</main>
