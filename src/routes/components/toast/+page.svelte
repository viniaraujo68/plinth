<script lang="ts">
  import { toast, type ToastPosition, type ToastVariant } from "$lib/toast/index.js";
  import { toasterPosition } from "../../toaster-position.svelte.js";

  // `button` is spelled out rather than interpolated from `variant`: Tailwind scans source text
  // for complete class names, and a name assembled at runtime is never generated.
  const VARIANTS: {
    variant: ToastVariant;
    button: string;
    message: string;
    description?: string;
  }[] = [
    { variant: "info", button: "btn-info", message: "Export queued." },
    { variant: "success", button: "btn-success", message: "Settings saved." },
    {
      variant: "warning",
      button: "btn-warning",
      message: "Session expires soon.",
      description: "You will be signed out in 5 minutes.",
    },
    {
      variant: "error",
      button: "btn-error",
      message: "Could not reach the server.",
      description: "Check your connection and try again.",
    },
  ];

  const POSITIONS: ToastPosition[] = [
    "top-start",
    "top-center",
    "top-end",
    "middle-start",
    "middle-center",
    "middle-end",
    "bottom-start",
    "bottom-center",
    "bottom-end",
  ];

  let stickyId = $state<string | null>(null);

  const fire = (variant: ToastVariant, message: string, description?: string) => {
    toast.show(message, { description }, variant);
  };

  // A sticky toast has no countdown at all, so something has to take it away: either the reader
  // through the dismiss button, or the code that put it there.
  const fireSticky = () => {
    stickyId = toast.info("Upload in progress.", {
      description: "This one stays until it is dismissed.",
      duration: Number.POSITIVE_INFINITY,
    });
  };

  const dismissSticky = () => {
    if (stickyId === null) return;
    toast.dismiss(stickyId);
    stickyId = null;
  };

  // Reusing an id replaces the toast in place instead of stacking a second one, which is how a
  // pending operation reports its own outcome.
  const fireReplaced = () => {
    const id = toast.info("Publishing…", { duration: Number.POSITIVE_INFINITY });
    setTimeout(() => toast.success("Published.", { id }), 1200);
  };

  const settleAfter = <T,>(ms: number, outcome: () => T): Promise<T> =>
    new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          resolve(outcome());
        } catch (failure) {
          reject(failure);
        }
      }, ms);
    });

  let lastResult = $state("nothing yet");
  let handledFailures = $state(0);

  const firePromise = async (succeed: boolean) => {
    const result = await toast.promise(
      () =>
        settleAfter(1500, () => {
          if (!succeed) throw new Error("The export service timed out.");
          return 42;
        }),
      {
        loading: "Exporting rows…",
        success: (rows) => `Exported ${rows} rows.`,
        error: (failure) => (failure instanceof Error ? failure.message : "Export failed."),
      },
      { onerror: () => (handledFailures += 1) },
    );
    lastResult = result === undefined ? "undefined" : String(result);
  };

  const fireProgress = () => {
    const id = toast.loading("Uploading 3 files…", { description: "0 of 3 done" });
    [1, 2, 3].forEach((done) =>
      setTimeout(() => {
        if (done < 3) toast.update(id, { description: `${done} of 3 done` });
        else
          toast.update(id, {
            variant: "success",
            message: "Uploaded 3 files.",
            description: undefined,
          });
      }, done * 800),
    );
  };
</script>

