/** Shape of the work an action wraps. `never[]` keeps `Parameters<T>` inferring at the call site. */
export type AsyncFn = (...args: never[]) => Promise<unknown>;

export type AsyncActionStatus = "idle" | "pending" | "success" | "error";

/**
 * A promise-returning function plus the four-state machine every button around one ends up
 * re-implementing: idle, pending, success, error.
 *
 * ```svelte
 * <script lang="ts">
 *   import { AsyncAction } from "@viniaraujo68/plinth";
 *
 *   const save = new AsyncAction((draft: Draft) => api.save(draft));
 * </script>
 *
 * <button disabled={save.isPending} onclick={() => save.run(draft)}>Save</button>
 * {#if save.isError}<p class="text-error">Could not save.</p>{/if}
 * ```
 */
export class AsyncAction<T extends AsyncFn> {
  status = $state<AsyncActionStatus>("idle");
  error = $state<unknown>(null);

  isPending = $derived(this.status === "pending");
  isSuccess = $derived(this.status === "success");
  isError = $derived(this.status === "error");

  /**
   * Identifies the run whose result is allowed to write state. A second click while the first
   * call is still in flight makes the first one stale: without this, a slow success landing after
   * a fast failure would paint the button green.
   */
  #currentRun = 0;

  constructor(private fn: T) {}

  reset = (): void => {
    this.status = "idle";
    this.error = null;
    // Anything still in flight is abandoned rather than allowed to resurrect a settled state.
    this.#currentRun++;
  };

  /**
   * Runs the action and records the outcome.
   *
   * It never rejects: an event handler has nowhere to catch, so a rethrow here would surface as an
   * unhandled rejection instead of as UI. Failure is `error` and `isError`. A run that failed —
   * or that was superseded by a later `run`/`reset` — resolves to `undefined`.
   */
  run = async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>> | undefined> => {
    const run = ++this.#currentRun;
    this.status = "pending";
    this.error = null;

    try {
      const result = (await this.fn(...args)) as Awaited<ReturnType<T>>;
      if (run !== this.#currentRun) return undefined;
      this.status = "success";
      return result;
    } catch (failure) {
      if (run !== this.#currentRun) return undefined;
      this.status = "error";
      this.error = failure;
      return undefined;
    }
  };
}
