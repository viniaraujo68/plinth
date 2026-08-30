<script lang="ts">
  import { tooltip } from "$lib/attachments/index.js";
  import Tooltip from "$lib/components/Tooltip.svelte";

  let disabled = $state(false);

  const SHORTCUTS = [
    { keys: "⌘K", label: "Command palette", hint: "Opens the palette from anywhere" },
    { keys: "⌘S", label: "Save", hint: "Writes every pending change" },
    { keys: "⌘/", label: "Shortcuts", hint: "Shows this list" },
  ];
</script>

<main class="mx-auto flex w-full max-w-4xl flex-col gap-12 p-6 sm:p-10">
  <header class="flex flex-col gap-3">
    <h1 class="text-3xl font-semibold tracking-tight">Tooltip</h1>
    <p class="max-w-2xl text-base-content/70">
      Two shapes of the same behavior. The <code class="kbd kbd-sm">tooltip</code> attachment takes
      a string and owns its panel; the <code class="kbd kbd-sm">Tooltip</code> component takes a snippet
      and renders the panel in your markup. Both place the panel with CSS anchor positioning in the top
      layer, so nothing clips it and no z-index is negotiated.
    </p>
  </header>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
      Attachment · plain text
    </h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      The host stays the element you wrote, which is what keeps a joined button group joined. Hover
      one, or tab into it — the panel answers to focus exactly as it does to the pointer.
    </p>
    <div class="join" data-testid="join">
      {#each SHORTCUTS as shortcut (shortcut.keys)}
        <button class="btn join-item btn-sm" {@attach tooltip(shortcut.hint)}>
          {shortcut.label}
        </button>
      {/each}
    </div>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
      Component · rich content
    </h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      <code class="kbd kbd-sm">as</code> decides the host tag, and everything else you pass lands on it.
      Below the host is a button, so it carries the click handler and its own focus ring.
    </p>
    <div class="flex flex-wrap items-center gap-4">
      <Tooltip as="button" class="btn btn-primary btn-sm" data-testid="rich-host">
        {#snippet tooltip()}
          Publishes to <strong>everyone</strong>, immediately
        {/snippet}
        Publish
      </Tooltip>

      <Tooltip class="underline decoration-dotted underline-offset-4" data-testid="span-host">
        {#snippet tooltip()}
          <span class="flex flex-col">
            <span class="font-medium">Release date</span>
            <span class="text-base-content/60">The day the album reaches listeners.</span>
          </span>
        {/snippet}
        release date
      </Tooltip>
    </div>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
      Conditional
    </h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      A collapsed rail needs labels on hover; an expanded one already shows them. Gating with
      <code class="kbd kbd-sm">disabled</code> keeps the wiring in place across the toggle instead of
      re-attaching it every time.
    </p>
    <label class="label w-fit cursor-pointer gap-2">
      <input
        type="checkbox"
        class="toggle toggle-sm"
        data-testid="disable-toggle"
        bind:checked={disabled}
      />
      <span class="text-sm">Suppress the tooltips below</span>
    </label>
    <div class="flex flex-wrap items-center gap-4">
      <button
        class="btn btn-sm"
        data-testid="gated-attachment"
        {@attach tooltip("Archive", { disabled })}
      >
        Archive
      </button>
      <Tooltip
        as="button"
        class="btn btn-sm"
        data-testid="gated-component"
        tooltipDisabled={disabled}
      >
        {#snippet tooltip()}
          Deletes the album and its <strong>tracks</strong>
        {/snippet}
        Delete
      </Tooltip>
    </div>
  </section>
</main>
