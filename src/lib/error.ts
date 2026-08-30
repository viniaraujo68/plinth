/** Anything that can receive an unexpected error: a console, a telemetry client, a test spy. */
export type ErrorReporter = (error: unknown) => void;

const consoleReporter: ErrorReporter = (error) => {
  console.error(error);
};

let reporter: ErrorReporter = consoleReporter;

/**
 * Install the app's reporter — Sentry, a logging endpoint, whatever the app already has.
 *
 * This is the whole point of routing reports through one function: the library and every app
 * component keep calling `reportError`, and only the app decides where that lands. Passing `null`
 * restores the console default, which is also what a test should do on teardown.
 */
export const setErrorReporter = (next: ErrorReporter | null): void => {
  reporter = next ?? consoleReporter;
};

/**
 * The single reporting channel for unexpected errors.
 *
 * Wire it at catch points — `svelte:boundary`'s `onerror`, SvelteKit's `handleError` hooks, a
 * handler that swallows a rejection — and never inside a component that merely *displays* a
 * failure, or the same error gets reported once per render.
 *
 * ```svelte
 * <svelte:boundary onerror={reportError}>
 *   {@render children()}
 *   {#snippet failed(_error, reset)}<ErrorDisplay {reset} />{/snippet}
 * </svelte:boundary>
 * ```
 */
export const reportError = (error: unknown): void => {
  try {
    reporter(error);
  } catch (reporterFailure) {
    // A reporter that throws would replace the original failure with its own, inside a handler
    // whose job was to contain a crash. The original error is the one worth keeping.
    consoleReporter(error);
    consoleReporter(reporterFailure);
  }
};
