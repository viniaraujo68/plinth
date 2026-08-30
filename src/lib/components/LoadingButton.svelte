<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLButtonAttributes } from "svelte/elements";

  interface Props extends HTMLButtonAttributes {
    children: Snippet;
    /** Shows the spinner and blocks the button. The caller owns this flag. */
    loading?: boolean;
  }

  // `type` defaults to "submit" in HTML, so a button dropped into a form to run a handler also
  // submits that form. This one asks to be told when that is what you meant.
  let { children, loading = false, disabled, type = "button", ...rest }: Props = $props();
</script>

<!--
@component
A button that grows a spinner and stops accepting clicks while `loading` is set.

It is a plain `<button>` with everything forwarded, so it takes the app's own classes — the
library never decides that a button is `btn-primary`. The label is kept on screen next to the
spinner instead of being swapped out, because a button that changes width mid-click moves whatever
sits next to it.

```svelte
<LoadingButton class="btn btn-primary" loading={saving} onclick={save}>Save</LoadingButton>
```
-->

<button {...rest} {type} disabled={loading || disabled} aria-busy={loading}>
  {#if loading}
    <!-- Decorative: `aria-busy` above is what a screen reader announces. -->
    <span class="loading loading-xs loading-spinner" aria-hidden="true"></span>
  {/if}
  {@render children()}
</button>
