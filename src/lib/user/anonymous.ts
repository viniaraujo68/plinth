import type { UserContext } from "./context.js";

/**
 * The user context in force until an app installs its own.
 *
 * Nobody is signed in, and every role check answers `true`. That reads backwards for something
 * whose job is to deny, so it is worth being explicit about why it is the right default.
 *
 * A role gate is a *statement about the app's intent*, not a security control — the server is
 * what actually refuses to serve the data. So the question is only what an unauthenticated
 * library should do with an intent it has no way to evaluate. Denying would mean a route tree
 * annotated with `requiredRoles` renders as an empty shell the moment you clone it, and the
 * annotation would have to be commented out to develop against it. Allowing makes the gates
 * advisory: they sit in the config, describing the eventual policy, doing nothing, until the
 * day the app calls `setUserContext` with something that can actually answer. From that call
 * on, every gate is live at once, with no other edit.
 *
 * The failure mode of the opposite choice — an app that ships without ever setting a context
 * and hides its own UI — is silent and confusing. This one is loud: everything is visible,
 * `status` says `"anonymous"`, and nothing pretends a user exists.
 */
export const anonymousUser: UserContext = {
  status: "anonymous",
  data: null,
  hasRole: () => true,
  hasAnyRole: () => true,
  hasAllRoles: () => true,
};
