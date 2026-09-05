<script lang="ts">
  import { onDestroy, type Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";

  type Props = HTMLAttributes<HTMLSpanElement> & {
    children: Snippet;
    /** Text put on the clipboard. Defaults to the rendered text, which is what you want whenever
        the content already *is* the value; pass it when the two differ — a truncated label, a
        formatted number, a link whose text is shorter than its id. */
    copyableText?: string | null;
    /** How long the confirmation stays up, in milliseconds. */
    confirmationMs?: number;
    /** Accessible name of the button while it is waiting to be pressed. */
    copyLabel?: string;
    /** Accessible name of the button while the confirmation is up. */
    copiedLabel?: string;
  };

  let {
    class: className,
    children,
    copyableText,
    confirmationMs = 1200,
    copyLabel = "Copy",
    copiedLabel = "Copied",
    ...rest
  }: Props = $props();

  let content = $state<HTMLElement>();
  let copied = $state(false);
  let resetTimer: ReturnType<typeof setTimeout> | undefined;

  const copy = async () => {
    try {
      // `innerText` rather than `textContent`: it reads what is laid out, so a hidden helper span
      // inside the content does not end up on the clipboard.
      await navigator.clipboard.writeText(copyableText ?? content!.innerText);
    } catch {
      // A rejected write means the browser refused the clipboard — an insecure origin, or a
      // denied permission. Nothing was copied, so the confirmation must not appear; there is no
      // sensible recovery at this level, and the caller's own error channel is the wrong place
      // for a failure the user can see for themselves.
      return;
    }
    copied = true;
    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => (copied = false), confirmationMs);
  };

  onDestroy(() => clearTimeout(resetTimer));
</script>

<!--
@component
Renders content beside a copy button. The content is an ordinary slot — text, a link, any markup —
and only the button copies, so whatever is in there keeps its own behavior: a link stays
navigable, a value stays selectable.

The button confirms with a check for a moment after a successful write, and stays silent when the
browser refuses the clipboard, so the confirmation never claims a copy that did not happen. Its
accessible name carries that state, since the icon alone is invisible to a screen reader.

Both of those names are props with an English default — `copyLabel` and `copiedLabel` — because the
library ships no translations. They are the whole of the copy: the button has no visible text, and
a refused clipboard stays silent rather than saying so.

```svelte
<Copyable class="font-mono text-xs" copyableText={id}>
  <a class="link" href={href}>{id}</a>
</Copyable>
```
-->

<span {...rest} class={["inline-flex items-center gap-1", className]}>
  <button
    type="button"
    class="copy-button inline-flex shrink-0 items-center"
    aria-label={copied ? copiedLabel : copyLabel}
    onclick={copy}
  >
    <!-- Inline paths rather than an icon-font class: the library must render correctly in a
         consumer that has no icon plugin in its Tailwind chain. Sized in `em` so it tracks the
         surrounding text. -->
    <svg
      class="size-[0.9em]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      {#if copied}
        <path d="m4 12.5 5 5L20 6.5" />
      {:else}
        <rect x="9" y="9" width="11" height="11" rx="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      {/if}
    </svg>
  </button>
  <span bind:this={content} class="min-w-0 truncate">{@render children()}</span>
</span>

<style>
  .copy-button {
    color: color-mix(in oklch, currentColor 45%, transparent);
    cursor: pointer;
  }
  .copy-button:hover {
    color: currentColor;
  }
  .copy-button:active {
    transform: translateY(1px);
  }
</style>
