<script lang="ts">
  import "./layout.css";
  import { browser } from "$app/environment";
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import {
    readThemePreference,
    setThemeContext,
    ThemeContext,
    ThemeController,
    ThemeToggle,
  } from "$lib/theme/index.js";
  import type { Snippet } from "svelte";

  const { children }: { children: Snippet } = $props();

  // The showcase is prerendered, so there is no request to read the cookie from at build time.
  // "system" is the safe seed: it is also the state the emitted HTML encodes, so a visitor who
  // never picked a theme gets the right paint with no correction on hydration.
  setThemeContext(new ThemeContext(browser ? readThemePreference() : "system"));

  const NAV = [
    { href: resolve("/"), label: "Overview" },
    { href: resolve("/theme"), label: "Theme" },
  ];
</script>

<ThemeController />

<div class="flex min-h-screen flex-col bg-base-100 text-base-content">
  <header
    class="sticky top-0 z-10 flex items-center gap-4 border-b border-base-content/10 bg-base-100/80 px-6 py-3 backdrop-blur"
  >
    <a href={resolve("/")} class="font-mono text-sm font-medium tracking-tight">plinth</a>
    <nav class="tabs tabs-border flex-1" aria-label="Showcase sections">
      {#each NAV as entry (entry.href)}
        <a
          class="tab"
          href={entry.href}
          aria-current={page.url.pathname === entry.href ? "page" : undefined}
        >
          {entry.label}
        </a>
      {/each}
    </nav>
    <ThemeToggle />
  </header>

  {@render children()}
</div>
