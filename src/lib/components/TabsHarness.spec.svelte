<script lang="ts">
  import Tabs from "./Tabs.svelte";

  interface Props {
    onchange?: (id: string) => void;
    center?: boolean;
    width?: string;
  }

  const { onchange, center = false, width = "40rem" }: Props = $props();

  const TABS = [
    { id: "matchdays", label: "Matchdays" },
    { id: "ranking", label: "Ranking" },
    { id: "players", label: "Players" },
    { id: "stats", label: "Group stats" },
  ];

  let value = $state("ranking");
</script>

<div style:width>
  <Tabs
    tabs={TABS}
    bind:value
    label="Sections"
    controls="panel"
    idPrefix="tab"
    {center}
    {onchange}
  />
  <div id="panel" role="tabpanel" aria-labelledby="tab-{value}">Showing {value}</div>
</div>
