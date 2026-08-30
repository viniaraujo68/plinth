/** Severity a toast carries. Maps to a daisyUI alert modifier and an icon in `Toaster`. */
export type ToastVariant = "info" | "success" | "warning" | "error";

/**
 * Where a `Toaster` anchors its stack. Mirrors daisyUI's two-axis toast placement, so the value
 * is a rendering concern only — the manager never sees it.
 */
export type ToastPosition =
  | "top-start"
  | "top-center"
  | "top-end"
  | "middle-start"
  | "middle-center"
  | "middle-end"
  | "bottom-start"
  | "bottom-center"
  | "bottom-end";

/** A queued notification. Produced by the manager; consumed by `Toaster`. */
export interface Toast {
  id: string;
  variant: ToastVariant;
  message: string;
  /** Secondary line, rendered smaller under the message. */
  description?: string;
  /** Milliseconds on screen. Anything non-finite or non-positive makes the toast sticky. */
  duration: number;
  dismissible: boolean;
  /** Set once per id, so an in-place update keeps the moment the toast first appeared. */
  createdAt: number;
}

export interface ToastOptions {
  /**
   * Reuse an id to replace a toast in place instead of stacking a second one. Everything except
   * `createdAt` is replaced, so an option left out falls back to the default rather than to the
   * previous toast's value.
   */
  id?: string;
  duration?: number;
  description?: string;
  dismissible?: boolean;
}

export interface ToastManagerOptions {
  /**
   * How many toasts may be on screen at once; the oldest is dropped to make room. A cap exists
   * because a failing loop can fire dozens of identical errors, and a stack taller than the
   * viewport hides the newest one — the only one still worth reading.
   */
  limit?: number;
  /** Per-variant auto-dismiss delays, merged over the defaults. */
  durations?: Partial<Record<ToastVariant, number>>;
}

/** Errors and warnings linger: they carry something the reader has to act on. */
const DEFAULT_DURATIONS: Record<ToastVariant, number> = {
  info: 4000,
  success: 3000,
  warning: 5000,
  error: 5000,
};

const DEFAULT_LIMIT = 5;

let nextSequence = 0;
const createToastId = () => `toast-${++nextSequence}`;

/**
 * Bookkeeping for one toast's auto-dismiss, kept out of `$state` on purpose: the countdown
 * changes on every hover and nothing renders from it, so making it reactive would only buy
 * needless invalidations of the toast list.
 */
interface DismissClock {
  handle: ReturnType<typeof setTimeout> | null;
  /** A sticky toast has no countdown at all and can only leave through `dismiss`. */
  sticky: boolean;
  /** What is left to run once the clock resumes. */
  remainingMs: number;
  /** `Date.now()` the running timeout fires at, or null while stopped. */
  deadline: number | null;
  paused: boolean;
}

/**
 * The queue behind `Toaster`. Owns ids, ordering, the stack cap and every auto-dismiss timer.
 *
 * Most apps never touch this class: `toast.success(...)` goes through the process-wide default
 * manager, and a single `<Toaster />` near the app root renders it. Construct one explicitly to
 * scope a queue to a subtree, or to give a test a manager it can throw away afterwards.
 */
export class ToastManager {
  #toasts = $state<Toast[]>([]);
  readonly #limit: number;
  readonly #durations: Record<ToastVariant, number>;

  // A plain Map, not `SvelteMap`: nothing renders from the clocks, so reactivity here would be
  // pure overhead. The rendered surface is `#toasts` and nothing else.
  // eslint-disable-next-line svelte/prefer-svelte-reactivity
  readonly #clocks = new Map<string, DismissClock>();

  constructor({ limit = DEFAULT_LIMIT, durations }: ToastManagerOptions = {}) {
    this.#limit = Math.max(1, limit);
    this.#durations = { ...DEFAULT_DURATIONS, ...durations };
  }

  /** Oldest first. Read-only by contract — every mutation goes through a method. */
  get toasts(): readonly Toast[] {
    return this.#toasts;
  }

  /** Push a toast (or replace the one already holding `options.id`) and return its id. */
  show = (message: string, options: ToastOptions = {}, variant: ToastVariant = "info"): string => {
    const id = options.id ?? createToastId();
    const existing = this.#toasts.find((toast) => toast.id === id);
    const next: Toast = {
      id,
      variant,
      message,
      description: options.description,
      duration: options.duration ?? this.#durations[variant],
      dismissible: options.dismissible ?? true,
      createdAt: existing?.createdAt ?? Date.now(),
    };

    this.#upsert(next);
    this.#enforceLimit();
    this.#restartClock(next);
    return id;
  };

  info = (message: string, options?: ToastOptions): string => this.show(message, options, "info");
  success = (message: string, options?: ToastOptions): string =>
    this.show(message, options, "success");
  warning = (message: string, options?: ToastOptions): string =>
    this.show(message, options, "warning");
  error = (message: string, options?: ToastOptions): string => this.show(message, options, "error");

