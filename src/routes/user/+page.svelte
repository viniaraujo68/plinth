<script lang="ts">
  import { ScopedComponent, type UserStatus } from "$lib/user/index.js";
  import { DemoUser } from "./demo-user.svelte.js";
  import UserProvider from "./UserProvider.svelte";

  const user = new DemoUser();

  const STATUSES: UserStatus[] = ["anonymous", "loading", "authenticated", "error"];
  const ROLES = ["orders:read", "orders:write", "reports:read"];

  let requiresAll = $state(false);

  const toggleRole = (role: string) => {
    user.roles = user.roles.includes(role)
      ? user.roles.filter((held) => held !== role)
      : [...user.roles, role];
  };
</script>

<main class="mx-auto flex w-full max-w-4xl flex-col gap-12 p-6 sm:p-10">
  <header class="flex flex-col gap-3">
    <h1 class="text-3xl font-semibold tracking-tight">User</h1>
    <p class="max-w-2xl text-base-content/70">
      An interface and a component, and no authentication at all. The library needs to ask two
      questions — who is this, and may they see this — and every app answers them differently: a
      session cookie, a hosted identity provider, a row in a database. So the answer is a
      <code class="kbd kbd-sm">UserContext</code> the app installs, and nothing here ever talks to a network.
    </p>
  </header>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
      With no context at all
    </h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      This part of the page sets nothing, so the anonymous default is in force: nobody is signed in,
      and every role check answers yes. That looks backwards for a gate until you consider the
      alternative — an app you have just cloned, with routes already annotated
      <code class="kbd kbd-sm">requiredRoles</code>, rendering as an empty shell until you bolt on
      auth. Gates stay advisory, describing the eventual policy, until the day
      <code class="kbd kbd-sm">setUserContext</code> is called with something that can really answer.
      Then all of them go live at once, with no other edit.
    </p>
    <div class="rounded-box border border-base-content/10 bg-base-200/40 p-4" data-testid="default">
      <ScopedComponent roles={["orders:write"]}>
        <p class="text-sm">Gated on <code class="kbd kbd-sm">orders:write</code> — and visible.</p>
        {#snippet fallback()}
          <p class="text-sm text-base-content/50">Hidden.</p>
        {/snippet}
      </ScopedComponent>
    </div>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
      With a user installed
    </h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      Below this line a demo store is in context — the same shape a real one has, with the network
      swapped for these controls. Change the status or the roles and the gates follow without a
      remount, because <code class="kbd kbd-sm">ScopedComponent</code> reads the check inside a
      <code class="kbd kbd-sm">$derived</code>.
    </p>

    <fieldset class="flex flex-wrap items-center gap-6 rounded-box bg-base-200/40 p-4">
      <label class="form-control">
        <span class="label-text text-xs text-base-content/50">status</span>
        <select class="select w-44 select-sm" bind:value={user.status} data-testid="status">
          {#each STATUSES as status (status)}
            <option value={status}>{status}</option>
          {/each}
        </select>
      </label>

      <div class="flex flex-col gap-1">
        <span class="text-xs text-base-content/50">roles</span>
        <div class="flex flex-wrap gap-3">
          {#each ROLES as role (role)}
            <label class="label cursor-pointer justify-start gap-2">
              <input
                type="checkbox"
                class="checkbox checkbox-sm"
                checked={user.roles.includes(role)}
                onchange={() => toggleRole(role)}
                data-testid="role-{role}"
              />
              <span class="text-sm">{role}</span>
            </label>
          {/each}
        </div>
      </div>

      <label class="label cursor-pointer justify-start gap-2">
        <input
          type="checkbox"
          class="toggle toggle-sm"
          bind:checked={requiresAll}
          data-testid="requires-all"
        />
        <span class="text-sm">requiresAll</span>
      </label>
    </fieldset>

    <UserProvider {user}>
      <div class="flex flex-col gap-4 rounded-box border border-base-content/10 p-4">
        <div class="flex items-center gap-3" data-testid="identity">
          <div class="avatar avatar-placeholder">
            <div class="w-10 rounded-full bg-neutral text-neutral-content">
              <span class="text-sm">{user.data?.name.charAt(0) ?? "?"}</span>
            </div>
          </div>
          <div class="flex flex-col">
            <span class="text-sm font-medium">{user.data?.name ?? "Not signed in"}</span>
            <span class="text-xs text-base-content/50">{user.data?.email ?? user.status}</span>
          </div>
          {#if user.logout}
            <button
              type="button"
              class="btn ml-auto btn-ghost btn-sm"
              onclick={() => void user.logout?.()}
            >
              Sign out
            </button>
          {/if}
        </div>

        <div class="flex flex-col gap-3">
          {#each ROLES as role (role)}
            <ScopedComponent roles={[role]}>
              <p class="text-sm" data-testid="single-{role}">
                <span class="badge badge-soft badge-sm badge-success">shown</span>
                gated on <code class="kbd kbd-sm">{role}</code>
              </p>
              {#snippet fallback()}
                <p class="text-sm text-base-content/40" data-testid="single-{role}-denied">
                  <span class="badge badge-soft badge-sm">hidden</span>
                  gated on <code class="kbd kbd-sm">{role}</code>
                </p>
              {/snippet}
            </ScopedComponent>
          {/each}

          <ScopedComponent roles={["orders:read", "orders:write"]} {requiresAll}>
            <p class="text-sm" data-testid="combined">
              <span class="badge badge-soft badge-sm badge-success">shown</span>
              gated on <code class="kbd kbd-sm">orders:read</code> +
              <code class="kbd kbd-sm">orders:write</code>
            </p>
            {#snippet fallback()}
              <p class="text-sm text-base-content/40" data-testid="combined-denied">
                <span class="badge badge-soft badge-sm">hidden</span>
                gated on <code class="kbd kbd-sm">orders:read</code> +
                <code class="kbd kbd-sm">orders:write</code>
              </p>
            {/snippet}
          </ScopedComponent>

          <ScopedComponent roles={[]}>
            <p class="text-sm text-base-content/70" data-testid="ungated">
              An empty role list is an open gate — this stays visible for every status, including
              anonymous.
            </p>
          </ScopedComponent>
        </div>
      </div>
    </UserProvider>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
      What an app implements
    </h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      Reactive fields, flat role names, and whatever source of truth the project already has. The
      library never learns which one it is.
    </p>
    <pre class="overflow-x-auto rounded-box bg-base-200 p-4 text-xs leading-relaxed"><code
        >{`import { setUserContext, type UserContext } from "@viniaraujo68/plinth/user";

class SessionUser implements UserContext {
  status = $state<UserStatus>("loading");
  data = $state<UserData | null>(null);
  roles = $state<string[]>([]);

  hasRole = (role: string) => this.roles.includes(role);
  hasAnyRole = (roles: readonly string[]) =>
    roles.length === 0 || roles.some((role) => this.roles.includes(role));
  hasAllRoles = (roles: readonly string[]) =>
    roles.length === 0 || roles.every((role) => this.roles.includes(role));
  logout = () => fetch("/api/logout", { method: "POST" });
}

setUserContext(new SessionUser());`}</code
      ></pre>
    <p class="max-w-2xl text-sm text-base-content/70">
      A role gate is a statement of intent, not a security control — the server is what actually
      refuses to serve the data. Hiding a button the user cannot use is a courtesy; it is not the
      thing standing between them and the record.
    </p>
  </section>
</main>
