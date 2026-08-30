<script lang="ts">
  import Tooltip from "./Tooltip.svelte";

  interface Props {
    /** Which host tag to exercise. The two are separate branches rather than one dynamic `as`
        because `as` drives the component's generic parameter, and a union would widen the props
        it accepts to the intersection of both elements. */
    host?: "button" | "span";
    disabled?: boolean;
  }

  let { host = "span", disabled = false }: Props = $props();
</script>

<!--
@component
Test-only host for `Tooltip`, which takes its content as snippets and so cannot be driven through
`render` props alone. Named `*.spec.svelte` so packaging drops it.
-->

{#if host === "button"}
  <Tooltip as="button" tooltipDisabled={disabled}>
    {#snippet tooltip()}
      Publishes to <strong>everyone</strong>
    {/snippet}
    Publish
  </Tooltip>
{:else}
  <Tooltip tooltipDisabled={disabled}>
    {#snippet tooltip()}
      Publishes to <strong>everyone</strong>
    {/snippet}
    Publish
  </Tooltip>
{/if}
