import { createContext } from "svelte";
import { anonymousUser } from "./anonymous.js";

/**
 * Where the app is in figuring out who the user is.
 *
 * Four states, and each one exists because chrome has to render differently for it: nobody is
 * signed in, we do not know yet, we know, and we tried and failed. Everything finer — token
 * about to expire, silent renewal in flight, re-authentication required — is the business of
 * whichever auth library the app chose, and stays there.
 */
export type UserStatus = "anonymous" | "loading" | "authenticated" | "error";

/** The only user fields the library itself renders: an avatar's name and the address under it. */
export interface UserData {
  name: string;
  email: string;
}

/**
 * The seam between an app's authentication and this library's gates.
 *
 * Deliberately an interface with no implementation behind it. The library needs to ask two
 * questions — who is this, and may they see this — and any answer will do: a cookie session
 * against your own backend, a JWT from a hosted provider, a hard-coded object in a test. None
 * of that leaks in here, and no dependency comes with it.
 *
 * Implementations are expected to be reactive (a class with `$state` fields, typically), since
 * `ScopedComponent` reads them inside a `$derived`.
 *
 * ```ts
 * import { setUserContext } from "@viniaraujo68/plinth/user";
 *
 * setUserContext(myUserStore);
 * ```
 */
export interface UserContext {
  status: UserStatus;
  /** `null` unless `status` is `"authenticated"`. */
  data: UserData | null;
  hasRole: (role: string) => boolean;
  /** True when `roles` is empty — an ungated resource is open to everyone. */
  hasAnyRole: (roles: readonly string[]) => boolean;
  /** True when `roles` is empty, for the same reason as `hasAnyRole`. */
  hasAllRoles: (roles: readonly string[]) => boolean;
  /** Present only if the app has somewhere to sign out to. Shell chrome hides its sign-out
   * control when it is missing rather than rendering a button that does nothing. */
  logout?: () => void | Promise<void>;
}

const [readUserContext, setUserContext, hasUserContext] = createContext<UserContext>();

/**
 * The user context for the current component tree, or {@link anonymousUser} when the app never
 * set one.
 *
 * The fallback is what lets a component that gates on roles be dropped into an app with no
 * authentication at all and still render. Like every context read, this has to run while the
 * component is initialising.
 */
export const getUserContext = (): UserContext =>
  hasUserContext() ? readUserContext() : anonymousUser;

export { setUserContext };
