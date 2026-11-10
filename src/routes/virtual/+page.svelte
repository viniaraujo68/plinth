<script lang="ts">
  import { onMount } from "svelte";
  import SegmentedControl from "$lib/components/SegmentedControl.svelte";
  import {
    DataList,
    VirtualList,
    Virtualizer,
    WindowedData,
    type PageRequest,
    type WindowedPage,
  } from "$lib/virtual/index.js";

  const LEDGER_SIZE = 100_000;
  const ACCOUNTS = ["Northwind", "Bluebird", "Juniper", "Halcyon", "Meridian", "Quarry"];

  const ledgerEntry = (index: number) => ({
    id: index + 1,
    account: ACCOUNTS[index % ACCOUNTS.length],
    amount: ((index * 7919) % 100_000) / 100,
  });

  const ledger = new Virtualizer({ count: () => LEDGER_SIZE, estimateSize: 40 });
  let ledgerTarget = $state(50_000);

  interface Message {
    id: number;
    author: "Ada" | "Lin";
    text: string;
  }

  const WORDS =
    "the trail map shows a ridge path past the old quarry then down through pines to a lake where the ferry waits until dusk".split(
      " ",
    );

  const messageOf = (id: number): Message => ({
    id,
    author: Math.abs(id) % 3 === 0 ? "Lin" : "Ada",
    text: WORDS.slice(0, 3 + (Math.abs(id * 5) % 19)).join(" "),
  });

  const messagesBetween = (from: number, length: number) =>
    Array.from({ length }, (_, offset) => messageOf(from + offset));

  let messages = $state.raw<Message[]>(messagesBetween(1000, 200));
  let nextId = 1200;

  const chat = new Virtualizer({
    count: () => messages.length,
    estimateSize: 72,
    getItemKey: (index) => messages[index].id,
    anchorTo: "end",
    followOnAppend: true,
  });

  const loadOlder = () => {
    const oldest = messages[0]?.id ?? 0;
    const older = messagesBetween(oldest - 30, 30);
    messages = [...older, ...messages];
    chat.prepend(older.length);
  };

  const send = () => {
    messages = [...messages, messageOf(nextId++)];
  };

  onMount(() => chat.scrollToEnd());

  interface Shipment {
    code: string;
    destination: string;
    weight: number;
  }

  const DESTINATIONS = ["Port Aster", "Calder Bay", "Elmshore", "Fennick", "Grayhaven", "Ostrava"];
  const CATALOG_SIZE = 25_000;
  const LATENCY_MS = 600;

  let order = $state<"newest" | "oldest">("newest");
  let failSomePages = $state(false);

  const shipmentAt = (position: number): Shipment => {
    const index = order === "newest" ? CATALOG_SIZE - 1 - position : position;
    return {
      code: `SH-${String(index + 1).padStart(5, "0")}`,
      destination: DESTINATIONS[(index * 31) % DESTINATIONS.length],
      weight: 50 + ((index * 173) % 950),
    };
  };

  const fakeApi = ({ page, offset, limit, signal }: PageRequest) =>
    new Promise<WindowedPage<Shipment>>((resolve, reject) => {
      const failing = failSomePages && page % 3 === 1;
      const timer = setTimeout(() => {
        if (failing) {
          reject(new Error(`Page ${page} timed out`));
          return;
        }
        const length = Math.max(0, Math.min(limit, CATALOG_SIZE - offset));
        resolve({
          items: Array.from({ length }, (_, row) => shipmentAt(offset + row)),
          total: CATALOG_SIZE,
        });
      }, LATENCY_MS);
      signal.addEventListener("abort", () => {
        clearTimeout(timer);
        reject(signal.reason as Error);
      });
    });

  const shipments = new WindowedData<Shipment>({
    pageSize: 50,
    fetchPage: fakeApi,
    signature: () => order,
  });

  const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
  const number = new Intl.NumberFormat("en-US");
</script>

