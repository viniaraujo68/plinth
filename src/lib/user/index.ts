// The identity seam, and nothing more. There is no store, no provider and no network call here
// on purpose: the library only ever needs to ask who the user is and whether they hold a role,
// and every app answers that differently. `@viniaraujo68/plinth/user`.
export { anonymousUser } from "./anonymous.js";
export {
  getUserContext,
  setUserContext,
  type UserContext,
  type UserData,
  type UserStatus,
} from "./context.js";
export { default as ScopedComponent } from "./ScopedComponent.svelte";