  /** Remove one toast. Unknown ids are ignored, so a caller may dismiss twice. */
  dismiss = (id: string): void => {
    this.#remove(id);
  };

  /** Empty the queue. Useful on sign-out or on a navigation that invalidates every message. */
  clear = (): void => {
    for (const clock of this.#clocks.values()) if (clock.handle) clearTimeout(clock.handle);
    this.#clocks.clear();
    this.#toasts = [];
  };

  /**
   * Freeze a toast's countdown. `Toaster` calls this on hover and on focus so a toast cannot
   * vanish while it is being read or while its dismiss button is the focused element.
   */
  pause = (id: string): void => {
    const clock = this.#clocks.get(id);
    if (!clock || clock.paused) return;

    clock.paused = true;
    if (clock.handle === null) return;

    clearTimeout(clock.handle);
    clock.handle = null;
    clock.remainingMs = Math.max(0, (clock.deadline ?? Date.now()) - Date.now());
    clock.deadline = null;
  };

  /** Resume a frozen countdown from where `pause` left it. */
  resume = (id: string): void => {
    const clock = this.#clocks.get(id);
    if (!clock) return;

    clock.paused = false;
    this.#start(id);
  };

  #upsert(toast: Toast): void {
    const index = this.#toasts.findIndex((current) => current.id === toast.id);
    if (index === -1) this.#toasts.push(toast);
    else this.#toasts[index] = toast;
  }

  #enforceLimit(): void {
    // Drop from the front: the newest toast was just appended, and it is the one the caller
    // actually wants seen.
    while (this.#toasts.length > this.#limit) this.#remove(this.#toasts[0].id);
  }

  #remove(id: string): void {
    const clock = this.#clocks.get(id);
    if (clock?.handle) clearTimeout(clock.handle);
    this.#clocks.delete(id);
    this.#toasts = this.#toasts.filter((toast) => toast.id !== id);
  }

  #restartClock(toast: Toast): void {
    const previous = this.#clocks.get(toast.id);
    if (previous?.handle) clearTimeout(previous.handle);

    this.#clocks.set(toast.id, {
      handle: null,
      sticky: !Number.isFinite(toast.duration) || toast.duration <= 0,
      remainingMs: toast.duration,
      deadline: null,
      // An update that lands while the pointer rests on the toast (a retry turning an error into
      // a success) must stay frozen; starting a fresh countdown under the cursor would take the
      // message away without the reader ever leaving it.
      paused: previous?.paused ?? false,
    });

    this.#start(toast.id);
  }

  #start(id: string): void {
    const clock = this.#clocks.get(id);
    if (!clock || clock.paused || clock.sticky || clock.handle !== null) return;

    // Only reachable when a pause landed exactly on the deadline: the countdown is spent, so the
    // toast has already earned its exit.
    if (clock.remainingMs <= 0) {
      this.#remove(id);
      return;
    }

    clock.deadline = Date.now() + clock.remainingMs;
    clock.handle = setTimeout(() => {
      this.#remove(id);
    }, clock.remainingMs);
  }
}

export const createToastManager = (options?: ToastManagerOptions): ToastManager =>
  new ToastManager(options);

let browserManager: ToastManager | null = null;

/**
 * The manager backing the module-level `toast` helper.
 *
 * A singleton only in the browser. On the server every call hands back a fresh manager, because
 * a module-level queue there is shared by every concurrent request — one user's toast would be
 * rendered into another user's HTML.
 */
export const getDefaultToastManager = (): ToastManager => {
  if (typeof document === "undefined") return createToastManager();
  browserManager ??= createToastManager();
  return browserManager;
};

export interface ToastApi {
  show: (message: string, options?: ToastOptions, variant?: ToastVariant) => string;
  info: (message: string, options?: ToastOptions) => string;
  success: (message: string, options?: ToastOptions) => string;
  warning: (message: string, options?: ToastOptions) => string;
  error: (message: string, options?: ToastOptions) => string;
  dismiss: (id: string) => void;
  clear: () => void;
  pause: (id: string) => void;
  resume: (id: string) => void;
}

/**
 * The ergonomic entry point: `toast.error("Could not save")` from anywhere, with no context to
 * plumb and no import of the manager.
 *
 * Each call resolves the default manager rather than capturing it, so importing this module on
 * the server never creates the browser singleton.
 */
export const toast: ToastApi = {
  show: (message, options, variant) => getDefaultToastManager().show(message, options, variant),
  info: (message, options) => getDefaultToastManager().info(message, options),
  success: (message, options) => getDefaultToastManager().success(message, options),
  warning: (message, options) => getDefaultToastManager().warning(message, options),
  error: (message, options) => getDefaultToastManager().error(message, options),
  dismiss: (id) => getDefaultToastManager().dismiss(id),
  clear: () => getDefaultToastManager().clear(),
  pause: (id) => getDefaultToastManager().pause(id),
  resume: (id) => getDefaultToastManager().resume(id),
};
