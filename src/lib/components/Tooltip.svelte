<script lang="ts" generics="T extends keyof SvelteHTMLElements = 'span'">
  import type { Snippet } from "svelte";
  import type { SvelteHTMLElements } from "svelte/elements";
  import { tooltipPanel } from "../attachments/tooltip.js";

  type Props = SvelteHTMLElements[T] & {
    /** Tag rendered as the host. It is this component's root, so classes, event handlers and
        aria attributes land on the real element rather than on a wrapper. */
    as?: T;
    children: Snippet;
    tooltip: Snippet;
    /** Suppresses the panel while keeping the host and the wiring identical. */
    tooltipDisabled?: boolean | null;
  };

  // Deliberately not defaulted here: `"span"` is not assignable to `T`, since a caller may
  // instantiate `T` as something narrower without ever passing `as`. The fallback lives on
  // `svelte:element`, whose `this` takes any tag name.
  let { as, children, tooltip, tooltipDisabled, ...rest }: Props = $props();

  let panel = $state<HTMLDivElement>();
</script>

<!--
@component
Renders the host element itself — `as`, a span by default — carrying a tooltip whose content is a
snippet. Everything else you pass lands on the host, so it stays a normal element in its parent's
layout. The panel is written declaratively so the snippet keeps its component context and any
scoped styles the caller relies on.

The host is focusable by default (`tabindex={0}`) because the show/hide wiring listens for
focusin/focusout, and a bare span never receives either — the tooltip would silently be
mouse-only. Pass your own `tabindex` to override that.

For plain text on an element you already render, the `tooltip` attachment is lighter: it creates
its panel on first hover, while this component's panel is in the DOM from the start (hidden by
`popover`, so it neither lays out nor paints). At table scale that is a fine trade; for hundreds
of instances or expensive content, prefer the attachment or a `Dropdown`, which mounts on demand.

```svelte
<Tooltip as="button" class="btn" onclick={save}>
  {#snippet tooltip()}
    Saves <strong>every</strong> pending change
  {/snippet}
  Save
</Tooltip>
```
-->

<svelte:element
  this={as ?? "span"}
  tabindex={0}
  {...rest}
  {@attach tooltipPanel(panel, { disabled: tooltipDisabled ?? false })}
>
  {@render children()}
</svelte:element>
<div bind:this={panel} popover="manual" role="tooltip">
  {@render tooltip()}
</div>
