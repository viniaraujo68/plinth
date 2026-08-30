import type { UserContext, UserData, UserStatus } from "$lib/user/index.js";

/**
 * A stand-in for the auth-backed store an app would supply. It is the shape of every real
 * implementation — reactive fields, flat role names, no knowledge of where any of it came from —
 * with the network replaced by two form controls.
 *
 * The interface says an empty role list is an open gate, and that holds for every status: an
 * ungated resource is not something an anonymous visitor should be shut out of. Only a non-empty
 * list needs an authenticated user behind it.
 */
export class DemoUser implements UserContext {
  status: UserStatus = $state("anonymous");
  roles: string[] = $state([]);

  data: UserData | null = $derived(
    this.status === "authenticated" ? { name: "Ada Lovelace", email: "ada@example.test" } : null,
  );

  private get signedIn() {
    return this.status === "authenticated";
  }

  hasRole = (role: string) => this.signedIn && this.roles.includes(role);

  hasAnyRole = (roles: readonly string[]) =>
    roles.length === 0 || (this.signedIn && roles.some((role) => this.roles.includes(role)));

  hasAllRoles = (roles: readonly string[]) =>
    roles.length === 0 || (this.signedIn && roles.every((role) => this.roles.includes(role)));

  logout = () => {
    this.status = "anonymous";
    this.roles = [];
  };
}
