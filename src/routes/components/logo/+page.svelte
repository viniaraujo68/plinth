<script lang="ts">
  import Logo from "$lib/components/Logo.svelte";

  let loading = $state(false);

  const load = () => {
    loading = true;
    setTimeout(() => (loading = false), 2000);
  };
</script>

<main class="mx-auto flex w-full max-w-4xl flex-col gap-12 p-6 sm:p-10">
  <header class="flex flex-col gap-3">
    <h1 class="text-3xl font-semibold tracking-tight">Logo</h1>
    <p class="max-w-2xl text-base-content/70">
      A guitar pick, drawn as one outline stroke. Animated, a lit third of that outline orbits the
      perimeter; standing still, it is the mark that fills an empty slot. Size comes from the font
      size and color from <code class="kbd kbd-sm">--color-base-content</code>, so it needs no props
      at all in the common case.
    </p>
  </header>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">States</h2>
    <div class="grid gap-4 sm:grid-cols-2">
      <figure class="flex flex-col gap-2">
        <div class="grid h-32 place-items-center rounded-box border border-base-content/10">
          <Logo class="text-4xl" data-testid="static" />
        </div>
        <figcaption class="font-mono text-xs text-base-content/50">&lt;Logo /&gt;</figcaption>
      </figure>
      <figure class="flex flex-col gap-2">
        <div class="grid h-32 place-items-center rounded-box border border-base-content/10">
          <Logo class="text-4xl" animated data-testid="animated" />
        </div>
        <figcaption class="font-mono text-xs text-base-content/50">
          &lt;Logo animated /&gt;
        </figcaption>
      </figure>
    </div>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">Scale</h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      The mark is one <code class="kbd kbd-sm">em</code> square and the stroke scales with it, so a type
      utility is the whole sizing API — nothing to keep in step from the outside.
    </p>
    <div class="flex flex-wrap items-end gap-8 rounded-box border border-base-content/10 p-6">
      {#each ["text-sm", "text-xl", "text-4xl", "text-7xl"] as size (size)}
        <figure class="flex flex-col items-center gap-2">
          <Logo class={size} animated />
          <figcaption class="font-mono text-xs text-base-content/50">{size}</figcaption>
        </figure>
      {/each}
    </div>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">Color</h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      The default is the theme's ink at full strength: an outline this thin is already quiet, and a
      lit third of it has to survive being a spinner. What keeps it from reading as content is that
      it is hollow. <code class="kbd kbd-sm">color</code> overrides it when the indicator sits on a surface
      that wants something else.
    </p>
    <div class="flex flex-wrap items-center gap-8 rounded-box border border-base-content/10 p-6">
      <Logo class="text-4xl" animated />
      <Logo class="text-4xl" animated color="var(--color-primary)" />
      <Logo
        class="text-4xl"
        animated
        color="color-mix(in oklch, var(--color-base-content) 30%, transparent)"
      />
      <div class="grid place-items-center rounded-box bg-primary p-4">
        <Logo class="text-4xl" animated color="var(--color-primary-content)" />
      </div>
    </div>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">In place</h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      The mark itself announces nothing, on purpose. The container that knows what is loading is the
      one that carries the role and the label.
    </p>
    <button type="button" class="btn w-fit btn-sm" data-testid="reload" onclick={load}>
      Reload
    </button>
    <div class="relative rounded-box border border-base-content/10">
      <table class="table table-sm">
        <thead>
          <tr><th>Batch</th><th>Status</th></tr>
        </thead>
        <tbody>
          <tr><td class="font-mono text-xs">b7f1c0a4</td><td>settled</td></tr>
          <tr><td class="font-mono text-xs">0a3d9e51</td><td>pending</td></tr>
          <tr><td class="font-mono text-xs">e2c8b410</td><td>settled</td></tr>
        </tbody>
      </table>
      {#if loading}
        <div
          class="absolute inset-0 grid place-items-center rounded-box bg-base-100/70"
          role="status"
          aria-label="Loading batches"
        >
          <Logo class="text-4xl" animated />
        </div>
      {/if}
    </div>
  </section>
</main>
