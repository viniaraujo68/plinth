<script lang="ts">
  import type { HTMLButtonAttributes } from "svelte/elements";

  interface Props extends Omit<HTMLButtonAttributes, "type" | "children"> {
    label: string;
  }

  let { label, class: className = "", ...rest }: Props = $props();
</script>

<button
  {...rest}
  type="button"
  aria-label={label}
  data-sortable-handle
  class="inline-grid shrink-0 cursor-grab touch-none place-items-center self-stretch px-1 text-base-content/45 select-none hover:text-base-content focus-visible:text-base-content focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary in-data-sortable-dragging:cursor-grabbing {className}"
>
  <svg viewBox="0 0 10 15" class="h-[15px] w-2.5" fill="currentColor" aria-hidden="true">
    <circle cx="2.5" cy="2.5" r="1.5" />
    <circle cx="7.5" cy="2.5" r="1.5" />
    <circle cx="2.5" cy="7.5" r="1.5" />
    <circle cx="7.5" cy="7.5" r="1.5" />
    <circle cx="2.5" cy="12.5" r="1.5" />
    <circle cx="7.5" cy="12.5" r="1.5" />
  </svg>
</button>
