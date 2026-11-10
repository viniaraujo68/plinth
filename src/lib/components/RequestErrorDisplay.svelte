<script lang="ts">
  import { classifyError } from "../http.js";
  import ErrorDisplay from "./ErrorDisplay.svelte";
  import {
    DEFAULT_REQUEST_ERROR_COPY,
    REQUEST_ERROR_ICONS,
    type RequestErrorLabels,
  } from "./request-error.js";

  interface Props {
    error: unknown;
    reset?: () => void;
    labels?: RequestErrorLabels;
    eyebrow?: string;
    retryLabel?: string;
  }

  let { error, reset, labels, eyebrow = "Error", retryLabel = "Try again" }: Props = $props();

  const kind = $derived(classifyError(error));
  const copy = $derived({ ...DEFAULT_REQUEST_ERROR_COPY[kind], ...labels?.[kind] });
</script>

<div class="contents" data-kind={kind}>
  <ErrorDisplay {reset} title={copy.title} message={copy.message} {eyebrow} {retryLabel}>
    {#snippet icon()}
      <svg
        class="size-12 text-base-content/40"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        {#each REQUEST_ERROR_ICONS[kind] as d (d)}
          <path {d} />
        {/each}
      </svg>
    {/snippet}
  </ErrorDisplay>
</div>
