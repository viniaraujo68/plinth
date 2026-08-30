<script lang="ts">
  import "./layout.css";
  import type { Snippet } from "svelte";

  const { children }: { children: Snippet } = $props();
</script>

<div class="min-h-screen bg-base-100 text-base-content">
  {@render children()}
</div>
