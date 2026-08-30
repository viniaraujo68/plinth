<script lang="ts">
  import { resolve } from "$app/paths";
  import LoadingButton from "$lib/components/LoadingButton.svelte";

  let loading = $state(false);
</script>

<main class="mx-auto flex w-full max-w-4xl flex-col gap-12 p-6 sm:p-10">
  <header class="flex flex-col gap-3">
    <h1 class="text-3xl font-semibold tracking-tight">LoadingButton</h1>
    <p class="max-w-2xl text-base-content/70">
      A plain button that grows a spinner and stops accepting clicks while <code class="kbd kbd-sm"
        >loading</code
      >
      is set. The caller owns the flag; for a button that derives it from the work itself, use
      <a class="link" href={resolve("/components/async-button")}>AsyncButton</a>.
    </p>
  </header>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">Live</h2>
    <div class="card flex-row flex-wrap items-center gap-4 rounded-box bg-base-200 p-4">
      <LoadingButton class="btn btn-primary" {loading} data-testid="demo"
        >Save changes</LoadingButton
      >
      <label class="label cursor-pointer gap-2">
        <input type="checkbox" class="toggle toggle-sm" bind:checked={loading} />
        <span class="text-sm">loading</span>
      </label>
      <span class="text-sm text-base-content/60">
        The label stays put: swapping it for the spinner would change the button's width mid-click.
      </span>
    </div>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">Variants</h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      Nothing about the look is decided by the library — every class is the app's own, and the whole
      button surface is forwarded.
    </p>
    <div class="flex flex-wrap items-center gap-3">
      <LoadingButton class="btn btn-primary" loading>Primary</LoadingButton>
      <LoadingButton class="btn btn-secondary" loading>Secondary</LoadingButton>
      <LoadingButton class="btn btn-ghost" loading>Ghost</LoadingButton>
      <LoadingButton class="btn btn-outline btn-sm" loading>Small</LoadingButton>
      <LoadingButton class="btn btn-primary" disabled>Disabled, not busy</LoadingButton>
    </div>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">Behaviour</h2>
    <ul class="list-inside list-disc text-sm text-base-content/70">
      <li>
        <code class="kbd kbd-sm">loading</code> both disables the button and sets
        <code class="kbd kbd-sm">aria-busy</code>, so the state is announced, not just drawn.
      </li>
      <li>
        <code class="kbd kbd-sm">type</code> defaults to <code class="kbd kbd-sm">"button"</code>,
        not to the HTML default of <code class="kbd kbd-sm">"submit"</code>: a button that runs a
        handler should not also submit the form it happens to sit in. Say
        <code class="kbd kbd-sm">type="submit"</code> when that is what you mean.
      </li>
      <li>
        An explicit <code class="kbd kbd-sm">disabled</code> is honoured on its own — a form that disables
        its submit for an unrelated reason stays disabled.
      </li>
    </ul>
  </section>
</main>
