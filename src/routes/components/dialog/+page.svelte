<script lang="ts">
  import { resolve } from "$app/paths";
  import Dialog from "$lib/components/Dialog.svelte";
  import { onMount } from "svelte";
  import MountProbe from "./MountProbe.svelte";

  let plain = $state<Dialog>();
  let nested = $state<Dialog>();

  // This page is prerendered, so the opener exists in the HTML before there is a dialog to open.
  // Disabling it until hydration turns a click in that gap into a wait rather than into nothing.
  let ready = $state(false);
  onMount(() => {
    ready = true;
  });

  let mounts = $state(0);
  let inDocument = $state(false);

  const DELEGATED = [
    ["Top layer", "Painted above every stacking context, with no z-index to negotiate."],
    ["Modality", "The rest of the document goes inert: not clickable, not tabbable, not read out."],
    ["Focus trap", "Tab cycles inside the dialog. No key handler, no list of focusable selectors."],
    ["Escape", "Fires `cancel`, then closes. A handler can veto it by preventing the default."],
    ["Focus return", "Focus goes back to whatever opened the dialog, even several closes deep."],
  ];
</script>

<main class="mx-auto flex w-full max-w-4xl flex-col gap-12 p-6 sm:p-10">
  <header class="flex flex-col gap-3">
    <h1 class="text-3xl font-semibold tracking-tight">Dialog</h1>
    <p class="max-w-2xl text-base-content/70">
      A native <code class="kbd kbd-sm">&lt;dialog&gt;</code> that only exists while it is on
      screen. It carries no chrome on purpose: everything a dialog is hard to get right about is
      already the browser's job, and the one thing the browser does not do is skip the cost of
      content nobody has opened yet. For a titled box with a close button and a scrollable body, see
      <a class="link" href={resolve("/components/modal")}>Modal</a>.
    </p>
  </header>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
      Lazy mounting
    </h2>
    <div class="card flex-row flex-wrap items-center gap-6 rounded-box bg-base-200 p-4">
      <button
        class="btn btn-primary"
        data-testid="open-plain"
        disabled={!ready}
        onclick={() => plain?.show()}
      >
        Open dialog
      </button>
      <dl class="flex flex-wrap gap-x-8 gap-y-2 text-sm">
        <div class="flex flex-col">
          <dt class="text-xs text-base-content/50">Children in the document</dt>
          <dd>
            <span class="badge badge-soft" data-testid="mount-state">
              {inDocument ? "yes" : "no"}
            </span>
          </dd>
        </div>
        <div class="flex flex-col">
          <dt class="text-xs text-base-content/50">Times mounted</dt>
          <dd>
            <span class="badge badge-soft badge-primary" data-testid="mount-count">{mounts}</span>
          </dd>
        </div>
      </dl>
    </div>
    <p class="max-w-2xl text-sm text-base-content/60">
      The counter starts at zero on a page that already declares the dialog, and goes up once per
      opening: closing unmounts the content, so a form inside starts empty the next time and a chart
      inside is never built for a dialog nobody opens.
    </p>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
      Delegated to the browser
    </h2>
    <dl class="grid gap-3 sm:grid-cols-2">
      {#each DELEGATED as [term, detail] (term)}
        <div class="flex flex-col gap-1 rounded-box border border-base-content/10 p-4">
          <dt class="text-sm font-medium">{term}</dt>
          <dd class="text-sm text-base-content/60">{detail}</dd>
        </div>
      {/each}
    </dl>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">Stacking</h2>
    <p class="max-w-2xl text-sm text-base-content/60">
      A dialog opened from inside another one stacks in the top layer in the order it was opened,
      and closing it returns focus to the control that opened it rather than to the page.
    </p>
  </section>
</main>

<!-- Styled entirely through `class`: this is the bare shell, not the daisyUI modal. -->
<Dialog
  bind:this={plain}
  class="w-[min(28rem,90vw)] rounded-box border border-base-content/10 bg-base-100 p-6 text-base-content shadow-xl backdrop:bg-black/50"
>
  <MountProbe
    onmount={() => {
      mounts += 1;
      inDocument = true;
    }}
    ondestroy={() => (inDocument = false)}
  />

  <div class="flex flex-col gap-4" data-testid="plain-content">
    <h2 class="text-lg font-semibold">A bare dialog</h2>
    <p class="text-sm text-base-content/70">
      No header, no padding rules, no close button beyond the one written here. Press Escape, or Tab
      around: focus never leaves this box, and the page behind it cannot be reached.
    </p>
    <div class="flex flex-wrap justify-end gap-2">
      <button class="btn btn-ghost" data-testid="open-nested" onclick={() => nested?.show()}>
        Open another
      </button>
      <button class="btn btn-primary" data-testid="close-plain" onclick={() => plain?.close()}>
        Close
      </button>
    </div>
  </div>
</Dialog>

<Dialog
  bind:this={nested}
  class="w-[min(22rem,85vw)] rounded-box border border-base-content/10 bg-base-100 p-6 text-base-content shadow-xl backdrop:bg-black/50"
>
  <div class="flex flex-col gap-4" data-testid="nested-content">
    <p class="text-sm">
      Stacked above the first one. Closing this returns focus to the button that opened it.
    </p>
    <button class="btn self-end btn-primary btn-sm" onclick={() => nested?.close()}>Close</button>
  </div>
</Dialog>
