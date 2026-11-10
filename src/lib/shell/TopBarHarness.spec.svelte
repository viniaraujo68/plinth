<script lang="ts">
  import { untrack } from "svelte";
  import { setUserContext, type UserContext } from "../user/context.js";
  import TopBar from "./TopBar.svelte";

  const { user }: { user?: UserContext } = $props();

  // svelte-ignore state_referenced_locally
  if (user) setUserContext(untrack(() => user));
</script>

<TopBar menuLabel="Account menu" logoutLabel="Sign out">
  {#snippet brand()}<a href="#home" data-testid="brand">Acme</a>{/snippet}
  {#snippet actions()}<button type="button">Theme</button>{/snippet}
  {#snippet menu()}<li><a href="#account">Account</a></li>{/snippet}
</TopBar>
