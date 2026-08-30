<script lang="ts">
  import Dropdown from "$lib/components/Dropdown.svelte";

  // A Svelte 5 component is a function type, so its instance handle is what calling it returns --
  // the object of `export`ed members, here `open` and `close`.
  type DropdownHandle = ReturnType<typeof Dropdown>;

  let filterMenu = $state<DropdownHandle>();
  let remoteMenu = $state<DropdownHandle>();

  let status = $state("all");
  let lastAction = $state("—");

  const STATUSES = ["all", "queued", "published", "failed"];
</script>

<main class="mx-auto flex w-full max-w-4xl flex-col gap-12 p-6 sm:p-10">
  <header class="flex flex-col gap-3">
    <h1 class="text-3xl font-semibold tracking-tight">Dropdown</h1>
    <p class="max-w-2xl text-base-content/70">
      A trigger button plus a native popover. Re-clicking the trigger, clicking outside and pressing
      Escape all dismiss it, and none of the three cost a line of code here — the browser owns them,
      along with the top layer that keeps the panel out of every overflow and stacking context on
      the page.
    </p>
  </header>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">Menu</h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      The trigger is the root, so daisyUI's button classes apply directly to it. The panel is styled
      through <code class="kbd kbd-sm">panelClass</code>.
    </p>
    <div class="flex flex-wrap items-center gap-4">
      <Dropdown class="btn btn-sm" panelClass="menu w-52 rounded-box bg-base-200 p-2 shadow-lg">
        Row actions
        {#snippet content()}
          <li><button type="button" onclick={() => (lastAction = "Open")}>Open</button></li>
          <li>
            <button type="button" onclick={() => (lastAction = "Duplicate")}>Duplicate</button>
          </li>
          <li>
            <button type="button" class="text-error" onclick={() => (lastAction = "Delete")}>
              Delete
            </button>
          </li>
        {/snippet}
      </Dropdown>
      <span class="text-sm text-base-content/70">
        Last action <span class="badge badge-soft badge-sm" data-testid="last-action"
          >{lastAction}</span
        >
      </span>
    </div>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
      Closing from inside
    </h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      A panel holding a form has to dismiss itself once the form is applied. That is what
      <code class="kbd kbd-sm">close()</code> is for, reached through
      <code class="kbd kbd-sm">bind:this</code>.
    </p>
    <div class="flex flex-wrap items-center gap-4">
      <Dropdown
        bind:this={filterMenu}
        class="btn btn-outline btn-sm"
        data-testid="filter-trigger"
        panelClass="w-64 rounded-box border border-base-content/10 bg-base-100 p-4 shadow-lg"
      >
        Filter: {status}
        {#snippet content()}
          <fieldset class="flex flex-col gap-2">
            <legend class="mb-2 text-xs text-base-content/50 uppercase">Status</legend>
            {#each STATUSES as candidate (candidate)}
              <label class="label cursor-pointer justify-start gap-2">
                <input type="radio" class="radio radio-sm" value={candidate} bind:group={status} />
                <span class="text-sm">{candidate}</span>
              </label>
            {/each}
            <button
              type="button"
              class="btn mt-2 btn-primary btn-sm"
              data-testid="apply-filter"
              onclick={() => filterMenu?.close()}
            >
              Apply
            </button>
          </fieldset>
        {/snippet}
      </Dropdown>
    </div>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
      Opening from elsewhere
    </h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      <code class="kbd kbd-sm">open()</code> mounts the content before showing the panel, so a
      programmatic open never flashes an empty box the way the trigger's own async
      <code class="kbd kbd-sm">toggle</code> event would.
    </p>
    <div class="flex flex-wrap items-center gap-4">
      <button
        type="button"
        class="btn btn-secondary btn-sm"
        data-testid="remote-open"
        onclick={() => remoteMenu?.open()}
      >
        Open the panel next to it
      </button>
      <Dropdown
        bind:this={remoteMenu}
        class="btn btn-ghost btn-sm"
        panelClass="w-56 rounded-box border border-base-content/10 bg-base-100 p-4 text-sm shadow-lg"
      >
        …or click me
        {#snippet content()}
          <p data-testid="remote-content">
            Mounted on demand and unmounted once the panel is really hidden.
          </p>
        {/snippet}
      </Dropdown>
    </div>
  </section>
</main>
