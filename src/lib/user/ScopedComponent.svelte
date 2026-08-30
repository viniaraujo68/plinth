<script lang="ts">
  import type { Snippet } from "svelte";
  import { getUserContext } from "./context.js";

  interface Props {
    /** Roles the user must hold. An empty list is an open gate. */
    roles: readonly string[];
    /** Require every role instead of at least one. */
    requiresAll?: boolean;
    children: Snippet;
    /** Rendered instead of `children` when the check fails. Nothing renders without it. */
    fallback?: Snippet;
  }

  let { roles, requiresAll = false, children, fallback }: Props = $props();

  const user = getUserContext();

  // Reading the check inside `$derived` rather than at init is what makes the gate follow a
  // sign-in: the user context is expected to be reactive, so this re-runs when its status or
  // roles change and the subtree appears without a remount.
  const allowed = $derived(requiresAll ? user.hasAllRoles(roles) : user.hasAnyRole(roles));
</script>

<!--
@component
Renders its children only for a user holding the required roles.

The check delegates entirely to the `UserContext` in scope; with no context set, the anonymous
default lets everything through, so a gated subtree still renders in an app that has no
authentication yet.

```svelte
<ScopedComponent roles={["orders:write"]}>
  <button>Approve</button>
  {#snippet fallback()}
    <span class="opacity-50">Read-only</span>
  {/snippet}
</ScopedComponent>
```
-->

{#if allowed}
  {@render children()}
{:else if fallback}
  {@render fallback()}
{/if}
