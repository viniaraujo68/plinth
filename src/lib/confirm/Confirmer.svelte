<script lang="ts">
  import type { ClassValue } from "svelte/elements";
  import Modal from "../components/Modal.svelte";
  import { challengeSatisfied } from "./challenge.js";
  import {
    getDefaultConfirmManager,
    type ConfirmManager,
    type ConfirmRequest,
  } from "./confirm-manager.svelte.js";

  interface Props {
    /** Queue to render. Defaults to the one behind the module-level `confirm` helper. */
    manager?: ConfirmManager;
    /** Extra classes for the box -- a wider cap for a long name. Not for the backdrop. */
    class?: ClassValue;
    /**
     * Default label of the confirm action, for apps that are not in English. A call overrides it
     * with `confirmLabel`; this is what every call that does not gets.
     */
    confirmLabel?: string;
    /** Default label of the cancel action. Overridden per call by `cancelLabel`. */
    cancelLabel?: string;
    /** Accessible name of the close button, which never varies per call. */
    closeLabel?: string;
    /**
     * Labels the challenge input. A function rather than a string because the challenge itself has
     * to appear inside the sentence, and only the app knows where its language puts it.
     */
    challengeLabel?: (challenge: string) => string;
  }

  let {
    manager,
    class: className,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    closeLabel = "Close",
    challengeLabel = (challenge) => `Type ${challenge} to confirm`,
  }: Props = $props();

  const resolvedManager = $derived(manager ?? getDefaultConfirmManager());

  let modal = $state<Modal>();
  // What is on screen, which is NOT the same as `manager.current`: the head of the queue advances
  // the moment a request is settled, and the dialog is still fading out at that point. Holding the
  // snapshot until the next one is actually presented is what keeps the closing box from flashing
  // the next question's title.
  let shown = $state<ConfirmRequest | null>(null);
  let typed = $state("");

  // Not `$state`: nothing renders from it, and it is written and read within one close cycle.
  let outcome = false;

  const inputId = $props.id();
  const enabled = $derived(challengeSatisfied(shown?.challenge, typed));

  // A question that fits entirely in its title -- "Delete this night?" -- has nothing to put in a
  // body, and `Modal` renders no body element at all when it is handed no snippet. Deciding here
  // rather than rendering an empty wrapper is what keeps that case from showing a padded strip
  // between the header and the actions.
  const hasBody = $derived(Boolean(shown?.description ?? shown?.challenge));

  $effect(() =>
    resolvedManager.attach(() => {
      shown = resolvedManager.current;
      typed = "";
      outcome = false;
      modal?.show();
    }),
  );

  // Every path out of the dialog goes through `close`, so the decision is recorded first and read
  // back once the element reports itself closed. That also means the awaiting caller resumes with
  // the backdrop already gone, rather than racing a navigation against a closing dialog.
  const decide = (confirmed: boolean) => {
    outcome = confirmed;
    modal?.close();
  };

  const handleClose = () => {
    if (!shown) return;

    const confirmed = outcome;
    outcome = false;
    // Escape, the backdrop and the close button never touch `outcome`, so they all arrive here as
    // false -- cancel is the default of every path that is not the confirm action itself.
    resolvedManager.settle(shown.id, confirmed);
  };

  const handleChallengeKeydown = (event: KeyboardEvent) => {
    if (event.key !== "Enter") return;

    // There is no form here, so nothing submits on its own and Enter has to be wired to the action
    // it stands in for. Prevented in both branches: an Enter that lands before the gate opens must
    // do nothing at all rather than fall through to anything else.
    event.preventDefault();
    if (enabled) decide(true);
  };
</script>

<!--
@component
Renders a `ConfirmManager`'s queue as a modal question. Mount exactly one, unconditionally, in the
app's root layout, next to `Toaster` and for the same reason: the call site that asks the question
is somewhere else entirely.

With no `manager` prop it renders the queue behind the module-level `confirm` helper, which is what
lets any module in the app write the one line this exists for:

```ts
if (!(await confirm({ title: `Delete ${night.name}?`, danger: true }))) return;
await api.delete(`/nights/${night.id}`);
```

The library ships no translations, so the four labels here are how an app localizes every confirm
at once; a single call overrides any of them through its own options.

Focus never lands on the confirm action. It opens on cancel, or on the challenge input when there
is one, so a stray Enter can only ever cancel -- and in the challenge input Enter confirms solely
when what has been typed already matches.
-->

{#snippet body()}
  <div class="flex flex-col gap-4" data-testid="confirm-body">
    {#if shown?.description}
      <p class="text-sm whitespace-pre-line text-base-content/70" data-testid="confirm-description">
        {shown.description}
      </p>
    {/if}

    {#if shown?.challenge}
      <div class="flex flex-col gap-2">
        <label class="text-sm font-medium" for={inputId}>
          {shown.challengeLabel ?? challengeLabel(shown.challenge)}
        </label>
        <!-- The browser opens a dialog on its first focusable descendant, which is the ✕.
             Autofocus is how content overrides that, and it is the seam `Modal` already documents;
             the a11y rule suppressed here is about a page stealing focus from a reader, which is
             not what a dialog that has just taken focus by definition is doing. Autocomplete,
             correction and capitalisation are off because the comparison is exact, and a phone
             capitalising the first letter would make the gate unopenable. -->
        <!-- svelte-ignore a11y_autofocus -->
        <input
          id={inputId}
          data-testid="confirm-challenge"
          class="input w-full"
          type="text"
          autocomplete="off"
          autocapitalize="none"
          autocorrect="off"
          spellcheck="false"
          autofocus
          bind:value={typed}
          onkeydown={handleChallengeKeydown}
        />
      </div>
    {/if}
  </div>
{/snippet}

{#snippet footer()}
  <!-- The other half of the focus rule: with no challenge to type, cancel is where the dialog
       opens, one Enter away from the safe outcome rather than from the destructive one. -->
  <!-- svelte-ignore a11y_autofocus -->
  <button
    type="button"
    class="btn btn-ghost"
    data-testid="confirm-cancel"
    autofocus={!shown?.challenge}
    onclick={() => decide(false)}
  >
    {shown?.cancelLabel ?? cancelLabel}
  </button>
  <button
    type="button"
    class={["btn", shown?.danger ? "btn-error" : "btn-primary"]}
    data-testid="confirm-accept"
    data-danger={shown?.danger ? "true" : undefined}
    disabled={!enabled}
    onclick={() => decide(true)}
  >
    {shown?.confirmLabel ?? confirmLabel}
  </button>
{/snippet}

<Modal
  bind:this={modal}
  title={shown?.title ?? ""}
  class={["max-w-md", className]}
  {closeLabel}
  onclose={handleClose}
  children={hasBody ? body : undefined}
  {footer}
/>
