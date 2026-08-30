<script lang="ts">
  import { setUserContext, type UserContext } from "$lib/user/index.js";
  import { untrack, type Snippet } from "svelte";

  const { user, children }: { user: UserContext; children: Snippet } = $props();

  // An app does this once in its root layout. Here it wraps only part of the page, so the
  // sections outside it are still running on the anonymous default -- which is the comparison
  // this demo is about.
  //
  // The store is installed once and then mutates internally; reading the prop untracked says so.
  setUserContext(untrack(() => user));
</script>

<!--
@component
Installs a `UserContext` for its subtree.
-->

{@render children()}
