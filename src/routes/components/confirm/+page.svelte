<script lang="ts">
  import { resolve } from "$app/paths";
  import { onMount } from "svelte";
  import { confirm, Confirmer, createConfirmManager } from "$lib/confirm/index.js";

  // This page is prerendered, so the buttons exist in the HTML before there is a host to render a
  // question. Disabling them until hydration turns a click in that gap into a wait rather than
  // into nothing.
  let ready = $state(false);
  onMount(() => {
    ready = true;
  });

  let outcome = $state("nothing asked yet");

  const record = (label: string, confirmed: boolean) => {
    outcome = `${label} — ${confirmed ? "confirmed" : "cancelled"}`;
  };

  const askPlain = async () => {
    record(
      "Archive",
      await confirm({
        title: "Archive this report?",
        description: "It leaves the list and keeps its link. You can bring it back any time.",
      }),
    );
  };

  // Nothing but a title: the question fits in the heading, so there is no body band at all.
  const askTitleOnly = async () => {
    record("Leave", await confirm({ title: "Leave without saving?" }));
  };

  const askDanger = async () => {
    record(
      "Delete",
      await confirm({
        title: "Delete Thursday night?",
        description: "The night, its twelve hands and every buy-in recorded against it go with it.",
        confirmLabel: "Delete the night",
        danger: true,
      }),
    );
  };

  const askChallenge = async () => {
    record(
      "Delete group",
      await confirm({
        title: "Delete the group?",
        description:
          "Eleven members lose their history. Nothing here is recoverable once it is gone.",
        confirmLabel: "Delete group",
        danger: true,
        challenge: "Thursday Regulars",
      }),
    );
  };

  // Two calls with nothing awaited between them. The second waits its turn rather than replacing
  // the first, so both questions get looked at and both promises answer what was actually chosen.
  const askTwice = () => {
    const first = confirm({
      title: "First question",
      description: "Answer this one and the second opens by itself.",
    });
    const second = confirm({
      title: "Second question",
      description: "Queued behind the first, never shown at the same time as it.",
    });

    void Promise.all([first, second]).then(([one, two]) => {
      outcome = `Queued — ${one ? "confirmed" : "cancelled"}, then ${
        two ? "confirmed" : "cancelled"
      }`;
    });
  };

  // A manager of its own, so this page can host a second `Confirmer` with a full set of French
  // labels without re-labelling the one in the site's root layout. An app localizing itself needs
  // neither: it puts these same four props on its single host.
  const localized = createConfirmManager();

  const askLocalized = async () => {
    record(
      "Localized",
      await localized.confirm({
        title: "Supprimer la photo ?",
        description: "Cette action est définitive.",
        challenge: "photo-2024",
        danger: true,
      }),
    );
  };
</script>

<main class="mx-auto flex w-full max-w-4xl flex-col gap-12 p-6 sm:p-10">
  <header class="flex flex-col gap-3">
    <h1 class="text-3xl font-semibold tracking-tight">Confirm</h1>
    <p class="max-w-2xl text-base-content/70">
      The browser's own <code class="kbd kbd-sm">confirm()</code>, replaced by something that can be
      styled, translated and gated. An awaited call from anywhere —
      <code class="kbd kbd-sm">await confirm(&#123; title, danger: true &#125;)</code> — and a
      single <code class="kbd kbd-sm">&lt;Confirmer /&gt;</code> in the root layout that renders it
      over <a class="link" href={resolve("/components/modal")}>Modal</a>, so modality, focus and
      Escape stay the browser's.
    </p>
  </header>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">Asking</h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      Focus opens on cancel, never on the destructive action, so a stray Enter cannot delete
      anything. Escape, the backdrop and the ✕ all answer no. A question that fits in its own title
      gets no body band: the box is the heading and the actions, and nothing between them.
    </p>
    <div class="card flex-row flex-wrap items-center gap-3 rounded-box bg-base-200 p-4">
      <button class="btn" data-testid="ask-plain" disabled={!ready} onclick={askPlain}>
        Plain confirm
      </button>
      <button class="btn btn-error" data-testid="ask-danger" disabled={!ready} onclick={askDanger}>
        Danger confirm
      </button>
      <button class="btn" data-testid="ask-title-only" disabled={!ready} onclick={askTitleOnly}>
        Title only
      </button>
      <span class="badge badge-soft" data-testid="outcome">{outcome}</span>
    </div>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
      The challenge gate
    </h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      For the destructions worth slowing down: the confirm action stays disabled until the exact
      string has been typed. Focus opens in the input instead of on cancel, and Enter there confirms
      only once what is typed matches. Both sides are trimmed at the ends — a name copied off the
      row above picks up a trailing space far more often than anyone types one — and nothing else is
      folded, because the case and the spelling are the point.
    </p>
    <div class="card flex-row flex-wrap items-center gap-3 rounded-box bg-base-200 p-4">
      <button
        class="btn btn-error"
        data-testid="ask-challenge"
        disabled={!ready}
        onclick={askChallenge}
      >
        Delete group
      </button>
      <code class="kbd kbd-sm">Thursday Regulars</code>
    </div>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
      Two at once
    </h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      A second call while one is open queues behind it. Nothing is ever answered by anything but a
      person looking at it: replacing the first would resolve a question that was never asked, and
      rejecting would throw at a call site written to read a boolean.
    </p>
    <div class="card flex-row flex-wrap items-center gap-3 rounded-box bg-base-200 p-4">
      <button class="btn" data-testid="ask-twice" disabled={!ready} onclick={askTwice}>
        Ask two questions
      </button>
    </div>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
      Localized labels
    </h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      The library ships no translations, so the four labels on the host are how an app translates
      every confirm it will ever ask; a single call overrides any of them through its own options.
      The one below is a second host with its own manager, which is also how a subtree gets a queue
      of its own.
    </p>
    <div class="card flex-row flex-wrap items-center gap-3 rounded-box bg-base-200 p-4">
      <button
        class="btn btn-error"
        data-testid="ask-localized"
        disabled={!ready}
        onclick={askLocalized}
      >
        Supprimer
      </button>
      <code class="kbd kbd-sm">photo-2024</code>
    </div>
  </section>
</main>

<Confirmer
  manager={localized}
  confirmLabel="Supprimer"
  cancelLabel="Annuler"
  closeLabel="Fermer"
  challengeLabel={(challenge) => `Saisissez ${challenge} pour confirmer`}
/>
