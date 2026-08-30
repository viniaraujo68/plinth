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
  import { Toaster } from "$lib/toast/index.js";
  import type { Snippet } from "svelte";
  import { toasterPosition } from "./toaster-position.svelte.js";

  const { children }: { children: Snippet } = $props();

  // The showcase is prerendered, so there is no request to read the cookie from at build time.
  // "system" is the safe seed: it is also the state the emitted HTML encodes, so a visitor who
  // never picked a theme gets the right paint with no correction on hydration.
  setThemeContext(new ThemeContext(browser ? readThemePreference() : "system"));

  const NAV = [
    { href: resolve("/"), label: "Overview" },
    { href: resolve("/theme"), label: "Theme" },
    { href: resolve("/components"), label: "Components" },
  ];

  // A section stays marked as current while a page below it is open, so "Components" reads as the
  // active tab on `/components/modal` too. The root is the exception: everything is below it.
  const isCurrent = (href: string) =>
    href === resolve("/")
      ? page.url.pathname === href
      : page.url.pathname === href || page.url.pathname.startsWith(`${href}/`);
</script>

<ThemeController />

<div class="flex min-h-screen flex-col bg-base-100 text-base-content">
  <header
    class="sticky top-0 z-10 flex items-center gap-4 border-b border-base-content/10 bg-base-100/80 px-6 py-3 backdrop-blur"
  >
    <a href={resolve("/")} class="font-mono text-sm font-medium tracking-tight">plinth</a>
    <nav class="tabs tabs-border flex-1" aria-label="Showcase sections">
      {#each NAV as entry (entry.href)}
        <a class="tab" href={entry.href} aria-current={isCurrent(entry.href) ? "page" : undefined}>
          {entry.label}
        </a>
      {/each}
    </nav>
    <ThemeToggle />
  </header>

  {@render children()}
</div>

<!-- Mounted once, outside the routed subtree, exactly as an app should: a toast fired just before
     a navigation has to survive the page that fired it. -->
<Toaster position={toasterPosition.value} />
