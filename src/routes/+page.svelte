<script lang="ts">
  import { LIBRARY_VERSION } from "$lib/index.js";
</script>

<main class="mx-auto flex max-w-2xl flex-col gap-4 p-8">
  <h1 class="text-3xl font-bold">plinth</h1>
  <p class="text-base-content/70">
    A personal Svelte 5 design system. This site is the living documentation: one route per area of
    the library.
  </p>
  <p>
    <span class="badge badge-primary" data-testid="version">v{LIBRARY_VERSION}</span>
  </p>
</main>
