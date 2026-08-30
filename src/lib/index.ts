/**
 * The published version of this package.
 *
 * Declared as a literal instead of being read back from `package.json`: the packaged output has
 * no portable way to import its own manifest, and a consumer that only wants to log a version
 * should not have to bundle one. `version.spec.ts` fails when this drifts from the manifest.
 */
export const LIBRARY_VERSION = "0.1.0";

// The root entry carries only what is not tied to one area: the error channel an app installs
// once, and the async state machine the components are built on. Everything visual is reached
// through a subpath — `/theme`, `/attachments`, `/components`, `/toast` — so importing a button
// never drags the toast queue into the bundle.
export { AsyncAction, type AsyncActionStatus, type AsyncFn } from "./async-action.svelte.js";
export { reportError, setErrorReporter, type ErrorReporter } from "./error.js";
