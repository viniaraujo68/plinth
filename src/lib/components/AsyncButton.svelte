<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLButtonAttributes } from "svelte/elements";
  import { AsyncAction } from "../async-action.svelte.js";
  import { reportError } from "../error.js";
  import LoadingButton from "./LoadingButton.svelte";

  type ButtonClickEvent = MouseEvent & { currentTarget: EventTarget & HTMLButtonElement };

  interface Props extends Omit<HTMLButtonAttributes, "onclick"> {
    children: Snippet;
    /** May return a promise; the button stays busy until it settles. */
    onclick?: (event: ButtonClickEvent) => unknown;
    /**
     * Handles a rejection from `onclick`. Without it the failure goes to `reportError`, so a
     * silent swallow is never the default.
     */
    onerror?: (error: unknown) => void;
  }

  let { children, onclick, onerror, ...rest }: Props = $props();

  const action = new AsyncAction(async (event: ButtonClickEvent) => await onclick?.(event));

  const handleClick = async (event: ButtonClickEvent) => {
    await action.run(event);
    if (action.isError) (onerror ?? reportError)(action.error);
  };
</script>

<!--
@component
`LoadingButton` that derives its own busy state from the handler it was given: the click is
awaited, the spinner runs for exactly as long as the promise, and a second click cannot start
while the first is in flight.

The rejection is caught here — an event handler has no caller to catch for it — and handed to
`onerror`, or to `reportError` when the app has not said what to do with it.

```svelte
<AsyncButton class="btn btn-primary" onclick={() => api.publish(id)} onerror={showToast}>
  Publish
</AsyncButton>
```
-->

<LoadingButton {...rest} loading={action.isPending} onclick={handleClick}>
  {@render children()}
</LoadingButton>