<main class="mx-auto flex w-full max-w-4xl flex-col gap-12 p-6 sm:p-10">
  <header class="flex flex-col gap-3">
    <h1 class="text-3xl font-semibold tracking-tight">Virtual</h1>
    <p class="max-w-2xl text-base-content/70">
      Long lists that only render what is on screen. A headless
      <code class="kbd kbd-sm">Virtualizer</code> turns a count and a scroll position into the slice
      to draw; <code class="kbd kbd-sm">VirtualList</code> is the default markup over it, and
      <code class="kbd kbd-sm">DataList</code> adds a rolling window of paged data from a server.
    </p>
    <p class="max-w-2xl text-base-content/70">
      Rows measure themselves, so they can differ in height. Offsets live in a Fenwick tree: a new
      measurement costs a logarithmic update instead of a pass over the whole list, which is what
      keeps a hundred thousand rows smooth.
    </p>
  </header>

  <section class="flex flex-col gap-4" data-testid="ledger">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
      100,000 rows
    </h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      The scroll height is the full list, the DOM is a couple of dozen rows. Jump anywhere with
      <code class="kbd kbd-sm">scrollToIndex</code>.
    </p>

    <form
      class="flex flex-wrap items-end gap-2"
      onsubmit={(event) => {
        event.preventDefault();
        ledger.scrollToIndex(ledgerTarget - 1, "center");
      }}
    >
      <label class="flex flex-col gap-1 text-sm">
        <span class="text-base-content/60">Row number</span>
        <input
          class="input w-36 input-sm"
          type="number"
          min="1"
          max={LEDGER_SIZE}
          bind:value={ledgerTarget}
          data-testid="ledger-target"
        />
      </label>
      <button type="submit" class="btn btn-sm">Jump to row</button>
    </form>

    <VirtualList
      virtualizer={ledger}
      label="Ledger"
      class="h-80 rounded-box border border-base-content/10 bg-base-100"
    >
      {#snippet item(index)}
        {@const entry = ledgerEntry(index)}
        <div
          class="flex h-10 items-center justify-between gap-4 border-b border-base-content/5 px-4 text-sm"
          data-testid="ledger-row"
        >
          <span class="font-mono text-base-content/50 tabular-nums">#{number.format(entry.id)}</span
          >
          <span class="flex-1">{entry.account}</span>
          <span class="tabular-nums">{money.format(entry.amount)}</span>
        </div>
      {/snippet}
    </VirtualList>

    <p class="text-sm text-base-content/60">
      Rendering <code class="kbd kbd-sm" data-testid="ledger-rendered">{ledger.items.length}</code>
      of {number.format(LEDGER_SIZE)} rows{ledger.isScrolling ? " · scrolling" : ""}
    </p>
  </section>

  <section class="flex flex-col gap-4" data-testid="chat">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
      Anchored to the end
    </h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      A chat opens at the newest message and keeps the bottom edge still while bubbles measure
      themselves. <em>Load older</em> prepends thirty messages and calls
      <code class="kbd kbd-sm">prepend(30)</code>, so the message being read does not move.
      <em>Send</em> appends one, and <code class="kbd kbd-sm">followOnAppend</code> scrolls to it only
      when the reader was already at the end. Rows are keyed by message id, so a bubble keeps its DOM
      node when everything above it shifts.
    </p>

    <div class="flex flex-wrap gap-2">
      <button type="button" class="btn btn-sm" onclick={loadOlder}>Load older</button>
      <button type="button" class="btn btn-sm" onclick={() => chat.scrollToEnd()}>
        Jump to latest
      </button>
      <button type="button" class="btn btn-primary btn-sm" onclick={send}>Send</button>
    </div>

    <VirtualList
      virtualizer={chat}
      label="Conversation"
      class="h-96 rounded-box border border-base-content/10 bg-base-100"
    >
      {#snippet item(index)}
        {@const message = messages[index]}
        <div
          class={["chat px-4 py-1", message.author === "Ada" ? "chat-end" : "chat-start"]}
          data-message={message.id}
        >
          <div class="chat-header text-xs text-base-content/60">
            {message.author}
            <span class="font-mono">#{message.id}</span>
          </div>
          <div class={["chat-bubble", message.author === "Ada" && "chat-bubble-primary"]}>
            {message.text}
          </div>
        </div>
      {/snippet}
    </VirtualList>

    <p class="text-sm text-base-content/60">
      <code class="kbd kbd-sm" data-testid="chat-count">{messages.length}</code> messages
    </p>
  </section>

  <section class="flex flex-col gap-4" data-testid="windowed">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
      Paged from a server
    </h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      A fake API serves {number.format(CATALOG_SIZE)} shipments, fifty to a page, after
      {LATENCY_MS} ms. <code class="kbd kbd-sm">WindowedData</code> fetches the pages the viewport
      touches, keeps two on either side and lets the rest go, while the count stays put so the
      scrollbar never collapses. Changing the order changes the
      <code class="kbd kbd-sm">signature</code>: the window aborts what is in flight and starts
      again.
    </p>
    <p class="max-w-2xl text-sm text-base-content/70">
      Turn on failures and every third page rejects. Its rows stop shimmering, the loaded rows stay,
      and a strip offers a retry — a failed page waits for <code class="kbd kbd-sm">retry()</code>
      instead of hammering the server on every scroll, and scrolling it out of the window and back also
      asks again.
    </p>

    <div class="flex flex-wrap items-center gap-4">
      <SegmentedControl
        bind:value={order}
        size="sm"
        label="Order"
        caption="Order"
        options={[
          { id: "newest", label: "Newest" },
          { id: "oldest", label: "Oldest" },
        ]}
      />
      <label class="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          class="toggle toggle-sm"
          bind:checked={failSomePages}
          data-testid="fail-pages"
        />
        Make every third page fail
      </label>
    </div>

    <DataList
      data={shipments}
      itemSize={44}
      label="Shipments"
      class="h-96 rounded-box border border-base-content/10 bg-base-100"
    >
      {#snippet row(shipment)}
        <div
          class="flex h-11 items-center gap-4 border-b border-base-content/5 px-4 text-sm"
          data-testid="shipment-row"
        >
          <span class="w-24 font-mono">{shipment.code}</span>
          <span class="flex-1">{shipment.destination}</span>
          <span class="text-base-content/60 tabular-nums">{number.format(shipment.weight)} kg</span>
        </div>
      {/snippet}
    </DataList>

    <p class="text-sm text-base-content/60">
      Count <code class="kbd kbd-sm" data-testid="windowed-count"
        >{number.format(shipments.count)}</code
      >
      · {shipments.loading ? "loading" : "idle"} · failed pages
      <code class="kbd kbd-sm" data-testid="failed-pages"
        >{shipments.failedPages.length ? shipments.failedPages.join(", ") : "none"}</code
      >
    </p>
  </section>
</main>
