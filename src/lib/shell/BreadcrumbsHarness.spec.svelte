<script lang="ts">
  import { untrack } from "svelte";
  import { setRoutingContext, type RoutingContext } from "../routing.svelte.js";
  import Breadcrumbs from "./Breadcrumbs.svelte";
  import type { Crumb } from "./crumbs.js";

  interface Props {
    /** Omitted for the custom-trail case, which must work in an app with no routing at all. */
    routing?: RoutingContext;
    crumbs?: Crumb[];
  }

  const { routing, crumbs }: Props = $props();

  // svelte-ignore state_referenced_locally
  if (routing) setRoutingContext(untrack(() => routing));
</script>

<Breadcrumbs {crumbs} />
