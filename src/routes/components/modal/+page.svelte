<script lang="ts">
  import { resolve } from "$app/paths";
  import Modal from "$lib/components/Modal.svelte";
  import { onMount } from "svelte";

  let basic = $state<Modal>();
  let long = $state<Modal>();
  let blocking = $state<Modal>();

  // This page is prerendered, so the openers exist in the HTML before there is a modal to open.
  // Disabling them until hydration turns a click in that gap into a wait rather than into nothing.
  let ready = $state(false);
  onMount(() => {
    ready = true;
  });

  let plan = $state("monthly");
  let decision = $state("none");

  // Long enough that the body has to scroll on any screen, which is the whole point of the demo.
  const CLAUSES = [
    ["Modality", "Everything behind the backdrop is inert: not clickable, not tabbable, not read."],
    [
      "Escape",
      "Closes, unless the modal is not dismissible, in which case the footer is the exit.",
    ],
    ["Focus", "Opens on the box, cycles inside it, and returns to the opener on close."],
    ["Background scroll", "Locked while open, and the previous inline value is put back exactly."],
    ["Viewport", "Capped in dvh, so the on-screen keyboard cannot push the footer out of reach."],
    [
      "Touch",
      "The close button is a full 44px target that eats the header padding, not the header.",
    ],
    ["Header", "Stays put while the body scrolls, so the title is readable at any scroll offset."],
    [
      "Overscroll",
      "Contained: flicking past the end of the body does not scroll the page under it.",
    ],
    ["Motion", "Honours prefers-reduced-motion, which also skips the fade on the way out."],
    ["Mounting", "The content is built on open and torn down on close, once per opening."],
    ["Stacking", "Top layer, so no z-index in the app can end up above an open modal."],
    ["Naming", "The title is the accessible name of the dialog, wired by id rather than repeated."],
  ];
</script>

<main class="mx-auto flex w-full max-w-4xl flex-col gap-12 p-6 sm:p-10">
  <header class="flex flex-col gap-3">
    <h1 class="text-3xl font-semibold tracking-tight">Modal</h1>
    <p class="max-w-2xl text-base-content/70">
      The chrome layer over <a class="link" href={resolve("/components/dialog")}>Dialog</a>: a
      title, a close button, a body that scrolls under a header that does not, and an optional
      footer for actions. Modality, focus and Escape stay the browser's; what is added here is
      everything a native dialog leaves to the page, most of which is only visible on a phone.
    </p>
  </header>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">Variants</h2>
    <div class="card flex-row flex-wrap items-center gap-3 rounded-box bg-base-200 p-4">
      <button
        class="btn btn-primary"
        data-testid="open-basic"
        disabled={!ready}
        onclick={() => {
          decision = "pending";
          basic?.show();
        }}
      >
        With a footer
      </button>
      <button class="btn" data-testid="open-long" disabled={!ready} onclick={() => long?.show()}>
        Long content
      </button>
      <button
        class="btn"
        data-testid="open-blocking"
        disabled={!ready}
        onclick={() => blocking?.show()}
      >
        Requires a decision
      </button>
      <span class="badge badge-soft" data-testid="decision">{decision}</span>
    </div>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
      Background scroll
    </h2>
    <p class="max-w-2xl text-sm text-base-content/60">
      A native modal makes the document inert but not immobile: without a lock, a wheel or a flick
      still scrolls the page behind the backdrop, and the reading position is lost by the time the
      modal closes. Scroll down, open any of the modals above, and try.
    </p>
    <div
      class="flex h-[70vh] items-end justify-center rounded-box border border-dashed border-base-content/20 p-6 text-sm text-base-content/40"
    >
      Bottom of the page.
    </div>
  </section>
</main>

<!-- `onclose` fires however the modal closed, so an escape or a click outside is told apart from a
     footer action by what that action already recorded. -->
<Modal
  bind:this={basic}
  title="Change plan"
  onclose={() => {
    if (decision === "pending") decision = "dismissed";
  }}
>
  <div class="flex flex-col gap-4" data-testid="basic-content">
    <p class="text-sm text-base-content/70">
      A short body needs no scrolling: the box is only as tall as its content until it runs into the
      viewport cap.
    </p>
    <fieldset class="fieldset">
      <legend class="fieldset-legend">Billing</legend>
      <label class="label gap-2">
        <input type="radio" name="plan" class="radio" bind:group={plan} value="monthly" />
        Monthly
      </label>
      <label class="label gap-2">
        <input type="radio" name="plan" class="radio" bind:group={plan} value="yearly" />
        Yearly
      </label>
    </fieldset>
  </div>

  {#snippet footer()}
    <button class="btn btn-ghost" onclick={() => basic?.close()}>Cancel</button>
    <button
      class="btn btn-primary"
      data-testid="basic-save"
      onclick={() => {
        decision = plan;
        basic?.close();
      }}
    >
      Save
    </button>
  {/snippet}
</Modal>

<Modal bind:this={long} title="What the browser does, and what this adds" class="max-w-2xl">
  <dl class="flex flex-col gap-4" data-testid="long-content">
    {#each CLAUSES as [term, detail] (term)}
      <div class="flex flex-col gap-1">
        <dt class="text-sm font-medium">{term}</dt>
        <dd class="text-sm text-base-content/60">{detail}</dd>
      </div>
    {/each}
  </dl>

  {#snippet footer()}
    <button class="btn btn-primary" data-testid="long-close" onclick={() => long?.close()}>
      Got it
    </button>
  {/snippet}
</Modal>

<!-- No ✕, no Escape, no click outside: the footer owes the user a way out, and gives two. -->
<Modal bind:this={blocking} title="Discard the draft?" dismissible={false}>
  <p class="text-sm text-base-content/70" data-testid="blocking-content">
    Nothing here is saved yet. Choosing is the only way out of this one, which is the only reason a
    modal should ever refuse to be dismissed.
  </p>

  {#snippet footer()}
    <button
      class="btn btn-ghost"
      data-testid="blocking-keep"
      onclick={() => {
        decision = "kept";
        blocking?.close();
      }}
    >
      Keep editing
    </button>
    <button
      class="btn btn-error"
      data-testid="blocking-discard"
      onclick={() => {
        decision = "discarded";
        blocking?.close();
      }}
    >
      Discard
    </button>
  {/snippet}
</Modal>
