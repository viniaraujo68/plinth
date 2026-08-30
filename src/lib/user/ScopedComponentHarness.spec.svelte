<script lang="ts">
  import { untrack } from "svelte";
  import { setUserContext, type UserContext } from "./context.js";
  import ScopedComponent from "./ScopedComponent.svelte";

  interface Props {
    /** Left out to exercise the anonymous default, which only applies when nothing was set. */
    user?: UserContext;
    roles: readonly string[];
    requiresAll?: boolean;
    withFallback?: boolean;
  }

  let { user, roles, requiresAll = false, withFallback = false }: Props = $props();

  // Context is installed once, during init, so reading the prop untracked is the intent rather
  // than an oversight -- swapping the whole store on a live tree is not a case worth testing.
  const initial = untrack(() => user);
  if (initial) setUserContext(initial);
</script>

<!--
@component
Test-only host for `ScopedComponent`. It exists because `setUserContext` has to run during a
component's initialisation, which a spec cannot do on its own. Named `*.spec.svelte` so
packaging drops it.
-->

{#snippet denied()}
  <p>denied</p>
{/snippet}

<ScopedComponent {roles} {requiresAll} fallback={withFallback ? denied : undefined}>
  <p>granted</p>
</ScopedComponent>
