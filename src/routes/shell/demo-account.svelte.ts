import type { UserContext, UserData, UserStatus } from "$lib/user/index.js";

/**
 * The stand-in the shell demo signs in and out of — the shape a real store has, with the network
 * swapped for a row of buttons.
 *
 * `logout` is derived rather than declared because its *absence* is a state the shell reacts to:
 * a context with nowhere to sign out to gets no sign-out button at all, and that is only worth
 * demonstrating if it can be toggled on a live tree.
 */
export class DemoAccount implements UserContext {
  status: UserStatus = $state("authenticated");
  roles: string[] = $state(["reports:read"]);
  canSignOut = $state(true);

  data: UserData | null = $derived(
    this.status === "authenticated" ? { name: "Ada Lovelace", email: "ada@example.test" } : null,
  );

  logout: (() => void) | undefined = $derived(
    this.canSignOut
      ? () => {
          this.status = "anonymous";
        }
      : undefined,
  );

  private get signedIn() {
    return this.status === "authenticated";
  }

  hasRole = (role: string) => this.signedIn && this.roles.includes(role);

  hasAnyRole = (roles: readonly string[]) =>
    roles.length === 0 || (this.signedIn && roles.some((role) => this.roles.includes(role)));

  hasAllRoles = (roles: readonly string[]) =>
    roles.length === 0 || (this.signedIn && roles.every((role) => this.roles.includes(role)));
}
