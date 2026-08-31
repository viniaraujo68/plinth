import { untrack } from "svelte";

/** What a call to `confirm` asks. Everything but the title has a default. */
export interface ConfirmOptions {
  /** Names the dialog for assistive technology, and heads it visually. The question being asked. */
  title: string;
  /**
   * The consequence, in prose, under the title. A string rather than a snippet on purpose: the
   * whole point of the imperative API is that the options object is plain data, so it can be built
   * in a store, an action or a `.ts` module that has no component scope to author a snippet in.
   * A confirm that needs markup is a `Modal` composed by hand, and that path already exists.
   */
  description?: string;
  /** Overrides the host's `confirmLabel` for this one call. */
  confirmLabel?: string;
  /** Overrides the host's `cancelLabel` for this one call. */
  cancelLabel?: string;
  /** Styles the confirm action as destructive. Does not change any behaviour. */
  danger?: boolean;
  /**
   * A stronger gate: the confirm action stays disabled until this exact string has been typed.
   * Reach for it when the action destroys something that took a while to build and the name is on
   * screen to be read off — a project, a group, a production database. A blank or whitespace-only
   * value is treated as no challenge at all, so `challenge={maybeName}` is safe.
   */
  challenge?: string;
  /** Overrides the host's `challengeLabel` for this one call. Labels the challenge input. */
  challengeLabel?: string;
}

/** A queued question. Produced by the manager; consumed by `Confirmer`. */
export interface ConfirmRequest extends ConfirmOptions {
  id: string;
}

/** What the host registers with `attach`: a nudge to put `current` on screen. */
export type ConfirmPresenter = () => void;

let nextSequence = 0;
const createRequestId = () => `confirm-${++nextSequence}`;

/**
 * The queue behind `Confirmer`. Owns ids, ordering and the promise each call is waiting on.
 *
 * Most apps never touch this class: `confirm(...)` goes through the process-wide default manager
 * and a single `<Confirmer />` near the app root renders it. Construct one explicitly to scope a
 * queue to a subtree, or to give a test a manager it can throw away afterwards.
 */
export class ConfirmManager {
  /**
   * Everything asked and not yet answered, oldest first. The head is the one on screen.
   *
   * Concurrent calls QUEUE rather than replacing or rejecting. Replacing would answer a question
   * the user never saw, and answering it `false` is a lie about intent that a caller is free to
   * log as "the user cancelled". Rejecting would throw at a call site written as
   * `if (!(await confirm(...))) return;`, which is the shape this API exists to make safe. Waiting
   * is the only rule under which no request is ever answered by anything but a person looking at
   * it.
   */
  #queue = $state<ConfirmRequest[]>([]);

  // Plain Map and Set, not the reactive ones: nothing renders from either. The rendered surface is
  // the queue and nothing else.
  // eslint-disable-next-line svelte/prefer-svelte-reactivity
  readonly #resolvers = new Map<string, (confirmed: boolean) => void>();
  // eslint-disable-next-line svelte/prefer-svelte-reactivity
  readonly #presenters = new Set<ConfirmPresenter>();

  /** The request on screen, or null when nothing is being asked. */
  get current(): ConfirmRequest | null {
    return this.#queue[0] ?? null;
  }

  /** How many calls are still waiting for an answer, the one on screen included. */
  get pending(): number {
    return this.#queue.length;
  }

  /** Ask, and resolve once the question has been answered — `true` only for the confirm action. */
  confirm = (options: ConfirmOptions): Promise<boolean> => {
    const request: ConfirmRequest = {
      ...options,
      challenge: options.challenge?.trim() ? options.challenge : undefined,
      id: createRequestId(),
    };

    return new Promise<boolean>((resolve) => {
      this.#resolvers.set(request.id, resolve);
      this.#queue.push(request);
      // Only the head is ever on screen, so a call that lands behind one waits to be presented by
      // the `settle` that retires the request in front of it.
      if (this.#queue.length === 1) this.#present();
    });
  };

  /**
   * Answer the request on screen. The host's contract, called once the dialog has actually closed,
   * so the awaiting caller resumes into a page with nothing on top of it.
   *
   * An id that is not the head is ignored, which is what makes a close event arriving after
   * `cancelAll` harmless.
   */
  settle = (id: string, confirmed: boolean): void => {
    if (this.#queue[0]?.id !== id) return;

    this.#queue.shift();
    this.#resolvers.get(id)?.(confirmed);
    this.#resolvers.delete(id);

    if (this.#queue.length > 0) this.#present();
  };

  /**
   * Answer everything still waiting with `false` and empty the queue. Cancel is the safe answer,
   * so this is what sign-out, a hard navigation or the last host unmounting should do — never
   * leaving an `await confirm(...)` pending forever.
   */
  cancelAll = (): void => {
    const dropped = this.#queue;
    this.#queue = [];

    for (const request of dropped) {
      this.#resolvers.get(request.id)?.(false);
      this.#resolvers.delete(request.id);
    }
  };

  /**
   * Register a host. Returns the detach function, which is why `Confirmer` can hand this straight
   * back out of an `$effect`.
   *
   * When the last host detaches every pending call is cancelled: a promise nobody can ever answer
   * is worse than a `false`.
   */
  attach = (present: ConfirmPresenter): (() => void) => {
    this.#presenters.add(present);

    // Read without subscribing. `attach` is called from the host's `$effect`, and a dependency on
    // the queue there would tear the host down and rebuild it on every question asked -- and the
    // teardown cancels the very queue it had just read.
    if (untrack(() => this.#queue.length) > 0) this.#present();

    return () => {
      this.#presenters.delete(present);
      if (this.#presenters.size === 0) this.cancelAll();
    };
  };

  /**
   * Deferred by a microtask, always. Two of the three callers are already inside something that
   * must not be re-entered: `attach` runs inside the host's `$effect`, where the synchronous flush
   * that raises a `<dialog>` is an error, and `settle` runs inside the previous dialog's own close
   * event. Deferring uniformly is one rule instead of three, and a microtask is invisible.
   */
  #present(): void {
    queueMicrotask(() => {
      if (this.#queue.length === 0) return;
      for (const present of this.#presenters) present();
    });
  }
}

export const createConfirmManager = (): ConfirmManager => new ConfirmManager();

let browserManager: ConfirmManager | null = null;

/**
 * The manager backing the module-level `confirm` helper.
 *
 * A singleton only in the browser. On the server every call hands back a fresh manager, because a
 * module-level queue there is shared by every concurrent request.
 */
export const getDefaultConfirmManager = (): ConfirmManager => {
  if (typeof document === "undefined") return createConfirmManager();
  browserManager ??= createConfirmManager();
  return browserManager;
};

/**
 * Ask the question, await the answer: a one-line replacement for the browser's own `confirm()`,
 * from anywhere, with no context to plumb and no component to mount at the call site.
 *
 * ```ts
 * if (!(await confirm({ title: "Delete this night?", danger: true }))) return;
 * ```
 *
 * Resolves `true` only for the confirm action. Cancel, Escape, the close button, a click on the
 * backdrop and the host unmounting all resolve `false`.
 */
export const confirm = (options: ConfirmOptions): Promise<boolean> => {
  // There is nobody to ask on the server, and "no" is the only safe answer to a question about
  // destroying something. Answering rather than queueing is also what keeps a confirm reached
  // during SSR from hanging the render forever.
  if (typeof document === "undefined") return Promise.resolve(false);
  return getDefaultConfirmManager().confirm(options);
};