<main class="mx-auto flex w-full max-w-4xl flex-col gap-12 p-6 sm:p-10">
  <header class="flex flex-col gap-3">
    <h1 class="text-3xl font-semibold tracking-tight">Toast</h1>
    <p class="max-w-2xl text-base-content/70">
      A queue plus a rendering host. Any module calls
      <code class="kbd kbd-sm">toast.error(…)</code> with nothing plumbed through, and a single
      <code class="kbd kbd-sm">&lt;Toaster /&gt;</code> near the app root renders it. The stack is a
      top-layer popover, so it stays above a modal
      <code class="kbd kbd-sm">&lt;dialog&gt;</code>.
    </p>
  </header>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">Variants</h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      Each variant carries its own icon, so severity never depends on color alone. Warnings and
      errors are announced assertively and linger longer than the rest.
    </p>
    <div class="flex flex-wrap gap-2">
      {#each VARIANTS as entry (entry.variant)}
        <button
          type="button"
          class="btn btn-sm {entry.button}"
          data-testid="fire-{entry.variant}"
          onclick={() => fire(entry.variant, entry.message, entry.description)}
        >
          {entry.variant}
        </button>
      {/each}
    </div>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">Lifecycle</h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      A countdown freezes while the pointer rests on a toast or while its dismiss button holds
      focus, so a toast can never disappear mid-read. An infinite duration makes it sticky.
    </p>
    <div class="flex flex-wrap gap-2">
      <button type="button" class="btn btn-sm" data-testid="fire-sticky" onclick={fireSticky}>
        Sticky toast
      </button>
      <button
        type="button"
        class="btn btn-sm"
        data-testid="dismiss-sticky"
        disabled={stickyId === null}
        onclick={dismissSticky}
      >
        Dismiss it programmatically
      </button>
      <button type="button" class="btn btn-sm" data-testid="fire-replaced" onclick={fireReplaced}>
        Replace in place
      </button>
      <button
        type="button"
        class="btn btn-ghost btn-sm"
        data-testid="clear"
        onclick={() => toast.clear()}
      >
        Clear all
      </button>
    </div>
    <p class="text-xs text-base-content/50">
      The queue caps at five: fire more and the oldest gives way, because a stack taller than the
      viewport hides the newest message.
    </p>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
      Loading and promises
    </h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      A <code class="kbd kbd-sm">loading</code> toast spins, never times out and cannot be dismissed
      unless asked to. <code class="kbd kbd-sm">toast.promise</code> shows one for as long as the
      work runs, then turns the same toast into a success or an error. It never rejects: it resolves
      to the value, or to <code class="kbd kbd-sm">undefined</code> on failure, and hands the
      failure to
      <code class="kbd kbd-sm">onerror</code> — or to <code class="kbd kbd-sm">reportError</code> when
      none is given.
    </p>
    <div class="flex flex-wrap gap-2">
      <button
        type="button"
        class="btn btn-sm"
        data-testid="fire-promise-success"
        onclick={() => firePromise(true)}
      >
        Promise that succeeds
      </button>
      <button
        type="button"
        class="btn btn-sm"
        data-testid="fire-promise-error"
        onclick={() => firePromise(false)}
      >
        Promise that fails
      </button>
      <button type="button" class="btn btn-sm" data-testid="fire-progress" onclick={fireProgress}>
        Loading with progress
      </button>
    </div>
    <p class="text-sm text-base-content/60">
      Last result: <code class="kbd kbd-sm" data-testid="promise-result">{lastResult}</code>.
      Failures handed to <code class="kbd kbd-sm">onerror</code>:
      <span class="badge badge-soft badge-primary" data-testid="promise-failures"
        >{handledFailures}</span
      >
    </p>
    <p class="max-w-2xl text-sm text-base-content/70">
      "Loading with progress" drives one toast through <code class="kbd kbd-sm">toast.update</code>:
      the description changes in place, and switching the variant to success hands it that variant's
      countdown and dismiss button.
    </p>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">Position</h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      The single <code class="kbd kbd-sm">&lt;Toaster /&gt;</code> lives in this site's root layout, which
      is where an app mounts it too. These buttons reach it through a piece of shared state; an app just
      passes the prop.
    </p>
    <div class="flex flex-wrap gap-2">
      {#each POSITIONS as entry (entry)}
        <button
          type="button"
          class="btn btn-sm {toasterPosition.value === entry ? 'btn-primary' : 'btn-outline'}"
          aria-pressed={toasterPosition.value === entry}
          onclick={() => (toasterPosition.value = entry)}
        >
          {entry}
        </button>
      {/each}
    </div>
  </section>
</main>
